import type { ApplicationRow } from "../../api";
import { Badge, type BadgeTone } from "../../ui";

export function applicationStatusBadgeLabel(status: string): string {
  return status === "todo" ? "to-do" : status;
}

function statusTone(status: string): BadgeTone {
  if (status === "applied") return "applied";
  if (status === "interviewing") return "interviewing";
  if (status === "accepted") return "accepted";
  if (status === "declined") return "declined";
  return "neutral";
}

type ApplicationMetaBadgesProps = Pick<ApplicationRow, "status" | "postingId" | "source">;

export default function ApplicationMetaBadges({
  status,
  postingId,
  source,
}: ApplicationMetaBadgesProps) {
  return (
    <span className="meta-badges">
      <Badge tone={statusTone(status)}>{applicationStatusBadgeLabel(status)}</Badge>
      {postingId ? (
        <Badge tone="neutral">{source ?? "linked"}</Badge>
      ) : (
        <Badge tone="neutral">manual</Badge>
      )}
    </span>
  );
}
