import { authenticatedUser, hashPassword, normalizeEmail, validPassword, verifyPassword } from "./auth";
import { execute, query } from "./db";
import { consumeAccountToken, issueAccountToken, rateLimit, sendAccountEmail } from "./security";

const headers = { "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'", "X-Content-Type-Options": "nosniff" };
const json = (data: unknown, status = 200, cookie?: string) => Response.json(data, { status, headers: cookie ? { ...headers, "Set-Cookie": cookie } : headers });
const clearCookie = "aeterna_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";

export async function accountPost(route: string, request: Request, body: any): Promise<Response | null> {
  if (route === "auth/verify-email") {
    const userId = await consumeAccountToken(String(body.token || ""), "verify_email");
    if (!userId) return json({ error: "Verification token is invalid or expired." }, 400);
    await execute("UPDATE users SET email_verified_at=NOW(),updated_at=NOW() WHERE id=$1", [userId]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [userId,"account.email_verified","user"]);
    return json({ success: true });
  }
  if (route === "auth/request-reset") {
    if (!(await rateLimit(request,"password-reset",5,15))) return json({ error: "Too many requests. Try again later." },429);
    const email = normalizeEmail(String(body.email || ""));
    const rows = await query<any>("SELECT id,email FROM users WHERE email=$1 AND status=$$active$$", [email]);
    if (rows[0]) {
      const token = await issueAccountToken(rows[0].id,"reset_password",1);
      await sendAccountEmail(email,"Reset your Aeterna Vault password","Reset your password: " + new URL(request.url).origin + "/?resetToken=" + encodeURIComponent(token));
      await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [rows[0].id,"account.password_reset_requested","user"]);
    }
    return json({ success: true, message: "If that account exists, a reset email has been sent." });
  }
  if (route === "auth/reset-password") {
    if (!(await rateLimit(request,"password-reset-confirm",10,15))) return json({ error: "Too many requests. Try again later." },429);
    const password = String(body.password || "");
    if (!validPassword(password)) return json({ error: "Password must be at least 12 characters." },400);
    const userId = await consumeAccountToken(String(body.token || ""),"reset_password");
    if (!userId) return json({ error: "Reset token is invalid or expired." },400);
    await execute("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2", [await hashPassword(password),userId]);
    await execute("DELETE FROM sessions WHERE user_id=$1", [userId]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [userId,"account.password_reset","user"]);
    return json({ success: true });
  }

  if (!["account/profile","account/password","account/session/revoke","account/delete","auth/request-verification"].includes(route)) return null;
  const user = await authenticatedUser(request);
  if (!user) return json({ error: "Authentication required." },401);
  if (route === "account/profile") {
    const name = String(body.name || "").trim().slice(0,100);
    if (!name) return json({ error: "Name is required." },400);
    await execute("UPDATE users SET name=$1,updated_at=NOW() WHERE id=$2", [name,user.id]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [user.id,"account.profile_updated","user"]);
    return json({ success: true,name });
  }
  if (route === "account/password") {
    const rows = await query<any>("SELECT password_hash FROM users WHERE id=$1", [user.id]);
    if (!rows[0] || !(await verifyPassword(String(body.currentPassword || ""),rows[0].password_hash))) return json({ error: "Current password is incorrect." },401);
    if (!validPassword(String(body.password || ""))) return json({ error: "New password must be at least 12 characters." },400);
    await execute("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2", [await hashPassword(String(body.password)),user.id]);
    await execute("DELETE FROM sessions WHERE user_id=$1", [user.id]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [user.id,"account.password_changed","user"]);
    return json({ success: true },200,clearCookie);
  }
  if (route === "account/session/revoke") {
    await execute("DELETE FROM sessions WHERE id=$1 AND user_id=$2", [Number(body.id),user.id]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type,entity_id) VALUES($1,$2,$3,$4)", [user.id,"session.revoked","session",String(body.id)]);
    return json({ success: true });
  }
  if (route === "account/delete") {
    const rows = await query<any>("SELECT password_hash FROM users WHERE id=$1", [user.id]);
    if (!rows[0] || !(await verifyPassword(String(body.password || ""),rows[0].password_hash))) return json({ error: "Password confirmation failed." },401);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type,entity_id) VALUES($1,$2,$3,$1)", [user.id,"account.deletion_requested","user"]);
    await execute("UPDATE users SET status=$$disabled$$,deleted_at=NOW(),updated_at=NOW() WHERE id=$1", [user.id]);
    await execute("UPDATE media_objects SET deleted_at=NOW(),purge_after=NOW()+INTERVAL $$30 days$$ WHERE user_id=$1 AND deleted_at IS NULL", [user.id]);
    await execute("DELETE FROM sessions WHERE user_id=$1", [user.id]);
    return json({ success: true,recoveryDays: 30 },200,clearCookie);
  }
  const token = await issueAccountToken(user.id,"verify_email",24);
  const sent = await sendAccountEmail(user.email,"Verify your Aeterna Vault email","Verify your email: " + new URL(request.url).origin + "/?verifyToken=" + encodeURIComponent(token));
  await execute("INSERT INTO audit_events(user_id,event_type,entity_type,metadata) VALUES($1,$2,$3,$4::jsonb)", [user.id,"account.verification_requested","user",JSON.stringify({ sent })]);
  return json({ success: true,sent,message: sent ? "Verification email sent." : "Email delivery requires RESEND_API_KEY and EMAIL_FROM." });
}
