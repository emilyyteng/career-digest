import type { JobCard } from "./api";
import PostingDates from "./PostingDates";

const LOCATION_LABEL: Record<string, string> = {
  la: "Los Angeles",
  bay: "Bay Area",
  nyc: "New York",
  other_hub: "US tech hub",
  remote: "Remote",
  weak: "Location is a weaker fit",
  unknown: "Location unclear",
};

export function isUnranked(job: Pick<JobCard, "rankScore" | "rankEligible">): boolean {
  return job.rankScore == null && job.rankEligible == null;
}

export function isMismatch(job: Pick<JobCard, "rankEligible">): boolean {
  return job.rankEligible === false;
}

export function isBlankJobDescription(html: string | null | undefined): boolean {
  return !html?.trim();
}

function hideRankDisplay(
  view?: "ranked" | "mismatches" | "unranked" | "needs-description",
): boolean {
  return view === "needs-description";
}

export function RankBadges({
  job,
  view,
}: {
  job: JobCard;
  view?: "ranked" | "mismatches" | "unranked" | "needs-description";
}) {
  const unranked = isUnranked(job);
  const hideRank = hideRankDisplay(view);
  return (
    <span className="meta-badges">
      <span className="badge">{job.source}</span>
      <PostingDates
        firstPublishedAt={job.firstPublishedAt}
        sourceUpdatedAt={job.sourceUpdatedAt}
      />
      {unranked && !hideRank && <span className="badge unranked">unranked</span>}
      {hideRank && <span className="badge no-description">no description</span>}
      {!hideRank && job.rankEligible === false && (
        <span className="badge mismatch">mismatch</span>
      )}
      {!hideRank && job.rankScore != null && (
        <span className="badge score">{job.rankScore}</span>
      )}
      {!hideRank && job.feedbackKind === "like" && (
        <span className="badge liked">liked</span>
      )}
    </span>
  );
}

export function RankNote({
  job,
  compact = false,
  view,
}: {
  job: JobCard;
  compact?: boolean;
  view?: "ranked" | "mismatches" | "unranked" | "needs-description";
}) {
  if (hideRankDisplay(view)) {
    const scrape = job.scrapeStatus?.replace(/_/g, " ") ?? "not scraped";
    return (
      <p className={`rank-reason ${compact ? "compact" : ""}`}>
        Scrape: {scrape}. Open the posting to review manually.
      </p>
    );
  }

  if (isUnranked(job)) {
    return (
      <p className={`rank-reason ${compact ? "compact" : ""}`}>
        {compact
          ? "Unranked — not scored yet."
          : "Unranked — waiting for the next ranking run."}
      </p>
    );
  }

  const location =
    job.rankLocationFit && LOCATION_LABEL[job.rankLocationFit]
      ? LOCATION_LABEL[job.rankLocationFit]
      : null;

  if (compact) {
    return (
      <p className="rank-reason compact" title={job.rankReason ?? undefined}>
        {job.rankReason ?? "Scored, no reason stored."}
      </p>
    );
  }

  return (
    <div className="rank-block">
      <h3>Ranking</h3>
      <p className="rank-reason">{job.rankReason ?? "Scored, no reason stored."}</p>
      {location && <p className="muted">{location}</p>}
    </div>
  );
}
