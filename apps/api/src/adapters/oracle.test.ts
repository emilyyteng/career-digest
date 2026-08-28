import {
  buildOracleDetailsFinder,
  buildOracleJobUrl,
  buildOracleListFinder,
  extractOracleJobIdFromUrl,
  parseOracleBoardToken,
} from "./oracle.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// parseOracleBoardToken
const parsed = parseOracleBoardToken("elxb.fa.us2.oraclecloud.com|CX");
assertEqual(parsed.apiHost, "elxb.fa.us2.oraclecloud.com", "apiHost");
assertEqual(parsed.siteNumber, "CX", "siteNumber");

try {
  parseOracleBoardToken("invalid");
  throw new Error("parseOracleBoardToken should reject invalid token");
} catch (err) {
  assert(err instanceof Error && err.message.includes("Invalid oracle"), "invalid token error");
}

// Finder strings — semicolons/commas must stay literal (not URL-encoded by builder)
assertEqual(
  buildOracleListFinder("CX_1", 0),
  "findReqs;siteNumber=CX_1,limit=200,sortBy=POSTING_DATES_DESC",
  "list finder offset 0",
);
assertEqual(
  buildOracleListFinder("CX", 200),
  "findReqs;siteNumber=CX,limit=200,offset=200,sortBy=POSTING_DATES_DESC",
  "list finder offset 200",
);
assertEqual(
  buildOracleDetailsFinder("CX_1", "32629"),
  "ById;Id=\"32629\",siteNumber=CX_1",
  "details finder",
);

// URL helpers
assertEqual(
  buildOracleJobUrl("elxb.fa.us2.oraclecloud.com", "CX", "1910"),
  "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
  "job url",
);
assertEqual(
  extractOracleJobIdFromUrl(
    "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
  ),
  "1910",
  "extract job id",
);

console.log("oracle.test.ts: all assertions passed");
