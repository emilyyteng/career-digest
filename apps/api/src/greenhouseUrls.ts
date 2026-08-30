/**
 * Greenhouse board hosts include regional subdomains, e.g.
 * boards.greenhouse.io, job-boards.greenhouse.io, job-boards.eu.greenhouse.io.
 */
export const GREENHOUSE_BOARD_HOST_RE =
  /(?:boards|job-boards)(?:\.[a-z0-9-]+)?\.greenhouse\.io/i;

export const GREENHOUSE_BOARD_TOKEN_RE = new RegExp(
  `${GREENHOUSE_BOARD_HOST_RE.source}/([^/?#]+)`,
  "i",
);

export const GREENHOUSE_JOB_ID_FROM_BOARDS_URL_RE = new RegExp(
  `${GREENHOUSE_BOARD_HOST_RE.source}/[^/]+/jobs/(\\d+)`,
  "i",
);

export function extractGreenhouseBoardToken(url: string): string | null {
  const match = url.match(GREENHOUSE_BOARD_TOKEN_RE);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]).trim();
  } catch {
    return match[1].trim();
  }
}

export function extractGreenhouseJobIdFromBoardsUrl(url: string): string | null {
  const match = url.match(GREENHOUSE_JOB_ID_FROM_BOARDS_URL_RE);
  return match?.[1] ?? null;
}
