import type { Pool } from "pg";
import { htmlToText, truncateText } from "./htmlToText.js";
import {
  FEEDBACK_EXAMPLE_LIMIT,
  TRACKER_EXAMPLE_LIMIT,
  type RankContext,
  type RankExample,
} from "./rankPrompt.js";

/** Display employer used in UI and rank examples (Simplify department vs board name). */
export const DISPLAY_EMPLOYER_SQL = `COALESCE(
  CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
  c.name
)`;

/** Rank prompt context: likes + teaching dismissals only (Hide from board is excluded). */
export async function loadRankContext(pool: Pool): Promise<RankContext> {
  const memo = await pool.query<{ memo: string }>(`SELECT memo FROM rank_profile WHERE id = 1`);
  const likes = await pool.query<RankExample>(
    `SELECT
       ${DISPLAY_EMPLOYER_SQL} AS company,
       p.title,
       f.note
     FROM posting_feedback f
     JOIN postings p ON p.id = f.posting_id
     JOIN companies c ON c.id = p.company_id
     WHERE f.kind = 'like'
     ORDER BY f.created_at DESC
     LIMIT $1`,
    [FEEDBACK_EXAMPLE_LIMIT],
  );
  const dismissals = await pool.query<RankExample>(
    `SELECT
       ${DISPLAY_EMPLOYER_SQL} AS company,
       p.title,
       f.note
     FROM posting_feedback f
     JOIN postings p ON p.id = f.posting_id
     JOIN companies c ON c.id = p.company_id
     WHERE f.kind = 'dismiss' AND f.teach IS TRUE
     ORDER BY f.created_at DESC
     LIMIT $1`,
    [FEEDBACK_EXAMPLE_LIMIT],
  );
  const tracker = await pool.query<{
    status: string;
    company: string;
    title: string;
    notes: string | null;
    description_html: string | null;
  }>(
    `SELECT
       a.status,
       COALESCE(
         a.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name,
         'Unknown'
       ) AS company,
       COALESCE(a.title, p.title, 'Untitled') AS title,
       a.notes,
       COALESCE(a.description_html, p.description_html) AS description_html
     FROM applications a
     LEFT JOIN postings p ON p.id = a.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE a.status NOT IN ('todo', 'declined')
     ORDER BY a.updated_at DESC
     LIMIT $1`,
    [TRACKER_EXAMPLE_LIMIT],
  );
  return {
    memo: memo.rows[0]?.memo ?? "",
    likes: likes.rows,
    dismissals: dismissals.rows,
    tracker: tracker.rows.map((row) => ({
      status: row.status,
      company: row.company,
      title: row.title,
      notes: row.notes,
      description: truncateText(htmlToText(row.description_html), 200) || null,
    })),
  };
}
