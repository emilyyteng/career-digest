/**
 * Count-based achievements (R5.26 / M5-11). Each threshold pays once; launch
 * unlocks already-passed ones with no points.
 */
import type { Pool, PoolClient } from "pg";
import {
  POINTS,
  pointsForInterviewKind,
  type InterviewStepKind,
} from "./pointsFormulas.js";
import {
  effectiveEarnAmount,
  findEarnEvent,
  getPointsBalance,
  recordEarn,
} from "./pointsLedger.js";
import { localDateInTimezone } from "./progress.js";

type Queryable = Pool | PoolClient;

export type AchievementFamily = "apps" | "lc" | InterviewStepKind;

export type AchievementDef = {
  id: string;
  family: AchievementFamily;
  label: string;
  threshold: number;
  points: number;
};

export type AchievementView = AchievementDef & {
  current: number;
  unlocked: boolean;
  /** Unlocked at launch with no points. */
  launchUnlock: boolean;
  pointsPaid: number;
};

export type AchievementUnlock = {
  id: string;
  label: string;
  points: number;
  balanceAfter: number;
};

const APP_THRESHOLDS = [10, 25, 50, 100, 150, 200, 300, 500] as const;
const LC_THRESHOLDS = [25, 50, 100, 200, 300, 500] as const;
const INTERVIEW_THRESHOLDS: Record<
  Exclude<InterviewStepKind, "custom">,
  readonly number[]
> = {
  assessment: [5, 10, 25, 50],
  phone: [5, 10, 25, 50],
  technical: [3, 5, 10, 25],
  onsite: [1, 3, 5, 10],
  offer: [1, 2, 3, 5],
};

const KIND_LABEL: Record<Exclude<InterviewStepKind, "custom">, string> = {
  assessment: "assessments",
  phone: "phone screens",
  technical: "technicals",
  onsite: "onsites",
  offer: "offers",
};

function buildCatalog(): AchievementDef[] {
  const out: AchievementDef[] = [];
  for (const n of APP_THRESHOLDS) {
    out.push({
      id: `apps:${n}`,
      family: "apps",
      label: `${n} applications`,
      threshold: n,
      points: 3 * n,
    });
  }
  for (const n of LC_THRESHOLDS) {
    out.push({
      id: `lc:${n}`,
      family: "lc",
      label: `${n} LC solves`,
      threshold: n,
      points: 5 * n,
    });
  }
  for (const kind of Object.keys(INTERVIEW_THRESHOLDS) as Array<
    Exclude<InterviewStepKind, "custom">
  >) {
    const unit = pointsForInterviewKind(kind);
    for (const n of INTERVIEW_THRESHOLDS[kind]) {
      out.push({
        id: `${kind}:${n}`,
        family: kind,
        label: `${n} ${KIND_LABEL[kind]}`,
        threshold: n,
        points: unit * n,
      });
    }
  }
  return out;
}

export const ACHIEVEMENT_CATALOG: AchievementDef[] = buildCatalog();

export async function ensureAchievementLaunch(
  db: Queryable,
  today: string,
): Promise<{ launchDate: string; isFirstLaunch: boolean; pointsBackfilled: boolean }> {
  const existing = await db.query<{
    launch_date: string;
    points_backfilled: boolean;
  }>(
    `SELECT launch_date::text AS launch_date, points_backfilled
     FROM achievement_state WHERE singleton = true`,
  );
  if (existing.rows[0]) {
    return {
      launchDate: existing.rows[0].launch_date,
      isFirstLaunch: false,
      pointsBackfilled: existing.rows[0].points_backfilled,
    };
  }
  // New installs keep free launch unlocks; mark backfill done so we don't pay them later.
  await db.query(
    `INSERT INTO achievement_state (singleton, launch_date, points_backfilled)
     VALUES (true, $1::date, true)`,
    [today],
  );
  return { launchDate: today, isFirstLaunch: true, pointsBackfilled: true };
}

/**
 * One-shot: pay catalog points for unlocks that still have points_paid = 0.
 * Skips any achievement that already has a positive earn (no duplicate pay).
 */
export async function backfillAchievementPoints(
  db: Queryable,
): Promise<AchievementUnlock[]> {
  const state = await db.query<{ points_backfilled: boolean }>(
    `SELECT points_backfilled FROM achievement_state WHERE singleton = true`,
  );
  if (!state.rows[0] || state.rows[0].points_backfilled) return [];

  const { rows } = await db.query<{ achievement_id: string }>(
    `SELECT achievement_id FROM achievement_unlocks WHERE points_paid = 0`,
  );
  const paid: AchievementUnlock[] = [];

  for (const row of rows) {
    const def = ACHIEVEMENT_CATALOG.find((a) => a.id === row.achievement_id);
    if (!def) continue;

    const existing = await findEarnEvent(db, "achievement", def.id);
    if (existing && effectiveEarnAmount(existing) > 0) {
      await db.query(
        `UPDATE achievement_unlocks SET points_paid = $2 WHERE achievement_id = $1`,
        [def.id, effectiveEarnAmount(existing)],
      );
      continue;
    }

    const { event, created } = await recordEarn(db, {
      category: "achievement",
      amount: def.points,
      message: `Achievement · ${def.label} · +${def.points} points`,
      sourceType: "achievement",
      sourceId: def.id,
      breakdown: [{ category: "achievement", amount: def.points, label: def.label }],
    });
    await db.query(
      `UPDATE achievement_unlocks SET points_paid = $2 WHERE achievement_id = $1`,
      [def.id, def.points],
    );
    if (created) {
      paid.push({
        id: def.id,
        label: def.label,
        points: def.points,
        balanceAfter: event.balanceAfter,
      });
    }
  }

  await db.query(
    `UPDATE achievement_state SET points_backfilled = true WHERE singleton = true`,
  );
  return paid;
}

async function countApps(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM applications
     WHERE applied_at IS NOT NULL AND status <> 'todo'`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function countLc(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ n: string }>(
    `SELECT COALESCE(SUM(count), 0)::text AS n FROM leetcode_daily`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function countInterviewKind(
  db: Queryable,
  kind: Exclude<InterviewStepKind, "custom">,
): Promise<number> {
  // awaiting_employer means you finished your part (same as completions diary).
  const { rows } = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM application_steps
     WHERE status IN ('completed', 'awaiting_employer') AND kind = $1`,
    [kind],
  );
  return Number(rows[0]?.n ?? 0);
}

export async function achievementCounts(
  db: Queryable,
): Promise<Record<AchievementFamily, number>> {
  const apps = await countApps(db);
  const lc = await countLc(db);
  const out: Record<string, number> = { apps, lc, custom: 0 };
  for (const kind of Object.keys(INTERVIEW_THRESHOLDS) as Array<
    Exclude<InterviewStepKind, "custom">
  >) {
    out[kind] = await countInterviewKind(db, kind);
  }
  return out as Record<AchievementFamily, number>;
}

async function alreadyUnlocked(db: Queryable, id: string): Promise<boolean> {
  const { rows } = await db.query(
    `SELECT 1 FROM achievement_unlocks WHERE achievement_id = $1`,
    [id],
  );
  if (rows[0]) return true;
  const earn = await findEarnEvent(db, "achievement", id);
  return earn != null;
}

/**
 * Unlock any newly crossed thresholds. On first launch, passed ones unlock
 * with no points. Later crossings pay once via the achievement ledger category.
 */
export async function syncAchievements(
  db: Queryable,
  now = new Date(),
): Promise<AchievementUnlock[]> {
  const today = localDateInTimezone(now, "UTC");
  const { isFirstLaunch } = await ensureAchievementLaunch(db, today);

  const counts = await achievementCounts(db);
  const paid: AchievementUnlock[] = [];

  for (const def of ACHIEVEMENT_CATALOG) {
    const current = counts[def.family] ?? 0;
    if (current < def.threshold) continue;
    if (await alreadyUnlocked(db, def.id)) continue;

    // First sync after install: unlock everything already passed with no points.
    if (isFirstLaunch) {
      await db.query(
        `INSERT INTO achievement_unlocks (achievement_id, points_paid)
         VALUES ($1, 0) ON CONFLICT DO NOTHING`,
        [def.id],
      );
      continue;
    }

    const { event, created } = await recordEarn(db, {
      category: "achievement",
      amount: def.points,
      message: `Achievement · ${def.label} · +${def.points} points`,
      sourceType: "achievement",
      sourceId: def.id,
      breakdown: [{ category: "achievement", amount: def.points, label: def.label }],
    });
    await db.query(
      `INSERT INTO achievement_unlocks (achievement_id, points_paid)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [def.id, created ? def.points : 0],
    );
    if (created) {
      paid.push({
        id: def.id,
        label: def.label,
        points: def.points,
        balanceAfter: event.balanceAfter,
      });
    }
  }

  // Existing DBs that launched with free unlocks: pay them once (no duplicates).
  paid.push(...(await backfillAchievementPoints(db)));
  return paid;
}

export async function listAchievements(db: Queryable): Promise<{
  achievements: AchievementView[];
  balance: number;
}> {
  // Ensure launch unlocks exist (and one-shot point backfill) before listing.
  await syncAchievements(db);
  const counts = await achievementCounts(db);
  const { rows: unlocked } = await db.query<{
    achievement_id: string;
    points_paid: number;
  }>(`SELECT achievement_id, points_paid FROM achievement_unlocks`);
  const byId = new Map(unlocked.map((r) => [r.achievement_id, r.points_paid]));

  const achievements: AchievementView[] = ACHIEVEMENT_CATALOG.map((def) => {
    const pointsPaid = byId.get(def.id);
    const isUnlocked = pointsPaid !== undefined;
    return {
      ...def,
      current: counts[def.family] ?? 0,
      unlocked: isUnlocked,
      launchUnlock: isUnlocked && pointsPaid === 0,
      pointsPaid: pointsPaid ?? 0,
    };
  });

  return { achievements, balance: await getPointsBalance(db) };
}
