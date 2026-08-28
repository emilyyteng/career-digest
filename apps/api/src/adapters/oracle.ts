import { randomUUID } from "node:crypto";
import type { NormalizedPosting } from "../types.js";
import { looksLikeInternship } from "../filter.js";

const LIST_PATH = "/hcmRestApi/resources/latest/recruitingCEJobRequisitions";
const DETAILS_PATH = "/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails";
const PAGE_SIZE = 200;
const MAX_PAGES = 50;
const HOST_GAP_MS = 450;
const REQUEST_TIMEOUT_MS = 15_000;
const LIST_EXPAND = "requisitionList.secondaryLocations,flexFieldsFacet.values";

type OracleRequisition = {
  Id?: string;
  Title?: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  ShortDescriptionStr?: string;
};

type OracleListWrapper = {
  TotalJobsCount?: number;
  requisitionList?: OracleRequisition[];
};

type OracleListResponse = {
  items?: OracleListWrapper[];
};

type OracleDetailItem = {
  ExternalDescriptionStr?: string;
  ExternalQualificationsStr?: string;
  ExternalResponsibilitiesStr?: string;
};

type OracleDetailsResponse = {
  items?: OracleDetailItem[];
};

/** Split `{apiHost}|{siteNumber}` board tokens from companies.ts. */
export function parseOracleBoardToken(boardToken: string): {
  apiHost: string;
  siteNumber: string;
} {
  const pipe = boardToken.indexOf("|");
  if (pipe <= 0 || pipe === boardToken.length - 1) {
    throw new Error(`Invalid oracle boardToken (expected host|siteNumber): ${boardToken}`);
  }
  const apiHost = boardToken.slice(0, pipe).trim();
  const siteNumber = boardToken.slice(pipe + 1).trim();
  if (!apiHost || !siteNumber) {
    throw new Error(`Invalid oracle boardToken (expected host|siteNumber): ${boardToken}`);
  }
  return { apiHost, siteNumber };
}

/** Job id from Candidate Experience URLs: .../sites/CX/job/1910 */
export function extractOracleJobIdFromUrl(url: string): string | null {
  const match = url.match(/\/job\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

export function buildOracleListFinder(siteNumber: string, offset: number): string {
  const parts = [`siteNumber=${siteNumber}`, `limit=${PAGE_SIZE}`];
  if (offset > 0) parts.push(`offset=${offset}`);
  parts.push("sortBy=POSTING_DATES_DESC");
  return `findReqs;${parts.join(",")}`;
}

export function buildOracleDetailsFinder(siteNumber: string, jobId: string): string {
  return `ById;Id="${jobId}",siteNumber=${siteNumber}`;
}

export function buildOracleJobUrl(
  apiHost: string,
  siteNumber: string,
  jobId: string,
  locale = "en",
): string {
  return `https://${apiHost}/hcmUI/CandidateExperience/${locale}/sites/${siteNumber}/job/${jobId}`;
}

/** Parse Candidate Experience URLs into apiHost + siteNumber board config. */
export function parseOracleBoardFromUrl(url: string): {
  apiHost: string;
  siteNumber: string;
  boardToken: string;
} | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("oraclecloud.com")) return null;
    const siteMatch = parsed.pathname.match(/\/sites\/([^/?#]+)/i);
    if (!siteMatch?.[1]) return null;
    const siteNumber = decodeURIComponent(siteMatch[1]).trim();
    if (!siteNumber) return null;
    const apiHost = parsed.hostname;
    return {
      apiHost,
      siteNumber,
      boardToken: `${apiHost}|${siteNumber}`,
    };
  } catch {
    return null;
  }
}

export function isOracleCloudAtsUrl(url: string): boolean {
  return Boolean(parseOracleBoardFromUrl(url));
}

function parsePostedDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function oracleHeaders(): Record<string, string> {
  return {
    "Ora-Irc-Cx-UserId": randomUUID(),
    "Ora-Irc-Language": "en",
    Accept: "application/json",
    "Content-Type": "application/vnd.oracle.adf.resourceitem+json;charset=utf-8",
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HostGate {
  private tails = new Map<string, Promise<void>>();

  schedule<T>(host: string, work: () => Promise<T>): Promise<T> {
    const key = host || "_";
    const previous = this.tails.get(key) ?? Promise.resolve();
    const run = previous.then(work, work);
    this.tails.set(
      key,
      run.then(
        () => wait(HOST_GAP_MS),
        () => wait(HOST_GAP_MS),
      ),
    );
    return run;
  }
}

const hostGate = new HostGate();

async function oracleFetch(url: string, apiHost: string): Promise<Response> {
  return hostGate.schedule(apiHost, async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        signal: controller.signal,
        headers: oracleHeaders(),
      });
    } finally {
      clearTimeout(timer);
    }
  });
}

function buildListUrl(apiHost: string, siteNumber: string, offset: number): string {
  const finder = buildOracleListFinder(siteNumber, offset);
  const query = `onlyData=true&expand=${LIST_EXPAND}&finder=${finder}`;
  return `https://${apiHost}${LIST_PATH}?${query}`;
}

function buildDetailsUrl(apiHost: string, siteNumber: string, jobId: string): string {
  const finder = buildOracleDetailsFinder(siteNumber, jobId);
  const query = `expand=all&onlyData=true&finder=${finder}`;
  return `https://${apiHost}${DETAILS_PATH}?${query}`;
}

function mergeDescriptionParts(item: OracleDetailItem): string | null {
  const chunks = [
    item.ExternalDescriptionStr,
    item.ExternalResponsibilitiesStr,
    item.ExternalQualificationsStr,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  if (chunks.length === 0) return null;
  return chunks.join("\n\n");
}

function toNormalized(
  req: OracleRequisition,
  apiHost: string,
  siteNumber: string,
): NormalizedPosting | null {
  if (!req.Id || !req.Title) return null;
  const published = parsePostedDate(req.PostedDate);
  return {
    source: "oracle",
    externalId: String(req.Id),
    title: req.Title,
    location: req.PrimaryLocation?.trim() || null,
    department: null,
    url: buildOracleJobUrl(apiHost, siteNumber, req.Id),
    descriptionHtml: null,
    isInternship: looksLikeInternship(req.Title),
    firstPublishedAt: published,
    sourceUpdatedAt: published,
    raw: req,
  };
}

export async function fetchOracleJobs(boardToken: string): Promise<NormalizedPosting[]> {
  const { apiHost, siteNumber } = parseOracleBoardToken(boardToken);
  const postings: NormalizedPosting[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const offset = page * PAGE_SIZE;
    const url = buildListUrl(apiHost, siteNumber, offset);
    const response = await oracleFetch(url, apiHost);
    if (!response.ok) {
      throw new Error(
        `Oracle ${boardToken} list failed: ${response.status} ${response.statusText}`,
      );
    }

    const body = (await response.json()) as OracleListResponse;
    const wrapper = body.items?.[0];
    const requisitions = wrapper?.requisitionList ?? [];
    if (requisitions.length === 0) break;

    for (const req of requisitions) {
      const row = toNormalized(req, apiHost, siteNumber);
      if (row) postings.push(row);
    }

    const total = wrapper?.TotalJobsCount ?? 0;
    if (offset + requisitions.length >= total) break;
    if (requisitions.length < PAGE_SIZE) break;
  }

  return postings;
}

/** Probe total open jobs on a board (one list request). Used by discover-boards sizing. */
export async function probeOracleBoardJobCount(boardToken: string): Promise<number | null> {
  const { apiHost, siteNumber } = parseOracleBoardToken(boardToken);
  const url = buildListUrl(apiHost, siteNumber, 0);
  const response = await oracleFetch(url, apiHost);
  if (!response.ok) return null;
  const body = (await response.json()) as OracleListResponse;
  const total = body.items?.[0]?.TotalJobsCount;
  return typeof total === "number" && Number.isFinite(total) ? total : null;
}

export async function fetchOracleJobDetails(
  boardToken: string,
  externalId: string,
): Promise<string | null> {
  const { apiHost, siteNumber } = parseOracleBoardToken(boardToken);
  const url = buildDetailsUrl(apiHost, siteNumber, externalId);
  const response = await oracleFetch(url, apiHost);
  if (!response.ok) {
    throw new Error(
      `Oracle ${boardToken} job ${externalId} failed: ${response.status} ${response.statusText}`,
    );
  }
  const body = (await response.json()) as OracleDetailsResponse;
  const item = body.items?.[0];
  if (!item) return null;
  return mergeDescriptionParts(item);
}
