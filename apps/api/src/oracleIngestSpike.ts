/**
 * One-company ingest spike for Oracle adapter validation (Phase 1).
 * Usage: npx tsx src/oracleIngestSpike.ts
 */
import { fetchBoardJobs, fetchMissingDescription } from "./adapters/index.js";
import { migrate, pool } from "./db.js";
import { shouldInsertPosting } from "./filter.js";
import type { CompanyConfig } from "./types.js";

const SPIKE: CompanyConfig = {
  name: "DC Water",
  source: "oracle",
  boardToken: "elxb.fa.us2.oraclecloud.com|CX",
};

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

async function main(): Promise<void> {
  await migrate();
  const companyId = await upsertCompany(SPIKE);
  const postings = await fetchBoardJobs(SPIKE);
  const eligible = postings.filter((p) => shouldInsertPosting(p.title, p.location));
  console.log(`listed ${postings.length}, ingest-eligible ${eligible.length}`);

  let upserted = 0;
  for (const posting of eligible) {
    posting.descriptionHtml = await fetchMissingDescription(SPIKE, posting);
    await pool.query(
      `INSERT INTO postings (
         source, external_id, company_id, title, location, department,
         url, description_html, first_published_at,
         source_updated_at, raw
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
       ON CONFLICT (source, external_id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         title = EXCLUDED.title,
         location = EXCLUDED.location,
         url = EXCLUDED.url,
         description_html = COALESCE(EXCLUDED.description_html, postings.description_html),
         source_updated_at = EXCLUDED.source_updated_at,
         last_seen_at = now(),
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
        posting.firstPublishedAt,
        posting.sourceUpdatedAt,
        JSON.stringify(posting.raw),
      ],
    );
    upserted += 1;
    console.log(`upserted: ${posting.title} (desc ${posting.descriptionHtml?.length ?? 0} bytes)`);
  }

  if (eligible.length === 0 && postings.length > 0) {
    const probe = postings[0];
    const html = await fetchMissingDescription(SPIKE, probe);
    console.log(
      `no intern-eligible roles; probe "${probe.title}" description ${html?.length ?? 0} bytes`,
    );
  }

  console.log(`Done. Upserted ${upserted} posting(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
