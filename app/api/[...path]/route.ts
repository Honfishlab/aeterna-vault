import { databaseConfigured, databaseError, execute, query } from "../../../server/db";
import { authenticatedUser, createSession, destroySession, hashPassword, normalizeEmail, toAuthUser, validEmail, validPassword, verifyPassword } from "../../../server/auth";
import { mediaTypeAllowed, r2Bucket, r2Configured, r2Modules, safeObjectName } from "../../../server/r2";
import { completeGoogleAuthorization, createGoogleAuthorization, disconnectGoogleDrive, googleConnectionStatus, googleDriveConfigured, googleThumbnail, importGoogleMedia, listGoogleMedia } from "../../../server/googleDrive";
import { createPhotosSession, pollPhotosSession, queuePhotosItems } from "../../../server/googlePhotos";
import { jobStatus, processNextImportJob, queueDriveJobs } from "../../../server/importJobs";

const MAX_BODY_BYTES = 16 * 1024 * 1024;

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: securityHeaders });
}

function jsonWithCookie(data: unknown, cookie: string, status = 200) {
  return Response.json(data, { status, headers: { ...securityHeaders, "Set-Cookie": cookie } });
}

function oauthResult(success: boolean) {
  const payload = JSON.stringify({ type: "aeterna-provider-oauth", provider: "google-drive", success }).replace(/</g, "\\u003c");
  const message = success ? "Google Drive connected. This window will close." : "Google Drive could not be connected.";
  const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>Google Drive</title></head><body><p>" + message + "</p><script>window.opener&&window.opener.postMessage(" + payload + ",window.location.origin);setTimeout(()=>window.close(),800)</script></body></html>";
  return new Response(html, { status: success ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const forwardedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || requestUrl.host;
    const forwardedProto = request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
    return originUrl.host === forwardedHost && originUrl.protocol === forwardedProto + ":";
  } catch {
    return false;
  }
}

function routeName(request: Request) {
  return new URL(request.url).pathname.replace(/^\/api\//, '').replace(/\/$/, '');
}

function parseJwk(input?: unknown): Record<string, any> | null {
  if (!input) return null;
  if (typeof input === 'object') return input as Record<string, any>;
  if (typeof input !== 'string') return null;
  try {
    const parsed = JSON.parse(input.trim());
    return parsed?.kty === 'RSA' && parsed?.n && parsed?.e ? parsed : null;
  } catch {
    return null;
  }
}

function base64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function walletAddress(jwk: Record<string, any>) {
  const digest = await crypto.subtle.digest('SHA-256', base64UrlBytes(jwk.n));
  return bytesToBase64Url(new Uint8Array(digest));
}

function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return {
    models: {
      async generateContent(input: any) {
        const config = input.config || {};
        const parts = typeof input.contents === 'string'
          ? [{ text: input.contents }]
          : (input.contents?.parts || [{ text: String(input.contents || '') }]);
        const payload: any = { contents: [{ role: 'user', parts }] };
        if (config.systemInstruction) payload.systemInstruction = { parts: [{ text: config.systemInstruction }] };
        if (config.responseMimeType) payload.generationConfig = { responseMimeType: config.responseMimeType };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
        const data: any = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '';
        return { text };
      }
    }
  };
}

function modelName() {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
}

async function requestBody(request: Request) {
  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
  return request.json();
}

export async function GET(request: Request) {
  const route = routeName(request);

  if (route === "import-jobs") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const ids = (new URL(request.url).searchParams.get("ids") || "").split(",").filter(Boolean);
    return json({ jobs: await jobStatus(user.id, ids) });
  }

  if (route.startsWith("integrations/google-photos/session/")) {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      return json(await pollPhotosSession(user.id, route.replace("integrations/google-photos/session/", "")));
    } catch (error: any) { return json({ error: "Google Photos selection is unavailable.", code: error?.message }, 502); }
  }

  if (route === "integrations/google/callback") {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state || url.searchParams.get("error")) return oauthResult(false);
    try { await completeGoogleAuthorization(code, state, request); return oauthResult(true); }
    catch (error) { console.error("Google OAuth callback failed", error); return oauthResult(false); }
  }

  if (route === "integrations/google/status" || route === "integrations/google/connect" || route === "integrations/google/files" || route.startsWith("integrations/google/thumbnail/")) {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      if (route === "integrations/google/status") return json(await googleConnectionStatus(user.id, request));
      if (!googleDriveConfigured()) return json({ error: "Google Drive is not configured.", code: "GOOGLE_DRIVE_NOT_CONFIGURED" }, 503);
      if (route === "integrations/google/connect") return Response.redirect(await createGoogleAuthorization(user.id, request), 302);
      if (route === "integrations/google/files") return json(await listGoogleMedia(user.id, new URL(request.url).searchParams.get("pageToken")));
      return await googleThumbnail(user.id, decodeURIComponent(route.replace("integrations/google/thumbnail/", "")));
    } catch (error: any) {
      console.error("Google Drive request failed", error);
      const reauth = error?.message === "GOOGLE_REAUTH_REQUIRED" || error?.message === "GOOGLE_DRIVE_NOT_CONNECTED";
      return json({ error: reauth ? "Reconnect Google Drive to continue." : "Google Drive is temporarily unavailable.", code: error?.message || "GOOGLE_DRIVE_ERROR" }, reauth ? 409 : 502);
    }
  }

  if (route === "auth/me") {
    if (!databaseConfigured()) return json(databaseError(new Error("DATABASE_NOT_CONFIGURED")), 503);
    try { return json({ user: await authenticatedUser(request) }); }
    catch (error) { return json(databaseError(error), 503); }
  }

  if (route === "vault/data") {
    if (!databaseConfigured()) return json(databaseError(new Error("DATABASE_NOT_CONFIGURED")), 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const rows = await query<{ data: unknown; revision: number }>("SELECT data, revision FROM vault_snapshots WHERE user_id = $1", [user.id]);
      return json({ data: rows[0]?.data ?? null, revision: Number(rows[0]?.revision || 0) });
    } catch (error) { return json(databaseError(error), 503); }
  }
  if (route.startsWith("media/") && route.split("/").length === 2) {
    if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const mediaId = route.split("/")[1];
      const rows = await query<{ object_key: string; content_type: string; original_name: string }>("SELECT object_key, content_type, original_name FROM media_objects WHERE id = $1 AND user_id = $2 AND status = $3 LIMIT 1", [mediaId, user.id, "ready"]);
      if (!rows[0]) return json({ error: "Media object not found." }, 404);
      const { client, GetObjectCommand } = await r2Modules();
      const object = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: rows[0].object_key, Range: request.headers.get("range") || undefined }));
      const responseBody = object.Body?.transformToWebStream ? object.Body.transformToWebStream() : object.Body;
      const headers = new Headers({ "Content-Type": object.ContentType || rows[0].content_type, "Cache-Control": "private, max-age=300", "Accept-Ranges": "bytes", "Content-Disposition": "inline; filename*=UTF-8''" + encodeURIComponent(rows[0].original_name) });
      if (object.ContentLength != null) headers.set("Content-Length", String(object.ContentLength));
      if (object.ContentRange) headers.set("Content-Range", object.ContentRange);
      if (object.ETag) headers.set("ETag", object.ETag);
      return new Response(responseBody, { status: object.ContentRange ? 206 : 200, headers });
    } catch (error) { console.error("R2 media read failed", error); return json({ error: "Media is temporarily unavailable." }, 502); }
  }

  if (route === "health") {
    if (!databaseConfigured()) return json({ ok: true, service: "aeterna-vault", storage: "local-fallback", databaseConfigured: false, databaseConnected: false, mediaStorageConfigured: r2Configured(), aiConfigured: Boolean(gemini()) });
    try {
      await query("SELECT 1 AS connected");
      return json({ ok: true, service: "aeterna-vault", storage: "postgresql", databaseConfigured: true, databaseConnected: true, mediaStorageConfigured: r2Configured(), aiConfigured: Boolean(gemini()) });
    } catch (error) {
      return json({ ok: false, service: "aeterna-vault", databaseConfigured: true, databaseConnected: false, mediaStorageConfigured: r2Configured(), ...databaseError(error) }, 503);
    }
  }

  if (route === 'arweave/status' || route === 'arweave/wallet-info') {
    let info: any = null;
    try {
      const response = await fetch('https://arweave.net/info', { headers: { Accept: 'application/json' } });
      if (response.ok) info = await response.json();
    } catch {
      // The endpoint still reports a degraded state below.
    }

    const data = {
      configured: false,
      network: 'arweave.mainnet',
      nodeUrl: 'https://arweave.net',
      status: info ? 'HEALTHY' : 'DEGRADED',
      blockHeight: info?.height ?? null,
      peersConnected: info?.peers ?? null,
      walletAddress: null,
      balanceAr: null,
      clientEncryption: 'AES-GCM-256',
      keyPolicy: 'Browser-session keys are never persisted by Aeterna Vault.',
    };
    return json(data, info ? 200 : 503);
  }

  return json({ error: 'API route not found' }, 404);
}

export async function POST(request: Request) {
  const route = routeName(request);
  let body: any;
  try {
    body = await requestBody(request);
  } catch (error: any) {
    return json({ error: error?.message === 'REQUEST_TOO_LARGE' ? 'Request exceeds the 16 MB service limit.' : 'Invalid JSON request.' }, error?.message === 'REQUEST_TOO_LARGE' ? 413 : 400);
  }

  if (["auth/register", "auth/login", "auth/logout", "vault/sync", "media/presign", "media/complete", "integrations/google/import", "integrations/google/disconnect", "import-jobs/queue-drive", "integrations/google-photos/session", "integrations/google-photos/queue"].includes(route) && !sameOrigin(request)) return json({ error: "Cross-site request rejected." }, 403);

  if (route === "internal/import-worker") {
    if (!process.env.IMPORT_WORKER_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.IMPORT_WORKER_SECRET.trim()) return json({ error: "Unauthorized." }, 401);
    return json({ job: await processNextImportJob() });
  }

  if (route === "import-jobs/queue-drive" || route === "integrations/google-photos/session" || route === "integrations/google-photos/queue") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      if (route === "import-jobs/queue-drive") return json(await queueDriveJobs(user.id, Array.isArray(body.fileIds) ? body.fileIds : []));
      if (route === "integrations/google-photos/session") return json(await createPhotosSession(user.id));
      return json(await queuePhotosItems(user.id, String(body.sessionId || "")));
    } catch (error: any) { return json({ error: "The provider request could not be completed.", code: error?.message || "PROVIDER_ERROR" }, 502); }
  }

  if (route === "integrations/google/import") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
      const result = await queueDriveJobs(user.id, Array.isArray(body.fileIds) ? body.fileIds : []);
      return json(result);
    } catch (error: any) {
      console.error("Google Drive import failed", error);
      return json({ error: "The selected Google Drive media could not be imported.", code: error?.message || "GOOGLE_IMPORT_FAILED" }, 502);
    }
  }

  if (route === "integrations/google/disconnect") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      await disconnectGoogleDrive(user.id);
      return json({ success: true });
    } catch (error) {
      console.error("Google Drive disconnect failed", error);
      return json({ error: "Google Drive could not be disconnected." }, 502);
    }
  }

  if (route === "media/presign") {
    if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const name = String(body.name || "").slice(0, 255);
      const contentType = String(body.contentType || "").toLowerCase();
      const size = Number(body.size || 0);
      if (!name || !mediaTypeAllowed(contentType) || !Number.isSafeInteger(size) || size < 1 || size > 100 * 1024 * 1024) return json({ error: "Unsupported media type or file size. Maximum size is 100 MB." }, 400);
      const mediaId = crypto.randomUUID();
      const objectKey = user.id + "/" + mediaId + "-" + safeObjectName(name);
      const { client, PutObjectCommand, getSignedUrl } = await r2Modules();
      const uploadUrl = await getSignedUrl(client, new PutObjectCommand({ Bucket: r2Bucket(), Key: objectKey, ContentType: contentType }), { expiresIn: 600 });
      await execute("INSERT INTO media_objects (id, user_id, object_key, original_name, content_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6)", [mediaId, user.id, objectKey, name, contentType, size]);
      return json({ mediaId, uploadUrl, mediaUrl: "/api/media/" + mediaId, expiresIn: 600 });
    } catch (error) { console.error("R2 upload authorization failed", error); return json({ error: "Unable to authorize media upload." }, 502); }
  }

  if (route === "media/complete") {
    if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const mediaId = String(body.mediaId || "");
      const rows = await query<{ object_key: string; size_bytes: number }>("SELECT object_key, size_bytes FROM media_objects WHERE id = $1 AND user_id = $2 AND status = $3 LIMIT 1", [mediaId, user.id, "pending"]);
      if (!rows[0]) return json({ error: "Pending media upload not found." }, 404);
      const { client, HeadObjectCommand } = await r2Modules();
      const object = await client.send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: rows[0].object_key }));
      if (Number(object.ContentLength || 0) !== Number(rows[0].size_bytes)) return json({ error: "Uploaded file size did not match authorization." }, 409);
      await execute("UPDATE media_objects SET status = $1, etag = $2, completed_at = NOW() WHERE id = $3 AND user_id = $4", ["ready", object.ETag || null, mediaId, user.id]);
      return json({ success: true, mediaId, mediaUrl: "/api/media/" + mediaId });
    } catch (error) { console.error("R2 upload completion failed", error); return json({ error: "Unable to verify media upload." }, 502); }
  }

  if (route === "auth/register") {
    if (!databaseConfigured()) return json(databaseError(new Error("DATABASE_NOT_CONFIGURED")), 503);
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    const name = String(body.name || "").trim().slice(0, 100);
    const allowedRoles = ["Vault Owner", "Trustee", "Heir / Beneficiary"];
    const role = allowedRoles.includes(body.role) ? body.role : "Vault Owner";
    if (!name || !validEmail(email) || !validPassword(password)) return json({ error: "Name, a valid email, and a password of at least 12 characters are required." }, 400);
    try {
      const existing = await query("SELECT id FROM users WHERE email = $1 LIMIT 1", [email]);
      if (existing.length) return json({ error: "An account with this email already exists." }, 409);
      const id = crypto.randomUUID();
      await execute("INSERT INTO users (id, email, name, password_hash, role) VALUES ($1, $2, $3, $4, $5)", [id, email, name, await hashPassword(password), role]);
      await execute("INSERT INTO vault_snapshots (user_id, data) VALUES ($1, $2::jsonb)", [id, JSON.stringify({ memories: [], letters: [], memorials: [], heirs: [] })]);
      await execute("INSERT INTO audit_events (user_id, event_type, entity_type, entity_id) VALUES ($1, $2, $3, $1)", [id, "account.registered", "user"]);
      const session = await createSession(id, request);
      return jsonWithCookie({ user: toAuthUser({ id, email, name, role }) }, session.cookie, 201);
    } catch (error) { return json(databaseError(error), 503); }
  }

  if (route === "auth/login") {
    if (!databaseConfigured()) return json(databaseError(new Error("DATABASE_NOT_CONFIGURED")), 503);
    const email = normalizeEmail(String(body.email || ""));
    const password = String(body.password || "");
    try {
      const rows = await query<{ id: string; name: string; email: string; role: any; password_hash: string }>("SELECT id, name, email, role, password_hash FROM users WHERE email = $1 AND status = $2 LIMIT 1", [email, "active"]);
      const account = rows[0];
      if (!account || !(await verifyPassword(password, account.password_hash))) return json({ error: "Invalid email or password." }, 401);
      const session = await createSession(account.id, request);
      await execute("INSERT INTO audit_events (user_id, event_type) VALUES ($1, $2)", [account.id, "session.login"]);
      return jsonWithCookie({ user: toAuthUser(account) }, session.cookie);
    } catch (error) { return json(databaseError(error), 503); }
  }

  if (route === "auth/logout") {
    if (!databaseConfigured()) return jsonWithCookie({ success: true }, "aeterna_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    try { return jsonWithCookie({ success: true }, await destroySession(request)); }
    catch (error) { return json(databaseError(error), 503); }
  }

  if (route === "vault/sync") {
    if (!databaseConfigured()) return json(databaseError(new Error("DATABASE_NOT_CONFIGURED")), 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const data = { memories: Array.isArray(body.memories) ? body.memories : [], letters: Array.isArray(body.letters) ? body.letters : [], memorials: Array.isArray(body.memorials) ? body.memorials : [], heirs: Array.isArray(body.heirs) ? body.heirs : [] };
      const rows = await query<{ revision: number }>("INSERT INTO vault_snapshots (user_id, data) VALUES ($1, $2::jsonb) ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, revision = vault_snapshots.revision + 1, updated_at = NOW() RETURNING revision", [user.id, JSON.stringify(data)]);
      return json({ success: true, revision: Number(rows[0]?.revision || 1) });
    } catch (error) { return json(databaseError(error), 503); }
  }

  if (route === 'arweave/import-jwk') {
    const jwk = parseJwk(body.jwk);
    if (!jwk) return json({ error: 'Invalid RSA Arweave JWK structure.' }, 400);
    try {
      const address = await walletAddress(jwk);
      const balanceResponse = await fetch(`https://arweave.net/wallet/${address}/balance`);
      const winston = balanceResponse.ok ? await balanceResponse.text() : '0';
      return json({
        success: true,
        address,
        balanceAr: String(Number(winston) / 1_000_000_000_000),
        persisted: false,
        message: 'Wallet validated. The private key remains in this browser tab only.',
      });
    } catch {
      return json({ error: 'The wallet could not be validated against Arweave.' }, 400);
    }
  }

  if (route === 'arweave/upload') {
    const payload = typeof body.payloadBase64 === 'string'
      ? body.payloadBase64.replace(/^data:[^;]+;base64,/, '')
      : btoa(`Aeterna Vault: ${body.title || 'Untitled'}`);
    const sizeBytes = Math.floor(payload.length * 0.75);
    if (sizeBytes > MAX_BODY_BYTES) return json({ error: 'Encrypted payload exceeds the 16 MB broadcast limit.' }, 413);
    try {
      const priceResponse = await fetch(`https://arweave.net/price/${sizeBytes}`);
      const winston = priceResponse.ok ? await priceResponse.text() : '0';
      return json({
        success: true,
        broadcastMethod: 'CLIENT_SIGNING_REQUIRED',
        status: 'SIGNING_KEY_REQUIRED',
        txId: null,
        rewardAr: String(Number(winston) / 1_000_000_000_000),
        sizeBytes,
        message: 'Payload prepared and priced. Connect an Arweave JWK wallet in this browser tab to broadcast it.',
      });
    } catch {
      return json({ error: 'Unable to retrieve Arweave transaction pricing.' }, 502);
    }
  }

  if (route === 'ai/concierge') {
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json({ error: 'Prompt is required.' }, 400);
    const ai = gemini();
    if (!ai) {
      return json({
        aiConfigured: false,
        reply: 'I can guide you through the local vault while AI is not configured.\n\n[BUTTON: ➕ Upload Memory | modal:upload]\n[BUTTON: 📜 Legacy Letters | navigate:legacy]\n[BUTTON: 🛡️ Inheritance Setup | navigate:inheritance]',
      });
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: prompt,
        config: {
          systemInstruction: 'You are the Aeterna Vault concierge. Be concise, empathetic, and privacy-conscious. Never claim data is on Arweave unless the context confirms a signed transaction. End with up to three action buttons using [BUTTON: Label | navigate:target] or [BUTTON: Label | modal:upload].',
        },
      });
      return json({ aiConfigured: true, reply: response.text || 'How may I help with your vault?' });
    } catch {
      return json({ error: 'The AI concierge is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/story-helper') {
    const ai = gemini();
    const recipient = String(body.recipient || 'future generations');
    const topic = String(body.topic || 'family values');
    if (!ai) {
      return json({ aiConfigured: false, story: `Dearest ${recipient},\n\nAs I reflect on ${topic}, I want to preserve the lessons, kindness, and courage that shaped our family. May this letter remind you that legacy lives in the care we show one another and in the stories we choose to carry forward.` });
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: `Write a warm 150-word legacy letter to ${recipient} about ${topic}. Tone: ${body.tone || 'reflective and sincere'}.`,
        config: { systemInstruction: 'You help people write authentic legacy letters. Do not invent personal facts.' },
      });
      return json({ aiConfigured: true, story: response.text || '' });
    } catch {
      return json({ error: 'The story helper is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/auto-tag') {
    const ai = gemini();
    if (!ai) {
      const words = [body.title, body.description, body.category].filter(Boolean).join(' ').toLowerCase().match(/[a-z]{4,}/g) || [];
      const tags = [...new Set(words)].slice(0, 6);
      return json({ autoTagged: true, aiConfigured: false, isFallback: true, category: body.category || 'Personal', people: [], location: '', tags, description: body.description || '', confidence: 0.35 });
    }
    try {
      const parts: any[] = [];
      if (typeof body.imageData === 'string') {
        const match = body.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
      parts.push({ text: `Title: ${body.title || 'Untitled'}\nDescription: ${body.description || ''}\nCategory hint: ${body.category || ''}` });
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: { parts },
        config: {
          systemInstruction: 'Return JSON with category, people, location, tags, and description. Do not identify unknown people or infer sensitive traits.',
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(response.text || '{}');
      return json({ autoTagged: true, aiConfigured: true, ...parsed, confidence: 0.9 });
    } catch {
      return json({ error: 'Media analysis is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/transcribe-audio') {
    const ai = gemini();
    if (!ai) return json({ error: 'Audio transcription requires GEMINI_API_KEY configuration.', aiConfigured: false }, 503);
    const match = typeof body.audioData === 'string' ? body.audioData.match(/^data:([^;]+);base64,(.+)$/) : null;
    if (!match) return json({ error: 'A base64 audio recording is required.' }, 400);
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: { parts: [{ inlineData: { mimeType: body.mimeType || match[1], data: match[2] } }, { text: 'Transcribe this family history recording accurately. Return only the transcript.' }] },
      });
      return json({ transcription: response.text?.trim() || '', aiConfigured: true });
    } catch {
      return json({ error: 'Audio transcription failed.' }, 502);
    }
  }

  return json({ error: 'API route not found' }, 404);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: securityHeaders });
}
