import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required."); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
const directory = new URL("../migrations/", import.meta.url);
const files = (await readdir(directory)).filter(name => /^\d+.*\.sql$/.test(name)).sort();
for (const file of files) {
  const version = file.replace(/\.sql$/, "");
  const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]);
  if (applied.rows.length) { console.log(version + " is already applied."); continue; }
  const source = await readFile(new URL(file, directory), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of source.split("-- statement-breakpoint").map(value => value.trim()).filter(Boolean)) await client.query(statement);
    await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    await client.query("COMMIT");
    console.log("Applied " + version + ".");
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}
await pool.end();
