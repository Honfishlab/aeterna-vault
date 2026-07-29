import { execute, query } from "./db";

function base64Url(bytes: Uint8Array) {
  let value = "";
  bytes.forEach(byte => { value += String.fromCharCode(byte); });
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function tokenHash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64Url(new Uint8Array(digest));
}

export async function issueAccountToken(userId: string, purpose: "verify_email" | "reset_password", hours = 1) {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = base64Url(bytes);
  await execute("DELETE FROM account_tokens WHERE user_id=$1 AND purpose=$2 AND used_at IS NULL", [userId, purpose]);
  await execute("INSERT INTO account_tokens(id,user_id,token_hash,purpose,expires_at) VALUES($1,$2,$3,$4,NOW()+($5*INTERVAL $$1 hour$$))", [crypto.randomUUID(), userId, await tokenHash(token), purpose, hours]);
  return token;
}

export async function consumeAccountToken(token: string, purpose: "verify_email" | "reset_password") {
  const rows = await query<{ user_id: string }>("UPDATE account_tokens SET used_at=NOW() WHERE token_hash=$1 AND purpose=$2 AND used_at IS NULL AND expires_at>NOW() RETURNING user_id", [await tokenHash(token), purpose]);
  return rows[0]?.user_id || null;
}

export async function rateLimit(request: Request, action: string, maximum: number, minutes: number) {
  const identity = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const key = await tokenHash(identity.trim());
  const rows = await query<{ attempts: number }>("INSERT INTO security_rate_limits(key_hash,action,attempts) VALUES($1,$2,1) ON CONFLICT(key_hash,action) DO UPDATE SET attempts=CASE WHEN security_rate_limits.window_started_at<NOW()-($3*INTERVAL $$1 minute$$) THEN 1 ELSE security_rate_limits.attempts+1 END,window_started_at=CASE WHEN security_rate_limits.window_started_at<NOW()-($3*INTERVAL $$1 minute$$) THEN NOW() ELSE security_rate_limits.window_started_at END RETURNING attempts", [key, action, minutes]);
  return Number(rows[0]?.attempts || 1) <= maximum;
}

export async function sendAccountEmail(email: string, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [email], subject, text }),
  });
  return response.ok;
}
