import { neon } from "@neondatabase/serverless";

export type DbRow = Record<string, unknown>;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_NOT_CONFIGURED");
  return neon(url);
}

export async function query<T = DbRow>(text: string, params: unknown[] = []) {
  const result = await client().query(text, params);
  return result as T[];
}

export async function execute(text: string, params: unknown[] = []) {
  await client().query(text, params);
}

export function databaseError(error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
    return { error: "Persistent storage is not configured.", code: "DATABASE_NOT_CONFIGURED" };
  }
  console.error("Database operation failed", error);
  return { error: "The persistent storage service is temporarily unavailable.", code: "DATABASE_UNAVAILABLE" };
}
