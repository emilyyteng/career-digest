import { formatShortDate } from "./formatDate";

export default function PostingDates({
  firstPublishedAt,
  sourceUpdatedAt,
}: {
  firstPublishedAt: string | null | undefined;
  sourceUpdatedAt: string | null | undefined;
}) {
  const published = formatShortDate(firstPublishedAt);
  const updated = formatShortDate(sourceUpdatedAt);
  if (!published && !updated) return null;

  const sameDay = Boolean(published && updated && published === updated);
  const label =
    published && updated && !sameDay
      ? `${published} · ${updated}`
      : (published ?? updated);
  const title =
    published && updated && !sameDay
      ? "Published · updated"
      : published
        ? "Published"
        : "Updated";

  return (
    <span className="badge dates" title={title}>
      {label}
    </span>
  );
}
