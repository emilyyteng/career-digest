import type { HTMLAttributes, ReactNode } from "react";

/**
 * Role-mapped badge tones (F09 Q18). Prefer these over page-local hex.
 * Priority RYG · kind interview/goal · job status · score/streak (domain tech) · liked (warn).
 */
export type BadgeTone =
  | "neutral"
  | "p0"
  | "p1"
  | "p2"
  | "interview"
  | "goal"
  | "applied"
  | "interviewing"
  | "accepted"
  | "declined"
  | "score"
  | "streak"
  | "liked"
  | "danger"
  | "ok"
  | "dates";

export type BadgeSize = "md" | "compact";

type Props = Omit<HTMLAttributes<HTMLSpanElement>, "className"> & {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
};

export function badgeClass(
  tone: BadgeTone = "neutral",
  size: BadgeSize = "md",
  className = "",
): string {
  return [
    "ui-badge",
    `ui-badge-${tone}`,
    size === "compact" ? "ui-badge-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function Badge({
  tone = "neutral",
  size = "md",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <span className={badgeClass(tone, size, className)} {...rest}>
      {children}
    </span>
  );
}
