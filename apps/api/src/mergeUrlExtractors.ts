import { extractOracleJobIdFromUrl } from "./adapters/oracle.js";
import {
  extractGreenhouseJobIdFromBoardsUrl,
} from "./greenhouseUrls.js";

/** Greenhouse job id embedded in Simplify misc URLs or embed links. */
export function extractGreenhouseJobId(url: string): string | null {
  const ghJid = url.match(/(?:^|[?&])gh_jid=(\d+)/i);
  if (ghJid?.[1]) return ghJid[1];
  const boardsJob = extractGreenhouseJobIdFromBoardsUrl(url);
  if (boardsJob) return boardsJob;
  if (/boards\.greenhouse\.io\/embed\/job_app/i.test(url)) {
    const token = url.match(/[?&]token=(\d+)/i);
    if (token?.[1]) return token[1];
  }
  return null;
}

/** Lever posting uuid from a jobs.lever.co apply URL. */
export function extractLeverPostingId(url: string): string | null {
  const direct = url.match(/jobs\.lever\.co\/[^/?#]+\/([^/?#]+)/i);
  if (direct?.[1]) return direct[1];
  const uuid = url.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
  );
  return uuid?.[1] ?? null;
}

/** Ashby posting id from a jobs.ashbyhq.com URL. */
export function extractAshbyPostingId(url: string): string | null {
  const direct = url.match(/jobs\.ashbyhq\.com\/[^/?#]+\/([^/?#]+)/i);
  if (direct?.[1]) return decodeURIComponent(direct[1]);
  const uuid = url.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
  );
  return uuid?.[1] ?? null;
}

/** Oracle requisition id from Candidate Experience job URLs. */
export function extractOracleJobId(url: string): string | null {
  return extractOracleJobIdFromUrl(url);
}

/** SmartRecruiters posting id from jobs.smartrecruiters.com URLs. */
export function extractSmartrecruitersPostingId(url: string): string | null {
  const direct = url.match(/smartrecruiters\.com\/[^/?#]+\/(\d+)/i);
  return direct?.[1] ?? null;
}
