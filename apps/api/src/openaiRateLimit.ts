import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APIError, RateLimitError } from "openai";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STATE_PATH = path.join(root, "data/openai-rate.json");

/** Seed from gpt-4o-mini Tier 1. Headers and 429s update these at runtime. */
const DEFAULT_RPM = 500;
const DEFAULT_RPD = 10_000;
const DEFAULT_TPM = 200_000;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const STOP_RPD_WAIT_MS = 15_000;

type Persisted = {
  rpmLimit: number;
  rpdLimit: number;
  tpmLimit: number;
  dayAt: number[];
  rpdBlockedUntil: number;
};

export class DailyCapError extends Error {
  readonly retryAt: Date;
  readonly rpdLimit: number;

  constructor(retryAt: Date, rpdLimit: number) {
    super(
      `OpenAI daily request cap reached (${rpdLimit} RPD). Remaining jobs stay unranked. Retry after ${retryAt.toLocaleString()}.`,
    );
    this.name = "DailyCapError";
    this.retryAt = retryAt;
    this.rpdLimit = rpdLimit;
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function parseOpenAiDuration(raw: string): number | null {
  const matches = [...raw.trim().toLowerCase().matchAll(/(\d+(?:\.\d+)?)(ms|s|m)\b/g)];
  if (matches.length === 0) return null;
  let total = 0;
  for (const match of matches) {
    const n = Number(match[1]);
    const unit = match[2];
    if (unit === "ms") total += n;
    else if (unit === "s") total += n * 1000;
    else total += n * 60_000;
  }
  return total;
}

function envInt(name: string): number | undefined {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
}

function headerInt(headers: Headers, name: string): number | undefined {
  const n = Number(headers.get(name));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isQuotaError(err: unknown): boolean {
  if (!(err instanceof APIError)) return false;
  const code = (err.code ?? "").toLowerCase();
  const message = err.message.toLowerCase();
  return (
    code === "insufficient_quota" ||
    message.includes("insufficient_quota") ||
    message.includes("exceeded your current quota") ||
    (message.includes("credit") && message.includes("billing"))
  );
}

export class OpenAiRateGate {
  rpmLimit: number;
  rpdLimit: number;
  tpmLimit: number;
  private dayAt: number[] = [];
  private minuteAt: number[] = [];
  private minuteTokens: { at: number; tokens: number }[] = [];
  private rpdBlockedUntil = 0;
  private cooldownUntil = 0;
  private haltError: DailyCapError | null = null;
  private lastReservation: { at: number; tokens: number } | null = null;
  private tail = Promise.resolve();

  constructor(limits: { rpm: number; rpd: number; tpm: number; dayAt: number[]; rpdBlockedUntil: number }) {
    this.rpmLimit = limits.rpm;
    this.rpdLimit = limits.rpd;
    this.tpmLimit = limits.tpm;
    this.dayAt = limits.dayAt;
    this.rpdBlockedUntil = limits.rpdBlockedUntil;
  }

  static async load(): Promise<OpenAiRateGate> {
    const persisted = await readPersisted();
    const rpm = envInt("OPENAI_RPM") ?? persisted?.rpmLimit ?? DEFAULT_RPM;
    const rpd = envInt("OPENAI_RPD") ?? persisted?.rpdLimit ?? DEFAULT_RPD;
    const tpm = envInt("OPENAI_TPM") ?? persisted?.tpmLimit ?? DEFAULT_TPM;
    const gate = new OpenAiRateGate({
      rpm,
      rpd,
      tpm,
      dayAt: persisted?.dayAt ?? [],
      rpdBlockedUntil: persisted?.rpdBlockedUntil ?? 0,
    });
    gate.prune();
    console.log(`OpenAI gate rpm=${gate.rpmLimit} rpd=${gate.rpdLimit} tpm=${gate.tpmLimit}.`);
    return gate;
  }

  describe(): string {
    return `rpm=${this.rpmLimit} rpd=${this.rpdLimit} tpm=${this.tpmLimit}`;
  }

  async acquire(estimatedTokens: number): Promise<void> {
    await this.run(async () => {
      while (true) {
        this.assertNotHalted();
        this.prune();
        const rpdWait = this.rpdBlockedUntil - Date.now();
        if (rpdWait > STOP_RPD_WAIT_MS || this.dayAt.length >= this.rpdLimit) {
          const retryAt = new Date(
            Math.max(
              this.rpdBlockedUntil,
              (this.dayAt[0] ?? Date.now()) + DAY_MS,
            ),
          );
          this.halt(new DailyCapError(retryAt, this.rpdLimit));
        }
        const waitMs = this.computeWait(estimatedTokens);
        if (waitMs > 0) {
          const seconds = Math.ceil(waitMs / 1000);
          console.log(
            `rate wait ${seconds}s (rpm ${this.minuteAt.length}/${this.rpmLimit}, rpd ${this.dayAt.length}/${this.rpdLimit})`,
          );
          await this.sleep(waitMs);
          continue;
        }
        this.reserve(estimatedTokens);
        await this.save();
        return;
      }
    });
  }

  async observeSuccess(headers: Headers, usage?: { prompt_tokens?: number; completion_tokens?: number }): Promise<void> {
    await this.run(async () => {
      this.applyHeaders(headers);
      const actual =
        (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
      if (this.lastReservation && actual > 0) {
        const entry = this.minuteTokens.find((row) => row.at === this.lastReservation?.at);
        if (entry) entry.tokens = actual;
      }
      await this.save();
    });
  }

  async observeError(err: unknown): Promise<"retry" | "stop" | "throw"> {
    return this.run(async () => {
      if (isQuotaError(err)) return "throw";
      if (!(err instanceof RateLimitError)) return "throw";

      const parsed = parseRateLimitError(err);
      if (parsed.rpmLimit) this.rpmLimit = parsed.rpmLimit;
      if (parsed.rpdLimit) this.rpdLimit = parsed.rpdLimit;
      if (parsed.tpmLimit) this.tpmLimit = parsed.tpmLimit;
      this.applyHeaders(err.headers);

      if (parsed.kind === "rpd") {
        this.rpdBlockedUntil = Date.now() + Math.max(parsed.waitMs, STOP_RPD_WAIT_MS);
        await this.save();
        this.halt(new DailyCapError(new Date(this.rpdBlockedUntil), this.rpdLimit));
      }

      this.cooldownUntil = Date.now() + parsed.waitMs;
      await this.save();
      return "retry";
    });
  }

  private halt(error: DailyCapError): never {
    this.haltError = error;
    throw error;
  }

  private assertNotHalted(): void {
    if (this.haltError) throw this.haltError;
  }

  private reserve(tokens: number): void {
    const at = Date.now();
    this.minuteAt.push(at);
    this.dayAt.push(at);
    this.minuteTokens.push({ at, tokens });
    this.lastReservation = { at, tokens };
  }

  private computeWait(estimatedTokens: number): number {
    const now = Date.now();
    const waits = [Math.max(0, this.cooldownUntil - now)];

    if (this.minuteAt.length >= this.rpmLimit) {
      waits.push(this.minuteAt[0] + MINUTE_MS - now);
    }
    const tokenSum = this.minuteTokens.reduce((sum, row) => sum + row.tokens, 0);
    if (tokenSum + estimatedTokens > this.tpmLimit && this.minuteTokens[0]) {
      waits.push(this.minuteTokens[0].at + MINUTE_MS - now);
    }
    return Math.max(0, ...waits);
  }

  private prune(): void {
    const now = Date.now();
    this.minuteAt = this.minuteAt.filter((at) => now - at < MINUTE_MS);
    this.minuteTokens = this.minuteTokens.filter((row) => now - row.at < MINUTE_MS);
    this.dayAt = this.dayAt.filter((at) => now - at < DAY_MS);
    if (this.rpdBlockedUntil && now >= this.rpdBlockedUntil) this.rpdBlockedUntil = 0;
  }

  private applyHeaders(headers: Headers): void {
    const rpm = headerInt(headers, "x-ratelimit-limit-requests");
    const tpm = headerInt(headers, "x-ratelimit-limit-tokens");
    if (rpm && rpm > 0) this.rpmLimit = rpm;
    if (tpm && tpm > 0) this.tpmLimit = tpm;

    const remainingRequests = headerInt(headers, "x-ratelimit-remaining-requests");
    const resetRequests = parseOpenAiDuration(headers.get("x-ratelimit-reset-requests") ?? "");
    if (remainingRequests === 0 && resetRequests) {
      this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + resetRequests);
    }

    const remainingTokens = headerInt(headers, "x-ratelimit-remaining-tokens");
    const resetTokens = parseOpenAiDuration(headers.get("x-ratelimit-reset-tokens") ?? "");
    if (remainingTokens === 0 && resetTokens) {
      this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + resetTokens);
    }
  }

  private async sleep(ms: number): Promise<void> {
    const jitter = ms * (0.05 + Math.random() * 0.1);
    const end = Date.now() + ms + jitter;
    while (Date.now() < end) {
      this.assertNotHalted();
      await wait(Math.min(500, end - Date.now()));
    }
  }

  private async save(): Promise<void> {
    const payload: Persisted = {
      rpmLimit: this.rpmLimit,
      rpdLimit: this.rpdLimit,
      tpmLimit: this.tpmLimit,
      dayAt: this.dayAt,
      rpdBlockedUntil: this.rpdBlockedUntil,
    };
    await mkdir(path.dirname(STATE_PATH), { recursive: true });
    await writeFile(STATE_PATH, `${JSON.stringify(payload)}\n`);
  }

  private run<T>(fn: () => Promise<T>): Promise<T> {
    const task = this.tail.then(fn, fn);
    this.tail = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }
}

function parseRateLimitError(err: RateLimitError): {
  kind: "rpm" | "rpd" | "tpm" | "other";
  waitMs: number;
  rpmLimit?: number;
  rpdLimit?: number;
  tpmLimit?: number;
} {
  const message = err.message;
  const retryHeader = err.headers.get("retry-after");
  const retryAfterSec = retryHeader ? Number(retryHeader) : NaN;
  const fromMessage = message.match(/try again in ([0-9.ms]+)/i);
  const waitMs = Number.isFinite(retryAfterSec)
    ? retryAfterSec * 1000
    : parseOpenAiDuration(fromMessage?.[1] ?? "") ?? 6_000;

  const rpm = message.match(/requests per min \(RPM\): Limit (\d+)/i);
  const rpd = message.match(/requests per day \(RPD\): Limit (\d+)/i);
  const tpm = message.match(/tokens per min \(TPM\): Limit (\d+)/i);

  let kind: "rpm" | "rpd" | "tpm" | "other" = "other";
  if (rpd) kind = "rpd";
  else if (tpm && message.includes("tokens per min")) kind = "tpm";
  else if (rpm) kind = "rpm";

  return {
    kind,
    waitMs: Math.max(250, waitMs),
    rpmLimit: rpm ? Number(rpm[1]) : undefined,
    rpdLimit: rpd ? Number(rpd[1]) : undefined,
    tpmLimit: tpm ? Number(tpm[1]) : undefined,
  };
}

async function readPersisted(): Promise<Persisted | null> {
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as Partial<Persisted>;
    if (!raw || typeof raw !== "object") return null;
    return {
      rpmLimit: Number(raw.rpmLimit) || DEFAULT_RPM,
      rpdLimit: Number(raw.rpdLimit) || DEFAULT_RPD,
      tpmLimit: Number(raw.tpmLimit) || DEFAULT_TPM,
      dayAt: Array.isArray(raw.dayAt)
        ? raw.dayAt.filter((n): n is number => Number.isFinite(n))
        : [],
      rpdBlockedUntil: Number(raw.rpdBlockedUntil) || 0,
    };
  } catch {
    return null;
  }
}
