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

export function RankBadges({ job }: { job: JobCard }) {
  const unranked = isUnranked(job);
  return (
    <span className="meta-badges">
      <span className="badge">{job.source}</span>
      <PostingDates
        firstPublishedAt={job.firstPublishedAt}
        sourceUpdatedAt={job.sourceUpdatedAt}
      />
      {unranked && <span className="badge unranked">unranked</span>}
      {job.rankEligible === false && <span className="badge mismatch">mismatch</span>}
      {job.rankScore != null && job.rankEligible !== false && (
        <span className="badge score">{job.rankScore}</span>
      )}
      {job.feedbackKind === "like" && <span className="badge liked">liked</span>}
    </span>
  );
}

export function RankNote({
  job,
  compact = false,
}: {
  job: JobCard;
  compact?: boolean;
}) {
  if (isUnranked(job)) {
    return (
      <p className={`rank-reason ${compact ? "compact" : ""}`}>
        {compact
          ? "Unranked — not scored yet."
          : "Unranked — this role has not been scored yet. Turn on Show unranked to keep these at the top of Jobs."}
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
