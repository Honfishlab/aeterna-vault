export type DbRow = Record<string, unknown>;

let poolPromise: Promise<any> | null = null;

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

async function client() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!poolPromise) {
    const packageName = "pg";
    poolPromise = import(/* @vite-ignore */ packageName).then(({ Pool }) => new Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30000 }));
  }
  return poolPromise;
}

export async function query<T = DbRow>(text: string, params: unknown[] = []) {
  const result = await (await client()).query(text, params);
  return result.rows as T[];
}

export async function execute(text: string, params: unknown[] = []) {
  await (await client()).query(text, params);
}

export function databaseError(error: unknown) {
  if (error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED") {
    return { error: "Persistent storage is not configured.", code: "DATABASE_NOT_CONFIGURED" };
  }
  console.error("Database operation failed", error);
  return { error: "The persistent storage service is temporarily unavailable.", code: "DATABASE_UNAVAILABLE" };
}
