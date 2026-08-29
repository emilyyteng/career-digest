import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isOracleCloudAtsUrl,
  parseOracleBoardFromUrl,
  probeOracleBoardJobCount,
} from "./adapters/oracle.js";
import {
  isSmartrecruitersAtsUrl,
  parseSmartrecruitersBoardFromUrl,
  probeSmartrecruitersBoardJobCount,
} from "./adapters/smartrecruiters.js";
import { companies as configuredCompanies } from "./config/companies.js";
import { SIMPLIFY_LISTINGS_URL } from "./adapters/simplify.js";
import type { CompanyConfig, Source } from "./types.js";

type SimplifyListing = {
  company_name?: string;
  url?: string;
  active?: boolean;
};

type DiscoveredBoard = {
  name: string;
  source: Source;
  boardToken: string;
  method: "direct_url" | "greenhouse_embed_probe" | "name_match_probe";
  sampleUrl?: string;
  listingCount: number;
  totalJobsCount?: number;
};

type DeferredLargeBoard = DiscoveredBoard & {
  totalJobsCount: number;
};

const ATS_SOURCES: Source[] = [
  "greenhouse",
  "lever",
  "ashby",
  "oracle",
  "smartrecruiters",
];
const DEFAULT_ORACLE_DISCOVER_MAX_JOBS = 250;
const DEFAULT_SMARTRECRUITERS_DISCOVER_MAX_JOBS = 250;
const INVALID_TOKENS = new Set(["embed", "jobs", "job-board", "job_app"]);

const DIRECT_PATTERNS: Array<{ source: Source; re: RegExp }> = [
  { source: "greenhouse", re: /boards\.greenhouse\.io\/([^/?#]+)/i },
  { source: "lever", re: /jobs\.lever\.co\/([^/?#]+)/i },
  { source: "ashby", re: /jobs\.ashbyhq\.com\/([^/?#]+)/i },
];

const EMBED_PATTERNS: Array<{ source: Source; re: RegExp }> = [
  { source: "greenhouse", re: /(?:^|[?&])gh_jid=(\d+)/i },
  // Forward-compatible if Simplify starts linking custom-domain Ashby/Lever embeds.
  { source: "lever", re: /jobs\.lever\.co\/([^/?#]+)/i },
  { source: "ashby", re: /jobs\.ashbyhq\.com\/([^/?#]+)/i },
];

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function domainStem(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}

function decodeToken(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

function parseGreenhouseEmbedJobId(url: string): string | null {
  const ghJid = url.match(/(?:^|[?&])gh_jid=(\d+)/i);
  if (ghJid?.[1]) return ghJid[1];
  if (/boards\.greenhouse\.io\/embed\/job_app/i.test(url)) {
    const embedToken = url.match(/[?&]token=(\d+)/i);
    if (embedToken?.[1]) return embedToken[1];
  }
  return null;
}

function isGreenhouseEmbedUrl(url: string): boolean {
  return parseGreenhouseEmbedJobId(url) !== null;
}

function isDirectAtsUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes("boards.greenhouse.io/embed/")) return false;
  return (
    lower.includes("greenhouse.io") ||
    lower.includes("lever.co") ||
    lower.includes("ashbyhq.com")
  );
}

function parseDirectBoard(url: string): { source: Source; boardToken: string } | null {
  for (const { source, re } of DIRECT_PATTERNS) {
    const match = url.match(re);
    if (!match?.[1]) continue;
    const boardToken = decodeToken(match[1]);
    if (!boardToken || INVALID_TOKENS.has(boardToken.toLowerCase())) continue;
    return { source, boardToken };
  }
  return null;
}

function key(source: Source, boardToken: string): string {
  return `${source}:${boardToken.toLowerCase()}`;
}

function existingKeys(companies: CompanyConfig[]): Set<string> {
  return new Set(companies.map((c) => key(c.source, c.boardToken)));
}

function oracleDiscoverMaxJobs(): number {
  const n = Number(process.env.ORACLE_DISCOVER_MAX_JOBS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_ORACLE_DISCOVER_MAX_JOBS;
}

function smartrecruitersDiscoverMaxJobs(): number {
  const n = Number(process.env.SMARTRECRUITERS_DISCOVER_MAX_JOBS);
  return Number.isFinite(n) && n > 0
    ? Math.floor(n)
    : DEFAULT_SMARTRECRUITERS_DISCOVER_MAX_JOBS;
}

async function fetchSimplifyListings(): Promise<SimplifyListing[]> {
  const response = await fetch(SIMPLIFY_LISTINGS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Simplify listings failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as SimplifyListing[];
}

async function probeGreenhouseBoard(
  boardToken: string,
  jobId: string,
): Promise<boolean> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(jobId)}`;
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return false;
    const body = (await response.json()) as { id?: number };
    return typeof body.id === "number";
  } catch {
    return false;
  }
}

function tokensForCompanyName(name: string, companies: CompanyConfig[]): string[] {
  const target = name.trim().toLowerCase();
  if (!target) return [];
  return companies
    .filter((c) => c.source === "greenhouse" && c.name.trim().toLowerCase() === target)
    .map((c) => c.boardToken);
}

function greenhouseProbeCandidates(
  companyName: string,
  sampleUrl: string,
  configured: CompanyConfig[],
): string[] {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const push = (token: string) => {
    const normalized = token.trim();
    if (!normalized || INVALID_TOKENS.has(normalized.toLowerCase()) || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    candidates.push(normalized);
  };

  push(slug(companyName));
  const stem = domainStem(sampleUrl);
  if (stem) {
    push(stem);
    if (!stem.startsWith("fly")) push(`fly${stem}`);
  }
  for (const token of tokensForCompanyName(companyName, configured)) {
    push(token);
  }

  return candidates;
}

async function discoverBoards(configured: CompanyConfig[]): Promise<{
  newBoards: DiscoveredBoard[];
  unresolvedEmbed: Array<{ company: string; sampleUrl: string; ghJid: string; listings: number }>;
  skippedInvalid: Array<{ source: Source; boardToken: string; company: string; sampleUrl: string }>;
  deferredLargeOracle: DeferredLargeBoard[];
  skippedOracleProbe: Array<{ boardToken: string; company: string; sampleUrl: string }>;
  deferredLargeSmartrecruiters: DeferredLargeBoard[];
  skippedSmartrecruitersProbe: Array<{ boardToken: string; company: string; sampleUrl: string }>;
}> {
  const listings = await fetchSimplifyListings();
  const active = listings.filter((row) => row.active && row.url?.trim());
  const known = existingKeys(configured);

  const directCounts = new Map<string, { board: DiscoveredBoard; sampleUrl: string }>();
  const oracleCounts = new Map<string, { board: DiscoveredBoard; sampleUrl: string }>();
  const smartrecruitersCounts = new Map<string, { board: DiscoveredBoard; sampleUrl: string }>();
  const embedByCompany = new Map<
    string,
    { company: string; sampleUrl: string; ghJid: string; count: number }
  >();
  const skippedInvalid: Array<{
    source: Source;
    boardToken: string;
    company: string;
    sampleUrl: string;
  }> = [];

  for (const listing of active) {
    const url = listing.url!.trim();
    const company = listing.company_name?.trim() || "Unknown";

    if (isDirectAtsUrl(url)) {
      const parsed = parseDirectBoard(url);
      if (!parsed) {
        const invalid = url.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
        if (invalid?.[1] && !isGreenhouseEmbedUrl(url)) {
          skippedInvalid.push({
            source: "greenhouse",
            boardToken: invalid[1],
            company,
            sampleUrl: url,
          });
        }
        continue;
      }
      const id = key(parsed.source, parsed.boardToken);
      if (known.has(id)) continue;
      const existing = directCounts.get(id);
      if (existing) {
        existing.board.listingCount += 1;
      } else {
        directCounts.set(id, {
          board: {
            name: company,
            source: parsed.source,
            boardToken: parsed.boardToken,
            method: "direct_url",
            listingCount: 1,
          },
          sampleUrl: url,
        });
      }
      continue;
    }

    if (isOracleCloudAtsUrl(url)) {
      const parsed = parseOracleBoardFromUrl(url);
      if (!parsed) continue;
      const id = key("oracle", parsed.boardToken);
      if (known.has(id)) continue;
      const existing = oracleCounts.get(id);
      if (existing) {
        existing.board.listingCount += 1;
      } else {
        oracleCounts.set(id, {
          board: {
            name: company,
            source: "oracle",
            boardToken: parsed.boardToken,
            method: "direct_url",
            listingCount: 1,
          },
          sampleUrl: url,
        });
      }
      continue;
    }

    if (isSmartrecruitersAtsUrl(url)) {
      const boardToken = parseSmartrecruitersBoardFromUrl(url);
      if (!boardToken) continue;
      const id = key("smartrecruiters", boardToken);
      if (known.has(id)) continue;
      const existing = smartrecruitersCounts.get(id);
      if (existing) {
        existing.board.listingCount += 1;
      } else {
        smartrecruitersCounts.set(id, {
          board: {
            name: company,
            source: "smartrecruiters",
            boardToken,
            method: "direct_url",
            listingCount: 1,
          },
          sampleUrl: url,
        });
      }
      continue;
    }

    const embedJobId = parseGreenhouseEmbedJobId(url);
    if (embedJobId) {
      const embedKey = company.toLowerCase();
      const existing = embedByCompany.get(embedKey);
      if (existing) {
        existing.count += 1;
      } else {
        embedByCompany.set(embedKey, {
          company,
          sampleUrl: url,
          ghJid: embedJobId,
          count: 1,
        });
      }
    }
  }

  const newBoards: DiscoveredBoard[] = [];
  for (const { board, sampleUrl } of directCounts.values()) {
    board.sampleUrl = sampleUrl;
    newBoards.push(board);
  }

  const deferredLargeOracle: DeferredLargeBoard[] = [];
  const skippedOracleProbe: Array<{
    boardToken: string;
    company: string;
    sampleUrl: string;
  }> = [];
  const oracleMaxJobs = oracleDiscoverMaxJobs();

  for (const { board, sampleUrl } of oracleCounts.values()) {
    board.sampleUrl = sampleUrl;
    const totalJobsCount = await probeOracleBoardJobCount(board.boardToken);
    if (totalJobsCount == null) {
      skippedOracleProbe.push({
        boardToken: board.boardToken,
        company: board.name,
        sampleUrl,
      });
      continue;
    }
    board.totalJobsCount = totalJobsCount;
    if (totalJobsCount > oracleMaxJobs) {
      deferredLargeOracle.push({ ...board, totalJobsCount });
      continue;
    }
    newBoards.push(board);
  }

  const deferredLargeSmartrecruiters: DeferredLargeBoard[] = [];
  const skippedSmartrecruitersProbe: Array<{
    boardToken: string;
    company: string;
    sampleUrl: string;
  }> = [];
  const smartrecruitersMaxJobs = smartrecruitersDiscoverMaxJobs();

  for (const { board, sampleUrl } of smartrecruitersCounts.values()) {
    board.sampleUrl = sampleUrl;
    const totalJobsCount = await probeSmartrecruitersBoardJobCount(board.boardToken);
    if (totalJobsCount == null) {
      skippedSmartrecruitersProbe.push({
        boardToken: board.boardToken,
        company: board.name,
        sampleUrl,
      });
      continue;
    }
    board.totalJobsCount = totalJobsCount;
    if (totalJobsCount > smartrecruitersMaxJobs) {
      deferredLargeSmartrecruiters.push({ ...board, totalJobsCount });
      continue;
    }
    newBoards.push(board);
  }

  const unresolvedEmbed: Array<{
    company: string;
    sampleUrl: string;
    ghJid: string;
    listings: number;
  }> = [];

  for (const embed of embedByCompany.values()) {
    const candidates = greenhouseProbeCandidates(embed.company, embed.sampleUrl, configured);
    let resolvedToken: string | null = null;
    let method: DiscoveredBoard["method"] = "greenhouse_embed_probe";

    for (const token of candidates) {
      if (await probeGreenhouseBoard(token, embed.ghJid)) {
        resolvedToken = token;
        break;
      }
    }

    if (!resolvedToken) {
      unresolvedEmbed.push({
        company: embed.company,
        sampleUrl: embed.sampleUrl,
        ghJid: embed.ghJid,
        listings: embed.count,
      });
      continue;
    }

    if (tokensForCompanyName(embed.company, configured).includes(resolvedToken)) {
      method = "name_match_probe";
    }

    const id = key("greenhouse", resolvedToken);
    if (known.has(id)) continue;
    const duplicate = newBoards.find(
      (b) => b.source === "greenhouse" && b.boardToken === resolvedToken,
    );
    if (duplicate) {
      duplicate.listingCount += embed.count;
      continue;
    }

    newBoards.push({
      name: embed.company,
      source: "greenhouse",
      boardToken: resolvedToken,
      method,
      sampleUrl: embed.sampleUrl,
      listingCount: embed.count,
    });
  }

  return {
    newBoards: newBoards.sort((a, b) => a.name.localeCompare(b.name)),
    unresolvedEmbed: unresolvedEmbed.sort((a, b) => a.company.localeCompare(b.company)),
    skippedInvalid,
    deferredLargeOracle: deferredLargeOracle.sort((a, b) => a.name.localeCompare(b.name)),
    skippedOracleProbe,
    deferredLargeSmartrecruiters: deferredLargeSmartrecruiters.sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    skippedSmartrecruitersProbe,
  };
}

function formatEntry(board: DiscoveredBoard): string {
  const name = board.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const token = board.boardToken.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `  { name: "${name}", source: "${board.source}", boardToken: "${token}" },`;
}

function writeCompaniesFile(companiesPath: string, toAdd: DiscoveredBoard[]): void {
  const content = readFileSync(companiesPath, "utf8");
  const parsed = parseCompaniesFile(content);
  const seen = existingKeys(parsed);
  const linesToAdd: string[] = [];

  for (const board of toAdd) {
    const id = key(board.source, board.boardToken);
    if (seen.has(id)) continue;
    seen.add(id);
    linesToAdd.push(formatEntry(board));
  }

  if (linesToAdd.length === 0) return;

  const insertion = `\n${linesToAdd.join("\n")}`;
  const updated = content.replace(/\n];\s*$/, `${insertion}\n];\n`);
  if (updated === content) {
    throw new Error(`Could not find companies array closing in ${companiesPath}`);
  }
  writeFileSync(companiesPath, updated, "utf8");
}

function parseCompaniesFile(content: string): CompanyConfig[] {
  const re =
    /\{\s*name:\s*"((?:\\.|[^"\\])*)",\s*source:\s*"(greenhouse|lever|ashby|oracle|smartrecruiters)",\s*boardToken:\s*"((?:\\.|[^"\\])*)"\s*\}/g;
  const out: CompanyConfig[] = [];
  for (const match of content.matchAll(re)) {
    out.push({
      name: match[1].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
      source: match[2] as Source,
      boardToken: match[3].replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    });
  }
  return out;
}

function printReport(
  configured: CompanyConfig[],
  result: Awaited<ReturnType<typeof discoverBoards>>,
): void {
  const {
    newBoards,
    unresolvedEmbed,
    skippedInvalid,
    deferredLargeOracle,
    skippedOracleProbe,
    deferredLargeSmartrecruiters,
    skippedSmartrecruitersProbe,
  } = result;
  const activeConfigured = configured.filter((c) => ATS_SOURCES.includes(c.source));
  const oracleMaxJobs = oracleDiscoverMaxJobs();
  const smartrecruitersMaxJobs = smartrecruitersDiscoverMaxJobs();

  console.log("Simplify board discovery");
  console.log(`Configured ATS boards: ${activeConfigured.length}`);
  console.log(`New boards to add: ${newBoards.length}`);
  console.log(
    `Deferred large Oracle boards (>${oracleMaxJobs} jobs, keep Simplify hybrid): ${deferredLargeOracle.length}`,
  );
  console.log(
    `Deferred large SmartRecruiters boards (>${smartrecruitersMaxJobs} jobs, keep Simplify hybrid): ${deferredLargeSmartrecruiters.length}`,
  );
  console.log(`Unresolved Greenhouse embeds (gh_jid): ${unresolvedEmbed.length}`);
  console.log(`Skipped invalid direct tokens: ${skippedInvalid.length}`);
  console.log(`Oracle boards with failed size probe: ${skippedOracleProbe.length}`);
  console.log(
    `SmartRecruiters boards with failed size probe: ${skippedSmartrecruitersProbe.length}`,
  );
  console.log("");

  if (newBoards.length > 0) {
    console.log("== New boards ==");
    for (const board of newBoards) {
      const jobs =
        board.totalJobsCount != null ? ` boardJobs=${board.totalJobsCount}` : "";
      console.log(
        `  ${board.source}/${board.boardToken}  (${board.name})  simplifyListings=${board.listingCount}${jobs}  via=${board.method}`,
      );
      if (board.sampleUrl) console.log(`    sample: ${board.sampleUrl}`);
    }
    console.log("");
    console.log("Suggested companies.ts lines:");
    for (const board of newBoards) {
      console.log(formatEntry(board));
    }
    console.log("");
  }

  if (deferredLargeOracle.length > 0) {
    console.log(
      `== Deferred Oracle boards (>${oracleMaxJobs} total jobs — use Simplify misc, not full ingest) ==`,
    );
    for (const board of deferredLargeOracle) {
      console.log(
        `  oracle/${board.boardToken}  (${board.name})  simplifyListings=${board.listingCount}  boardJobs=${board.totalJobsCount}`,
      );
      if (board.sampleUrl) console.log(`    sample: ${board.sampleUrl}`);
    }
    console.log("");
  }

  if (skippedOracleProbe.length > 0) {
    console.log("== Oracle boards with failed size probe (not added) ==");
    for (const row of skippedOracleProbe) {
      console.log(`  ${row.company}  ${row.boardToken}  ${row.sampleUrl}`);
    }
    console.log("");
  }

  if (deferredLargeSmartrecruiters.length > 0) {
    console.log(
      `== Deferred SmartRecruiters boards (>${smartrecruitersMaxJobs} total jobs — use Simplify misc, not full ingest) ==`,
    );
    for (const board of deferredLargeSmartrecruiters) {
      console.log(
        `  smartrecruiters/${board.boardToken}  (${board.name})  simplifyListings=${board.listingCount}  boardJobs=${board.totalJobsCount}`,
      );
      if (board.sampleUrl) console.log(`    sample: ${board.sampleUrl}`);
    }
    console.log("");
  }

  if (skippedSmartrecruitersProbe.length > 0) {
    console.log("== SmartRecruiters boards with failed size probe (not added) ==");
    for (const row of skippedSmartrecruitersProbe) {
      console.log(`  ${row.company}  ${row.boardToken}  ${row.sampleUrl}`);
    }
    console.log("");
  }

  if (unresolvedEmbed.length > 0) {
    console.log("== Unresolved Greenhouse embeds (manual board token) ==");
    console.log(
      "  Add manually to companies.ts, then re-run ingest. Probe with:",
    );
    console.log(
      "  curl https://boards-api.greenhouse.io/v1/boards/TOKEN/jobs/GH_JID",
    );
    for (const row of unresolvedEmbed) {
      console.log(
        `  ${row.company}  listings=${row.listings}  gh_jid=${row.ghJid}  ${row.sampleUrl}`,
      );
    }
    console.log("");
  }

  if (skippedInvalid.length > 0) {
    console.log("== Invalid direct ATS tokens (ignored) ==");
    for (const row of skippedInvalid) {
      console.log(`  ${row.company}: ${row.source}/${row.boardToken}  ${row.sampleUrl}`);
    }
    console.log("");
  }

  console.log("Notes:");
  console.log(
    "  • Direct greenhouse.io / lever.co / ashbyhq.com / oraclecloud.com URLs are primary discovery paths.",
  );
  console.log(
    "  • Oracle boardToken format: {apiHost}|{siteNumber}. Boards over ORACLE_DISCOVER_MAX_JOBS",
  );
  console.log(
    `    (default ${DEFAULT_ORACLE_DISCOVER_MAX_JOBS}) are deferred; active Simplify listings still ingest as simplify until the board is configured.`,
  );
  console.log(
    "  • SmartRecruiters boardToken is the company slug from jobs.smartrecruiters.com/{token}/…. Boards over SMARTRECRUITERS_DISCOVER_MAX_JOBS",
  );
  console.log(
    `    (default ${DEFAULT_SMARTRECRUITERS_DISCOVER_MAX_JOBS}) are deferred; active Simplify listings still ingest as simplify until the board is configured.`,
  );
  console.log(
    "  • Configured large SmartRecruiters boards ingest with q=intern; unconfigured boards rely on active Simplify listings.",
  );
  console.log(
    "  • Custom-domain Greenhouse embeds (gh_jid=) are probed via company slug, domain, fly+domain, and same-name boards.",
  );
  console.log(
    "  • Greenhouse embed/job_app?token= is treated like gh_jid= (job id probe).",
  );
  console.log(
    "  • In current Simplify data, Lever/Ashby misc embeds are rare; those ATSs usually appear as direct jobs.* URLs.",
  );
}

async function main(): Promise<void> {
  const write = process.argv.includes("--write");
  const companiesPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "config/companies.ts",
  );

  const result = await discoverBoards(configuredCompanies);
  printReport(configuredCompanies, result);

  if (write && result.newBoards.length > 0) {
    writeCompaniesFile(companiesPath, result.newBoards);
    console.log(`Wrote ${result.newBoards.length} new board(s) to ${companiesPath}`);
  } else if (write) {
    console.log("No new boards to write.");
  }
}

const isMain =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  await main();
}
