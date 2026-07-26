import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) { console.error("DATABASE_URL is required."); process.exit(1); }
const sql = neon(process.env.DATABASE_URL);
const version = "001_initial_schema";
const applied = await sql.query("SELECT 1 FROM schema_migrations WHERE version = $1", [version]).catch(() => []);
if (applied.length) { console.log(version + " is already applied."); process.exit(0); }
const source = await readFile(new URL("../migrations/001_initial_schema.sql", import.meta.url), "utf8");
for (const statement of source.split("-- statement-breakpoint").map(value => value.trim()).filter(Boolean)) await sql.query(statement);
await sql.query("INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING", [version]);
console.log("Applied " + version + ".");