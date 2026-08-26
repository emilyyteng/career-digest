import type { NormalizedPosting } from "../types.js";
import { looksLikeInternship } from "../filter.js";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  location?: { name?: string };
  departments?: { name?: string }[];
};

type GreenhouseListResponse = {
  jobs?: GreenhouseJob[];
};

export async function fetchGreenhouseJobs(
  boardToken: string,
): Promise<NormalizedPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(
      `Greenhouse ${boardToken} failed: ${response.status} ${response.statusText}`,
    );
  }

  const body = (await response.json()) as GreenhouseListResponse;
  const jobs = body.jobs ?? [];

  return jobs.map((job) => {
    const department =
      job.departments
        ?.map((d) => d.name)
        .filter((name): name is string => Boolean(name))
        .join(", ") || null;

    return {
      source: "greenhouse",
      externalId: String(job.id),
      title: job.title,
      location: job.location?.name ?? null,
      department,
      url: job.absolute_url,
      descriptionHtml: job.content ?? null,
      isInternship: looksLikeInternship(job.title),
      raw: job,
    };
  });
}
