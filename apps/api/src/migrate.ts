import { migrate, pool } from "./db.js";

const { applied } = await migrate();
await pool.end();
console.log(
  applied.length
    ? `Migration complete. Applied: ${applied.join(", ")}`
    : "Migration complete. Nothing to apply.",
);
