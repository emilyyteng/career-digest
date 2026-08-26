import { fetchGreenhouseJobs } from "./adapters/greenhouse.js";
import { companies } from "./config/companies.js";
import { migrate, pool } from "./db.js";
import type { NormalizedPosting } from "./types.js";

async function upsertCompany(company: (typeof companies)[number]): Promise<string> {
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

async function upsertPosting(
  companyId: string,
  posting: NormalizedPosting,
): Promise<void> {
  await pool.query(
    `INSERT INTO postings (
       source, external_id, company_id, title, location, department,
       url, description_html, is_internship, raw
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     ON CONFLICT (source, external_id) DO UPDATE SET
       company_id = EXCLUDED.company_id,
       title = EXCLUDED.title,
       location = EXCLUDED.location,
       department = EXCLUDED.department,
       url = EXCLUDED.url,
       description_html = EXCLUDED.description_html,
       is_internship = EXCLUDED.is_internship,
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
      posting.isInternship,
      JSON.stringify(posting.raw),
    ],
  );
}

async function ingest(): Promise<void> {
  await migrate();

  let total = 0;
  let internships = 0;

  for (const company of companies) {
    const companyId = await upsertCompany(company);
    const postings = await fetchGreenhouseJobs(company.boardToken);
    for (const posting of postings) {
      await upsertPosting(companyId, posting);
      total += 1;
      if (posting.isInternship) internships += 1;
    }
    console.log(
      `${company.name}: ${postings.length} postings (${postings.filter((p) => p.isInternship).length} internships)`,
    );
  }

  console.log(`Done. Upserted ${total} postings, ${internships} marked internship.`);
}

try {
  await ingest();
} finally {
  await pool.end();
}
