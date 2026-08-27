import { fetchBoardJobs, fetchMissingDescription } from "./adapters/index.js";
import { fetchSimplifyMiscellaneousJobs } from "./adapters/simplify.js";
import { companies } from "./config/companies.js";
import { migrate, pool } from "./db.js";
import {
  classifyInternship,
  isExpiredInternTerm,
  shouldInsertPosting,
  shouldKeepExistingOnBoard,
} from "./filter.js";
import { isAllowedUsLocation } from "./location.js";
import type { CompanyConfig, NormalizedPosting } from "./types.js";

async function upsertCompany(company: CompanyConfig): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO companies (name, source, board_token)
     VALUES ($1, $2, $3)
     ON CONFLICT (source, board_token)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [company.name, company.source, company.boardToken],
  );
  return result.rows[0].id;
}

async function existingExternalIds(companyId: string): Promise<Set<string>> {
  const result = await pool.query<{ external_id: string }>(
    `SELECT external_id FROM postings WHERE company_id = $1`,
    [companyId],
  );
  return new Set(result.rows.map((row) => row.external_id));
}

async function upsertPosting(
  companyId: string,
  posting: NormalizedPosting,
): Promise<void> {
  await pool.query(
    `INSERT INTO postings (
       source, external_id, company_id, title, location, department,
       url, description_html, is_internship, first_published_at,
       source_updated_at, cycle_status, raw
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)
     ON CONFLICT (source, external_id) DO UPDATE SET
       company_id = EXCLUDED.company_id,
       title = EXCLUDED.title,
       location = EXCLUDED.location,
       department = EXCLUDED.department,
       url = EXCLUDED.url,
       description_html = COALESCE(EXCLUDED.description_html, postings.description_html),
       is_internship = EXCLUDED.is_internship,
       first_published_at = EXCLUDED.first_published_at,
       source_updated_at = EXCLUDED.source_updated_at,
       cycle_status = EXCLUDED.cycle_status,
       last_seen_at = now(),
       removed_from_board_at = NULL,
       raw = EXCLUDED.raw`,
    [
      posting.source,
      posting.externalId,
      companyId,
      posting.title,
      posting.location,
      posting.department,
      posting.url,
      posting.descriptionHtml,
      posting.isInternship,
      posting.firstPublishedAt,
      posting.sourceUpdatedAt,
      posting.cycleStatus,
      JSON.stringify(posting.raw),
    ],
  );
}

/** Drop listings that left the board unless they have an application/notes row. */
async function reconcileRemovedFromBoard(
  companyId: string,
  seenExternalIds: string[],
): Promise<{ deleted: number; retained: number }> {
  const retained = await pool.query(
    `UPDATE postings
     SET removed_from_board_at = COALESCE(removed_from_board_at, now())
     WHERE company_id = $1
       AND NOT (external_id = ANY($2::text[]))
       AND id IN (SELECT posting_id FROM applications)`,
    [companyId, seenExternalIds],
  );

  const deleted = await pool.query(
    `DELETE FROM postings
     WHERE company_id = $1
       AND NOT (external_id = ANY($2::text[]))
       AND id NOT IN (SELECT posting_id FROM applications)`,
    [companyId, seenExternalIds],
  );

  return {
    deleted: deleted.rowCount ?? 0,
    retained: retained.rowCount ?? 0,
  };
}

/** Full-time leftovers and expired intern terms, unless they have an application. */
async function dropUntrackedRejected(companyId: string): Promise<number> {
  const rows = await pool.query<{
    id: string;
    title: string;
    location: string | null;
    is_internship: boolean;
  }>(
    `SELECT p.id, p.title, p.location, p.is_internship
     FROM postings p
     WHERE p.company_id = $1
       AND p.id NOT IN (SELECT posting_id FROM applications)`,
    [companyId],
  );

  const dropIds = rows.rows
    .filter(
      (row) =>
        !row.is_internship ||
        isExpiredInternTerm(row.title) ||
        !isAllowedUsLocation(row.location),
    )
    .map((row) => row.id);

  if (dropIds.length === 0) return 0;
  await pool.query(`DELETE FROM postings WHERE id = ANY($1::uuid[])`, [dropIds]);
  return dropIds.length;
}

async function ingest(): Promise<void> {
  await migrate();

  let listed = 0;
  let internships = 0;
  let upserted = 0;
  let deleted = 0;
  let retainedClosed = 0;

  for (const company of companies) {
    try {
      const companyId = await upsertCompany(company);
      const postings = await fetchBoardJobs(company);
      listed += postings.length;
      internships += postings.filter((p) => p.isInternship).length;

      const knownIds = await existingExternalIds(companyId);
      const toUpsert = postings.filter((posting) => {
        const known = knownIds.has(posting.externalId);
        if (known) return shouldKeepExistingOnBoard(posting.title, posting.location);
        return shouldInsertPosting(
          posting.title,
          posting.location,
          posting.firstPublishedAt,
        );
      });

      for (const posting of toUpsert) {
        posting.cycleStatus = classifyInternship(
          posting.title,
          posting.firstPublishedAt,
          new Date(),
          knownIds.has(posting.externalId),
        );
        if (!knownIds.has(posting.externalId)) {
          posting.descriptionHtml = await fetchMissingDescription(company, posting);
        }
        await upsertPosting(companyId, posting);
        upserted += 1;
      }

      const seenIds = postings.map((posting) => posting.externalId);
      const removed = await reconcileRemovedFromBoard(companyId, seenIds);
      deleted += removed.deleted;
      retainedClosed += removed.retained;

      const expired = await dropUntrackedRejected(companyId);
      deleted += expired;

      console.log(
        `${company.source}/${company.name}: ${postings.length} listed, ${toUpsert.length} upserted, ${removed.deleted} deleted (gone, no application), ${removed.retained} kept closed (applied)`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${company.source}/${company.name}: FAILED ${message}`);
    }
  }

  const simplifyCompany: CompanyConfig = {
    name: "Simplify miscellaneous",
    source: "simplify",
    boardToken: "listings",
  };

  try {
    const companyId = await upsertCompany(simplifyCompany);
    const { postings, seenIds } = await fetchSimplifyMiscellaneousJobs();
    listed += postings.length;
    internships += postings.length;

    const knownIds = await existingExternalIds(companyId);
    const toUpsert = postings.filter((posting) => {
      const known = knownIds.has(posting.externalId);
      if (known) return shouldKeepExistingOnBoard(posting.title, posting.location);
      return shouldInsertPosting(
        posting.title,
        posting.location,
        posting.firstPublishedAt,
      );
    });

    for (const posting of toUpsert) {
      posting.cycleStatus = classifyInternship(
        posting.title,
        posting.firstPublishedAt,
        new Date(),
        knownIds.has(posting.externalId),
      );
      await upsertPosting(companyId, posting);
      upserted += 1;
    }

    const removed = await reconcileRemovedFromBoard(companyId, seenIds);
    deleted += removed.deleted;
    retainedClosed += removed.retained;
    deleted += await dropUntrackedRejected(companyId);

    console.log(
      `simplify/miscellaneous: ${postings.length} listed, ${toUpsert.length} upserted, ${removed.deleted} deleted (gone, no application), ${removed.retained} kept closed (applied)`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`simplify/miscellaneous: FAILED ${message}`);
  }

  console.log(
    `Done. Listed ${listed}, intern-titled ${internships}, upserted ${upserted}, deleted ${deleted}, retained closed ${retainedClosed}.`,
  );
}

try {
  await ingest();
} finally {
  await pool.end();
}
