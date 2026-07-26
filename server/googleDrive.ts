import { execute, query } from "./db";
import { mediaTypeAllowed, r2Bucket, r2Modules, safeObjectName } from "./r2";

const API = "https://www.googleapis.com/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPES = ["openid", "email", "profile", "https://www.googleapis.com/auth/drive.readonly"];
const MAX_BYTES = 100 * 1024 * 1024;

const env = (name: string) => process.env[name]?.trim();

function base64(bytes: Uint8Array) {
  let text = "";
  bytes.forEach(byte => { text += String.fromCharCode(byte); });
  return btoa(text).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unbase64(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const text = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(text, char => char.charCodeAt(0));
}

async function digest(value: string) {
  return base64(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
}

async function encryptionKey() {
  const secret = env("MEDIA_PROVIDER_TOKEN_KEY");
  if (!secret) throw new Error("PROVIDER_TOKEN_KEY_NOT_CONFIGURED");
  const key = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", key, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(), new TextEncoder().encode(value));
  return base64(iv) + "." + base64(new Uint8Array(ciphertext));
}

async function decrypt(value: string) {
  const [iv, ciphertext] = value.split(".");
  if (!iv || !ciphertext) throw new Error("INVALID_PROVIDER_TOKEN");
  const clear = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unbase64(iv) }, await encryptionKey(), unbase64(ciphertext));
  return new TextDecoder().decode(clear);
}

function origin(request: Request) {
  if (env("APP_BASE_URL")) return env("APP_BASE_URL")!.replace(/\/+$/, "");
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  const protocol = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  return protocol + "://" + host;
}

export const googleDriveConfigured = () =>
  Boolean(env("GOOGLE_CLIENT_ID") && env("GOOGLE_CLIENT_SECRET") && env("MEDIA_PROVIDER_TOKEN_KEY"));

export const googleRedirectUri = (request: Request) =>
  origin(request) + "/api/integrations/google/callback";

export async function googleConnectionStatus(userId: string, request: Request) {
  const rows = await query<{ account_email: string | null; display_name: string | null; status: string }>(
    "SELECT account_email,display_name,status FROM media_provider_connections WHERE user_id=$1 AND provider=$2 ORDER BY updated_at DESC LIMIT 1",
    [userId, "google-drive"],
  );
  return {
    provider: "google-drive",
    configured: googleDriveConfigured(),
    connected: rows[0]?.status === "active",
    accountEmail: rows[0]?.account_email || null,
    displayName: rows[0]?.display_name || null,
    redirectUri: googleRedirectUri(request),
  };
}

export async function createGoogleAuthorization(userId: string, request: Request) {
  if (!googleDriveConfigured()) throw new Error("GOOGLE_DRIVE_NOT_CONFIGURED");
  const state = base64(crypto.getRandomValues(new Uint8Array(32)));
  await execute("DELETE FROM provider_oauth_states WHERE expires_at<=NOW()");
  await execute("INSERT INTO provider_oauth_states (state_hash,user_id,provider,expires_at) VALUES ($1,$2,$3,NOW()+INTERVAL $$10 minutes$$)", [await digest(state), userId, "google-drive"]);
  const params = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID")!,
    redirect_uri: googleRedirectUri(request),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: SCOPES.join(" "),
    state,
  });
  return "https://accounts.google.com/o/oauth2/v2/auth?" + params;
}

export async function completeGoogleAuthorization(code: string, state: string, request: Request) {
  const states = await query<{ user_id: string }>("DELETE FROM provider_oauth_states WHERE state_hash=$1 AND provider=$2 AND expires_at>NOW() RETURNING user_id", [await digest(state), "google-drive"]);
  if (!states[0]) throw new Error("INVALID_OAUTH_STATE");
  const tokenResponse = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID")!, client_secret: env("GOOGLE_CLIENT_SECRET")!, code, grant_type: "authorization_code", redirect_uri: googleRedirectUri(request) }),
  });
  const tokens: any = await tokenResponse.json();
  if (!tokenResponse.ok || !tokens.access_token) throw new Error("GOOGLE_TOKEN_EXCHANGE_FAILED");
  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + tokens.access_token } });
  const profile: any = await profileResponse.json();
  if (!profileResponse.ok || !profile.sub) throw new Error("GOOGLE_PROFILE_FAILED");
  const existing = await query<{ id: string; encrypted_refresh_token: string | null }>("SELECT id,encrypted_refresh_token FROM media_provider_connections WHERE user_id=$1 AND provider=$2 AND provider_account_id=$3", [states[0].user_id, "google-drive", profile.sub]);
  const id = existing[0]?.id || crypto.randomUUID();
  const refresh = tokens.refresh_token ? await encrypt(tokens.refresh_token) : existing[0]?.encrypted_refresh_token || null;
  await execute(
    "INSERT INTO media_provider_connections (id,user_id,provider,provider_account_id,account_email,display_name,encrypted_access_token,encrypted_refresh_token,token_expires_at,scopes,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()+($9*INTERVAL $$1 second$$),$10,$$active$$) ON CONFLICT (user_id,provider,provider_account_id) DO UPDATE SET account_email=EXCLUDED.account_email,display_name=EXCLUDED.display_name,encrypted_access_token=EXCLUDED.encrypted_access_token,encrypted_refresh_token=EXCLUDED.encrypted_refresh_token,token_expires_at=EXCLUDED.token_expires_at,scopes=EXCLUDED.scopes,status=$$active$$,updated_at=NOW()",
    [id, states[0].user_id, "google-drive", profile.sub, profile.email || null, profile.name || null, await encrypt(tokens.access_token), refresh, Number(tokens.expires_in || 3600), String(tokens.scope || SCOPES.join(" ")).split(" ")],
  );
  await execute("INSERT INTO audit_events (user_id,event_type,entity_type,entity_id) VALUES ($1,$2,$3,$4)", [states[0].user_id, "provider.connected", "media_provider_connection", id]);
}

interface Connection {
  id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string | null;
  token_expires_at: string | null;
}

async function access(userId: string) {
  const rows = await query<Connection>("SELECT id,encrypted_access_token,encrypted_refresh_token,token_expires_at FROM media_provider_connections WHERE user_id=$1 AND provider=$2 AND status=$$active$$ ORDER BY updated_at DESC LIMIT 1", [userId, "google-drive"]);
  const row = rows[0];
  if (!row) throw new Error("GOOGLE_DRIVE_NOT_CONNECTED");
  if (row.token_expires_at && new Date(row.token_expires_at).getTime() > Date.now() + 60_000) {
    return { connectionId: row.id, token: await decrypt(row.encrypted_access_token) };
  }
  if (!row.encrypted_refresh_token) throw new Error("GOOGLE_REAUTH_REQUIRED");
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: env("GOOGLE_CLIENT_ID")!, client_secret: env("GOOGLE_CLIENT_SECRET")!, refresh_token: await decrypt(row.encrypted_refresh_token), grant_type: "refresh_token" }),
  });
  const body: any = await response.json();
  if (!response.ok || !body.access_token) throw new Error("GOOGLE_REAUTH_REQUIRED");
  await execute("UPDATE media_provider_connections SET encrypted_access_token=$1,token_expires_at=NOW()+($2*INTERVAL $$1 second$$),updated_at=NOW() WHERE id=$3", [await encrypt(body.access_token), Number(body.expires_in || 3600), row.id]);
  return { connectionId: row.id, token: body.access_token as string };
}

export async function listGoogleMedia(userId: string, pageToken?: string | null) {
  const auth = await access(userId);
  const params = new URLSearchParams({
    q: "trashed = false and (mimeType contains 'image/' or mimeType contains 'video/')",
    orderBy: "modifiedTime desc",
    pageSize: "60",
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis))",
  });
  if (pageToken) params.set("pageToken", pageToken);
  const response = await fetch(API + "/files?" + params, { headers: { Authorization: "Bearer " + auth.token } });
  const body: any = await response.json();
  if (!response.ok) throw new Error("GOOGLE_DRIVE_LIST_FAILED");
  return {
    files: (body.files || []).map((file: any) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size || 0),
      createdTime: file.createdTime || null,
      modifiedTime: file.modifiedTime || null,
      width: Number(file.imageMediaMetadata?.width || file.videoMediaMetadata?.width || 0) || null,
      height: Number(file.imageMediaMetadata?.height || file.videoMediaMetadata?.height || 0) || null,
      thumbnailUrl: "/api/integrations/google/thumbnail/" + encodeURIComponent(file.id),
    })),
    nextPageToken: body.nextPageToken || null,
  };
}

export async function googleThumbnail(userId: string, fileId: string) {
  const auth = await access(userId);
  const metadataResponse = await fetch(API + "/files/" + encodeURIComponent(fileId) + "?fields=thumbnailLink", { headers: { Authorization: "Bearer " + auth.token } });
  const metadata: any = await metadataResponse.json();
  if (!metadataResponse.ok || !metadata.thumbnailLink) throw new Error("GOOGLE_THUMBNAIL_FAILED");
  const response = await fetch(metadata.thumbnailLink, { headers: { Authorization: "Bearer " + auth.token } });
  if (!response.ok || !response.body) throw new Error("GOOGLE_THUMBNAIL_FAILED");
  return new Response(response.body, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=300" } });
}

export async function importGoogleMedia(userId: string, ids: string[]) {
  const auth = await access(userId);
  const imported: any[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const fileId of Array.from(new Set(ids.map(String))).slice(0, 25)) {
    const jobId = crypto.randomUUID();
    try {
      const metadataResponse = await fetch(API + "/files/" + encodeURIComponent(fileId) + "?fields=id,name,mimeType,size,createdTime", { headers: { Authorization: "Bearer " + auth.token } });
      const file: any = await metadataResponse.json();
      const size = Number(file.size || 0);
      if (!metadataResponse.ok || !file.id) throw new Error("FILE_NOT_FOUND");
      if (!mediaTypeAllowed(file.mimeType) || size < 1 || size > MAX_BYTES) throw new Error("UNSUPPORTED_FILE");
      const previous = await query<{ media_object_id: string }>("SELECT media_object_id FROM media_import_jobs WHERE user_id=$1 AND provider_connection_id=$2 AND provider_file_id=$3 AND status=$$complete$$", [userId, auth.connectionId, fileId]);
      if (previous[0]?.media_object_id) {
        imported.push({ id: fileId, name: file.name, mimeType: file.mimeType, size, mediaId: previous[0].media_object_id, mediaUrl: "/api/media/" + previous[0].media_object_id, duplicate: true });
        continue;
      }
      await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status) VALUES ($1,$2,$3,$4,$5,$$transferring$$) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$transferring$$,error_message=NULL", [jobId, userId, auth.connectionId, fileId, String(file.name).slice(0, 255)]);
      const download = await fetch(API + "/files/" + encodeURIComponent(fileId) + "?alt=media", { headers: { Authorization: "Bearer " + auth.token } });
      if (!download.ok) throw new Error("DOWNLOAD_FAILED");
      const bytes = new Uint8Array(await download.arrayBuffer());
      if (bytes.byteLength !== size) throw new Error("DOWNLOAD_SIZE_MISMATCH");
      const mediaId = crypto.randomUUID();
      const objectKey = userId + "/" + mediaId + "-" + safeObjectName(file.name);
      await execute("INSERT INTO media_objects (id,user_id,object_key,original_name,content_type,size_bytes,status,source_provider,source_id) VALUES ($1,$2,$3,$4,$5,$6,$$pending$$,$7,$8)", [mediaId, userId, objectKey, String(file.name).slice(0, 255), file.mimeType, size, "google-drive", fileId]);
      const { client, PutObjectCommand } = await r2Modules();
      const result = await client.send(new PutObjectCommand({ Bucket: r2Bucket(), Key: objectKey, Body: bytes, ContentType: file.mimeType }));
      await execute("UPDATE media_objects SET status=$$ready$$,etag=$1,completed_at=NOW() WHERE id=$2", [result.ETag || null, mediaId]);
      await execute("UPDATE media_import_jobs SET status=$$complete$$,media_object_id=$1,completed_at=NOW() WHERE id=$2", [mediaId, jobId]);
      imported.push({ id: fileId, name: file.name, mimeType: file.mimeType, size, mediaId, mediaUrl: "/api/media/" + mediaId, createdTime: file.createdTime || null });
    } catch (error: any) {
      const message = String(error?.message || "IMPORT_FAILED").slice(0, 500);
      await execute("UPDATE media_import_jobs SET status=$$failed$$,error_message=$1,completed_at=NOW() WHERE id=$2", [message, jobId]).catch(() => undefined);
      failed.push({ id: fileId, error: message });
    }
  }
  await execute("INSERT INTO audit_events (user_id,event_type,entity_type,metadata) VALUES ($1,$2,$3,$4::jsonb)", [userId, "provider.media_imported", "media_import_job", JSON.stringify({ provider: "google-drive", imported: imported.length, failed: failed.length })]);
  return { imported, failed };
}

export async function disconnectGoogleDrive(userId: string) {
  const rows = await query<{ encrypted_access_token: string }>("SELECT encrypted_access_token FROM media_provider_connections WHERE user_id=$1 AND provider=$2 AND status=$$active$$", [userId, "google-drive"]);
  for (const row of rows) {
    try { await fetch("https://oauth2.googleapis.com/revoke?token=" + encodeURIComponent(await decrypt(row.encrypted_access_token)), { method: "POST" }); } catch {}
  }
  await execute("UPDATE media_provider_connections SET status=$$revoked$$,encrypted_access_token=$$revoked$$,encrypted_refresh_token=NULL,updated_at=NOW() WHERE user_id=$1 AND provider=$2", [userId, "google-drive"]);
}
