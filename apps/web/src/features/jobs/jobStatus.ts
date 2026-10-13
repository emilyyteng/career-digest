import type { JobCard } from "../../api";

/** Past todo, Applied ✓ would only hit the server's "already marked applied" error. */
export function jobAlreadyApplied(job: Pick<JobCard, "applicationStatus">): boolean {
  return job.applicationStatus != null && job.applicationStatus !== "todo";
}
