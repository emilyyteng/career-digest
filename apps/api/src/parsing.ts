/** Parse YYYY-MM-DD as local noon, or accept full ISO. */
export function parseAppliedAt(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (day) {
    return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]), 12, 0, 0);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseDueAt(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseHttpUrl(value: unknown, opts?: { allowEmpty?: boolean }): string | null {
  if (value === null || value === "") {
    return opts?.allowEmpty ? null : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return opts?.allowEmpty ? null : null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

export function resolveAppliedAt(opts: {
  status: string;
  previousAppliedAt?: Date | string | null;
  explicit?: unknown;
  explicitProvided: boolean;
}): Date | null {
  if (opts.status === "todo") return null;
  if (opts.explicitProvided) return parseAppliedAt(opts.explicit);
  if (opts.previousAppliedAt) {
    return opts.previousAppliedAt instanceof Date
      ? opts.previousAppliedAt
      : new Date(opts.previousAppliedAt);
  }
  if (
    opts.status === "applied" ||
    opts.status === "interviewing" ||
    opts.status === "accepted"
  ) {
    return new Date();
  }
  return null;
}
