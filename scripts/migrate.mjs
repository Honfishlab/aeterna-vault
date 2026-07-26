import { readFile } from "node:fs/promises";
import pg from "pg";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required."); process.exit(1); }
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const version = "001_initial_schema";
const applied = await pool.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]).then(result => result.rows).catch(() => []);
if (applied.length) { console.log(version + " is already applied."); await pool.end(); process.exit(0); }
const source = await readFile(new URL("../migrations/001_initial_schema.sql", import.meta.url), "utf8");
for (const statement of source.split("-- statement-breakpoint").map(value => value.trim()).filter(Boolean)) await pool.query(statement);
await pool.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", [version]);
await pool.end();
console.log("Applied " + version + ".");
