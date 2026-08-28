import { fetchOracleJobDetails, fetchOracleJobs } from "./oracle.js";

const token = "elxb.fa.us2.oraclecloud.com|CX";

async function main(): Promise<void> {
  const jobs = await fetchOracleJobs(token);
  console.log(`listed ${jobs.length} (DC Water spike tenant)`);
  const sample = jobs[0];
  if (!sample) {
    console.log("No jobs returned");
    return;
  }
  const html = await fetchOracleJobDetails(token, sample.externalId);
  console.log(`sample: ${sample.title} (${sample.externalId})`);
  console.log(`description bytes: ${html?.length ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
