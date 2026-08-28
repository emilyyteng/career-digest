import type { CompanyConfig, NormalizedPosting } from "../types.js";
import { fetchAshbyJobs } from "./ashby.js";
import { fetchGreenhouseJobContent, fetchGreenhouseJobs } from "./greenhouse.js";
import { fetchLeverJobs } from "./lever.js";
import { fetchOracleJobDetails, fetchOracleJobs } from "./oracle.js";

export async function fetchBoardJobs(
  company: CompanyConfig,
): Promise<NormalizedPosting[]> {
  switch (company.source) {
    case "greenhouse":
      return fetchGreenhouseJobs(company.boardToken);
    case "lever":
      return fetchLeverJobs(company.boardToken);
    case "ashby":
      return fetchAshbyJobs(company.boardToken);
    case "oracle":
      return fetchOracleJobs(company.boardToken);
    case "simplify":
      return [];
  }
}

export async function fetchMissingDescription(
  company: CompanyConfig,
  posting: NormalizedPosting,
): Promise<string | null> {
  if (posting.descriptionHtml) return posting.descriptionHtml;
  if (company.source === "greenhouse") {
    return fetchGreenhouseJobContent(company.boardToken, posting.externalId);
  }
  if (company.source === "oracle") {
    return fetchOracleJobDetails(company.boardToken, posting.externalId);
  }
  return posting.descriptionHtml;
}
