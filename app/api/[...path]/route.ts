import { databaseConfigured, databaseError, execute, query } from "../../../server/db";
import { authenticatedUser, createSession, destroySession, hashPassword, normalizeEmail, toAuthUser, validEmail, validPassword, verifyPassword } from "../../../server/auth";
import { mediaTypeAllowed, r2Bucket, r2Configured, r2Modules, safeObjectName } from "../../../server/r2";
import { completeGoogleAuthorization, createGoogleAuthorization, disconnectGoogleDrive, googleConnectionStatus, googleDriveConfigured, googleThumbnail, importGoogleMedia, listGoogleMedia } from "../../../server/googleDrive";
import { createPhotosSession, pollPhotosSession, queuePhotosItems } from "../../../server/googlePhotos";
import { acknowledgeImportJobs, cancelImportJob, jobStatus, queueDriveJobs, retryImportJob, startImportWorker } from "../../../server/importJobs";
import { queueMediaProcessing } from "../../../server/mediaProcessing";
import { accountPost } from "../../../server/accountRoutes";
import { rateLimit } from "../../../server/security";

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
    const history = new URL(request.url).searchParams.get("history") === "true";
    return json({ jobs: await jobStatus(user.id, ids, history) });
  }

  if (route === "media/recycle-bin") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const albums = await query("SELECT id,album_name AS \"albumName\",jsonb_array_length(item_snapshot) AS \"itemCount\",COALESCE(array_length(media_ids,1),0) AS \"mediaCount\",deleted_at AS \"deletedAt\",purge_after AS \"purgeAfter\" FROM deleted_albums WHERE user_id=$1 AND restored_at IS NULL AND permanently_deleted_at IS NULL AND purge_after>NOW() ORDER BY deleted_at DESC", [user.id]);
    return json({ albums });
  }

  if (route === "media/storage-summary") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const totals = await query<any>("SELECT COUNT(*) FILTER (WHERE deleted_at IS NULL)::integer AS \"activeCount\",COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::integer AS \"trashCount\",COALESCE(SUM(size_bytes) FILTER (WHERE deleted_at IS NULL),0)::bigint AS \"activeBytes\",COALESCE(SUM(size_bytes) FILTER (WHERE deleted_at IS NOT NULL),0)::bigint AS \"trashBytes\",COUNT(*) FILTER (WHERE content_type LIKE $$video/%$$ AND deleted_at IS NULL)::integer AS \"videoCount\",COUNT(*) FILTER (WHERE content_type LIKE $$image/%$$ AND deleted_at IS NULL)::integer AS \"imageCount\" FROM media_objects WHERE user_id=$1", [user.id]);
    const albums = await query("SELECT COALESCE(j.album_name,$$Unassigned$$) AS \"albumName\",COUNT(*)::integer AS count,COALESCE(SUM(m.size_bytes),0)::bigint AS bytes FROM media_objects m LEFT JOIN LATERAL (SELECT album_name FROM media_import_jobs WHERE media_object_id=m.id AND album_name IS NOT NULL ORDER BY created_at DESC LIMIT 1) j ON TRUE WHERE m.user_id=$1 AND m.deleted_at IS NULL GROUP BY COALESCE(j.album_name,$$Unassigned$$) ORDER BY bytes DESC LIMIT 25", [user.id]);
    const total = totals[0] || {};
    const billableBytes = Number(total.activeBytes || 0) + Number(total.trashBytes || 0);
    const account = await query<any>("SELECT plan_code AS plan,storage_quota_bytes AS \"quotaBytes\" FROM users WHERE id=$1", [user.id]);
    return json({ totals: total, albums, plan: account[0]?.plan || "starter", quotaBytes: Number(account[0]?.quotaBytes || 5368709120), estimatedMonthlyStorageUsd: Number((billableBytes / 1024 ** 3 * Number(process.env.R2_STORAGE_COST_PER_GB || 0.015)).toFixed(2)), estimateOnly: true });
  }

  if (route === "account") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const account = await query<any>("SELECT id,name,email,role,plan_code AS plan,storage_quota_bytes AS \"quotaBytes\",email_verified_at AS \"emailVerifiedAt\",created_at AS \"createdAt\" FROM users WHERE id=$1", [user.id]);
    const sessions = await query("SELECT id,user_agent AS \"userAgent\",ip_address AS \"ipAddress\",created_at AS \"createdAt\",last_seen_at AS \"lastSeenAt\",expires_at AS \"expiresAt\" FROM sessions WHERE user_id=$1 AND expires_at>NOW() ORDER BY last_seen_at DESC", [user.id]);
    const providers = await query("SELECT provider,account_email AS email,created_at AS \"connectedAt\" FROM media_provider_connections WHERE user_id=$1 AND status=$$active$$", [user.id]);
    return json({ account: account[0], sessions, providers });
  }

  if (route === "account/export") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const snapshot = await query<any>("SELECT data,revision,updated_at AS \"updatedAt\" FROM vault_snapshots WHERE user_id=$1", [user.id]);
    const media = await query("SELECT id,original_name AS name,content_type AS \"contentType\",size_bytes AS size,source_provider AS provider,created_at AS \"createdAt\" FROM media_objects WHERE user_id=$1 AND deleted_at IS NULL", [user.id]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type) VALUES($1,$2,$3)", [user.id,"account.exported","user"]);
    return json({ exportedAt: new Date().toISOString(), user, vault: snapshot[0] || null, media });
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
  if (route === "media/status") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const ids = (new URL(request.url).searchParams.get("ids") || "").split(",").filter(Boolean).slice(0, 200);
    if (!ids.length) return json({ media: [] });
    const media = await query("SELECT id,processing_status AS \"processingStatus\",processing_error AS \"processingError\",thumbnail_object_key IS NOT NULL AS \"hasThumbnail\" FROM media_objects WHERE user_id=$1 AND id=ANY($2::text[])", [user.id, ids]);
    return json({ media });
  }

  if (route.startsWith("media/") && route.endsWith("/thumbnail")) {
    if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const mediaId = route.split("/")[1];
      const rows = await query<{ thumbnail_object_key: string; thumbnail_variants: Record<string, string> }>("SELECT thumbnail_object_key,thumbnail_variants FROM media_objects WHERE id=$1 AND user_id=$2 AND status=$3 AND deleted_at IS NULL AND thumbnail_object_key IS NOT NULL LIMIT 1", [mediaId, user.id, "ready"]);
      if (!rows[0]) return json({ error: "Video thumbnail not found." }, 404);
      const { client, GetObjectCommand } = await r2Modules();
      const requestedSize = new URL(request.url).searchParams.get("size") || "large";
      const key = rows[0].thumbnail_variants?.[requestedSize] || rows[0].thumbnail_object_key;
      const object = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
      const responseBody = object.Body?.transformToWebStream ? object.Body.transformToWebStream() : object.Body;
      return new Response(responseBody, { headers: { "Content-Type": object.ContentType || "image/jpeg", "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" } });
    } catch (error) { console.error("R2 thumbnail read failed", error); return json({ error: "Video thumbnail is temporarily unavailable." }, 502); }
  }

  if (route.startsWith("media/") && route.split("/").length === 2) {
    if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const mediaId = route.split("/")[1];
      const quality = new URL(request.url).searchParams.get("quality") === "mobile" ? "mobile" : "standard";
      const rows = await query<{ object_key: string; content_type: string; original_name: string }>("SELECT COALESCE(CASE WHEN $4=$$mobile$$ THEN playback_variants->>$$mobile$$ END,playback_object_key,object_key) AS object_key,CASE WHEN playback_object_key IS NOT NULL THEN $$video/mp4$$ ELSE content_type END AS content_type,original_name FROM media_objects WHERE id=$1 AND user_id=$2 AND status=$3 AND deleted_at IS NULL LIMIT 1", [mediaId, user.id, "ready", quality]);
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

  if (["auth/register", "auth/login", "auth/logout", "auth/request-reset", "auth/reset-password", "auth/request-verification", "auth/verify-email", "account/profile", "account/password", "account/session/revoke", "account/delete", "vault/sync", "media/presign", "media/complete", "media/trash", "media/restore", "media/trash-album", "media/restore-album", "media/purge-album", "media/thumbnail/select", "integrations/google/import", "integrations/google/disconnect", "import-jobs/queue-drive", "integrations/google-photos/session", "integrations/google-photos/queue", "import-jobs/cancel", "import-jobs/retry", "import-jobs/session-action", "import-jobs/acknowledge"].includes(route) && !sameOrigin(request)) return json({ error: "Cross-site request rejected." }, 403);

  const accountResponse = await accountPost(route, request, body);
  if (accountResponse) return accountResponse;

  if (route === "import-jobs/acknowledge") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    await acknowledgeImportJobs(user.id, Array.isArray(body.ids) ? body.ids : []);
    return json({ success: true });
  }

  if (route === "import-jobs/session-action") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const albumName = String(body.albumName || "").slice(0,200);
    const action = String(body.action || "");
    if (!albumName || !["retry","cancel","resume"].includes(action)) return json({ error: "Invalid import-session action." }, 400);
    let result: any[] = [];
    if (action === "cancel") result = await query("UPDATE media_import_jobs SET status=CASE WHEN status=$$queued$$ THEN $$cancelled$$ ELSE $$cancel_requested$$ END,updated_at=NOW() WHERE user_id=$1 AND album_name=$2 AND status IN ($$queued$$,$$transferring$$) RETURNING id", [user.id, albumName]);
    else result = await query("UPDATE media_import_jobs SET status=$$queued$$,attempts=0,error_message=NULL,next_attempt_at=NOW(),updated_at=NOW() WHERE user_id=$1 AND album_name=$2 AND status IN ($$failed$$,$$cancelled$$) RETURNING id", [user.id, albumName]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type,metadata) VALUES($1,$2,$3,$4::jsonb)", [user.id,"import.session_"+action,"media_import_job",JSON.stringify({ albumName,count: result.length })]);
    return json({ success: true, count: result.length });
  }

  if (route === "import-jobs/cancel" || route === "import-jobs/retry") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      const job = route.endsWith("cancel") ? await cancelImportJob(user.id, String(body.id || "")) : await retryImportJob(user.id, String(body.id || ""));
      return json({ job });
    } catch (error: any) { return json({ error: "The import job could not be updated.", code: error?.message || "JOB_UPDATE_FAILED" }, 409); }
  }

  if (route === "internal/import-worker") {
    if (!process.env.IMPORT_WORKER_SECRET || request.headers.get("authorization") !== "Bearer " + process.env.IMPORT_WORKER_SECRET.trim()) return json({ error: "Unauthorized." }, 401);
    return json(startImportWorker());
  }

  if (route === "import-jobs/queue-drive" || route === "integrations/google-photos/session" || route === "integrations/google-photos/queue") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      if (route === "import-jobs/queue-drive") return json(await queueDriveJobs(user.id, Array.isArray(body.fileIds) ? body.fileIds : [], String(body.albumName || "")));
      if (route === "integrations/google-photos/session") return json(await createPhotosSession(user.id, String(body.albumName || "")));
      return json(await queuePhotosItems(user.id, String(body.sessionId || "")));
    } catch (error: any) { return json({ error: "The provider request could not be completed.", code: error?.message || "PROVIDER_ERROR" }, 502); }
  }

  if (route === "integrations/google/import") {
    try {
      const user = await authenticatedUser(request);
      if (!user) return json({ error: "Authentication required." }, 401);
      if (!r2Configured()) return json({ error: "Cloudflare R2 is not configured.", code: "R2_NOT_CONFIGURED" }, 503);
      const result = await queueDriveJobs(user.id, Array.isArray(body.fileIds) ? body.fileIds : [], String(body.albumName || ""));
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

  if (route === "media/thumbnail/select") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const mediaId = String(body.mediaId || "");
    const second = Math.max(0, Math.min(36000, Number(body.second || 0)));
    const updated = await query("UPDATE media_objects SET preferred_poster_second=$1,processing_status=$$queued$$,processing_error=NULL WHERE id=$2 AND user_id=$3 AND content_type LIKE $$video/%$$ AND deleted_at IS NULL RETURNING id", [second, mediaId, user.id]);
    if (!updated.length) return json({ error: "Video not found." }, 404);
    await execute("UPDATE media_processing_jobs SET status=$$queued$$,attempts=0,next_attempt_at=NOW(),error_message=NULL,updated_at=NOW() WHERE media_object_id=$1 AND user_id=$2", [mediaId, user.id]);
    return json({ success: true, second });
  }

  if (route === "media/trash" || route === "media/restore") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const ids = Array.isArray(body.mediaIds) ? body.mediaIds.map(String).slice(0, 500) : [];
    if (!ids.length) return json({ success: true, count: 0 });
    if (route === "media/restore") {
      const restored = await query("UPDATE media_objects SET deleted_at=NULL,purge_after=NULL WHERE user_id=$1 AND id=ANY($2::text[]) AND purge_after>NOW() RETURNING id", [user.id, ids]);
      return json({ success: true, count: restored.length });
    }
    const trashed = await query("UPDATE media_objects SET deleted_at=NOW(),purge_after=NOW()+INTERVAL $$30 days$$ WHERE user_id=$1 AND id=ANY($2::text[]) AND deleted_at IS NULL RETURNING id", [user.id, ids]);
    await execute("UPDATE media_import_jobs SET status=$$cancelled$$,updated_at=NOW() WHERE user_id=$1 AND media_object_id=ANY($2::text[]) AND status IN ($$queued$$,$$transferring$$,$$cancel_requested$$)", [user.id, ids]);
    return json({ success: true, count: trashed.length, purgeAfterDays: 30 });
  }

  if (route === "media/trash-album") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const albumName = String(body.albumName || "").trim().slice(0, 255);
    const mediaIds = Array.isArray(body.mediaIds) ? body.mediaIds.map(String).slice(0, 500) : [];
    const items = Array.isArray(body.items) ? body.items.slice(0, 500) : [];
    if (!albumName || !items.length) return json({ error: "Album name and items are required." }, 400);
    const id = crypto.randomUUID();
    await execute("INSERT INTO deleted_albums(id,user_id,album_name,item_snapshot,media_ids) VALUES($1,$2,$3,$4::jsonb,$5::text[])", [id, user.id, albumName, JSON.stringify(items), mediaIds]);
    if (mediaIds.length) await execute("UPDATE media_objects SET deleted_at=NOW(),purge_after=NOW()+INTERVAL $$30 days$$ WHERE user_id=$1 AND id=ANY($2::text[]) AND deleted_at IS NULL", [user.id, mediaIds]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5::jsonb)",[user.id,"album.trashed","album",id,JSON.stringify({albumName,itemCount:items.length})]);
    return json({ success: true, id, purgeAfterDays: 30 });
  }

  if (route === "media/restore-album" || route === "media/purge-album") {
    const user = await authenticatedUser(request);
    if (!user) return json({ error: "Authentication required." }, 401);
    const id = String(body.id || "");
    const rows = await query<any>("SELECT item_snapshot AS items,media_ids AS \"mediaIds\" FROM deleted_albums WHERE id=$1 AND user_id=$2 AND restored_at IS NULL AND permanently_deleted_at IS NULL AND purge_after>NOW()", [id, user.id]);
    if (!rows[0]) return json({ error: "Recycle-bin album not found or expired." }, 404);
    if (route === "media/restore-album") {
      if (rows[0].mediaIds?.length) await execute("UPDATE media_objects SET deleted_at=NULL,purge_after=NULL WHERE user_id=$1 AND id=ANY($2::text[])", [user.id, rows[0].mediaIds]);
      await execute("UPDATE deleted_albums SET restored_at=NOW() WHERE id=$1 AND user_id=$2", [id, user.id]);
      await execute("INSERT INTO audit_events(user_id,event_type,entity_type,entity_id) VALUES($1,$2,$3,$4)",[user.id,"album.restored","album",id]);
      return json({ success: true, items: rows[0].items || [] });
    }
    if (rows[0].mediaIds?.length) await execute("UPDATE media_objects SET purge_after=NOW() WHERE user_id=$1 AND id=ANY($2::text[])", [user.id, rows[0].mediaIds]);
    await execute("UPDATE deleted_albums SET permanently_deleted_at=NOW() WHERE id=$1 AND user_id=$2", [id, user.id]);
    await execute("INSERT INTO audit_events(user_id,event_type,entity_type,entity_id) VALUES($1,$2,$3,$4)",[user.id,"album.purged","album",id]);
    return json({ success: true });
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
      const quota = await query<any>("SELECT u.storage_quota_bytes AS quota,COALESCE(SUM(m.size_bytes) FILTER (WHERE m.deleted_at IS NULL),0)::bigint AS used FROM users u LEFT JOIN media_objects m ON m.user_id=u.id WHERE u.id=$1 GROUP BY u.storage_quota_bytes", [user.id]);
      if (Number(quota[0]?.used || 0) + size > Number(quota[0]?.quota || 5368709120)) return json({ error: "This upload would exceed your storage plan. Remove media or upgrade your storage allowance.", code: "STORAGE_QUOTA_EXCEEDED", usedBytes: Number(quota[0]?.used || 0), quotaBytes: Number(quota[0]?.quota || 5368709120) }, 413);
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
      const rows = await query<{ object_key: string; size_bytes: number; content_type: string }>("SELECT object_key,size_bytes,content_type FROM media_objects WHERE id=$1 AND user_id=$2 AND status=$3 LIMIT 1", [mediaId, user.id, "pending"]);
      if (!rows[0]) return json({ error: "Pending media upload not found." }, 404);
      const { client, HeadObjectCommand } = await r2Modules();
      const object = await client.send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: rows[0].object_key }));
      if (Number(object.ContentLength || 0) !== Number(rows[0].size_bytes)) return json({ error: "Uploaded file size did not match authorization." }, 409);
      await execute("UPDATE media_objects SET status = $1, etag = $2, completed_at = NOW() WHERE id = $3 AND user_id = $4", ["ready", object.ETag || null, mediaId, user.id]);
      if (rows[0].content_type.startsWith("video/")) await queueMediaProcessing(user.id, mediaId);
      return json({ success: true, mediaId, mediaUrl: "/api/media/" + mediaId });
    } catch (error) { console.error("R2 upload completion failed", error); return json({ error: "Unable to verify media upload." }, 502); }
  }

  if (route === "auth/register") {
    if (!(await rateLimit(request,"register",5,60))) return json({ error: "Too many registration attempts. Try again later." },429);
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
    if (!(await rateLimit(request,"login",10,15))) return json({ error: "Too many login attempts. Try again in 15 minutes." },429);
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
