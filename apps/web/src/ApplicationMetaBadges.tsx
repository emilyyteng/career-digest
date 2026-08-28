import type { ApplicationRow } from "./api";

export function applicationStatusBadgeLabel(status: string): string {
  return status === "todo" ? "to-do" : status;
}

type ApplicationMetaBadgesProps = Pick<ApplicationRow, "status" | "postingId" | "source">;

export default function ApplicationMetaBadges({
  status,
  postingId,
  source,
}: ApplicationMetaBadgesProps) {
  return (
    <span className="meta-badges">
      <span className={`badge status-${status}`}>{applicationStatusBadgeLabel(status)}</span>
      {postingId ? (
        <span className="badge">{source ?? "linked"}</span>
      ) : (
        <span className="badge">manual</span>
      )}
    </span>
  );
}
