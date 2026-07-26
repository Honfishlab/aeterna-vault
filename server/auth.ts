import { query, execute } from "./db";

const SESSION_COOKIE = "aeterna_session";
const PASSWORD_ITERATIONS = 210000;
const SESSION_DAYS = 30;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "Vault Owner" | "Trustee" | "Heir / Beneficiary";
  authMethod: "Email & Passcode";
  signedInAt: string;
  securityLevel: "Quantum-Proof AES-GCM";
}

function randomBytes(size: number) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS }, key, 256);
  return [PASSWORD_ITERATIONS, toBase64Url(salt), toBase64Url(new Uint8Array(bits))].join("$");
}

export async function verifyPassword(password: string, encoded: string) {
  const [iterationsText, saltText, expected] = encoded.split("$");
  const iterations = Number(iterationsText);
  if (!iterations || !saltText || !expected) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64Url(saltText), iterations }, key, 256);
  const actual = toBase64Url(new Uint8Array(bits));
  if (actual.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < actual.length; index += 1) mismatch |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export function validPassword(password: string) {
  return password.length >= 12 && password.length <= 200;
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createSession(userId: string, request: Request) {
  const token = toBase64Url(randomBytes(32));
  const tokenHash = await sha256(token);
  await execute("INSERT INTO sessions (user_id, token_hash, expires_at, user_agent, ip_address) VALUES ($1, $2, NOW() + INTERVAL $$30 days$$, $3, $4)", [userId, tokenHash, request.headers.get("user-agent"), request.headers.get("cf-connecting-ip")]);
  return {
    token,
    cookie: SESSION_COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + String(SESSION_DAYS * 86400),
  };
}

export async function destroySession(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await execute("DELETE FROM sessions WHERE token_hash = $1", [await sha256(token)]);
  return SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

export async function authenticatedUser(request: Request) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const rows = await query<{ id: string; name: string; email: string; role: AuthUser["role"] }>("SELECT u.id, u.name, u.email, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.status = $$active$$ LIMIT 1", [await sha256(token)]);
  if (!rows[0]) return null;
  await execute("UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1", [await sha256(token)]);
  return toAuthUser(rows[0]);
}

export function toAuthUser(row: { id: string; name: string; email: string; role: AuthUser["role"] }): AuthUser {
  return { ...row, authMethod: "Email & Passcode", signedInAt: new Date().toISOString(), securityLevel: "Quantum-Proof AES-GCM" };
}
