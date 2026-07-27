import { execute, query } from "./db";
import { googleAccess } from "./googleDrive";
import { mediaTypeAllowed } from "./r2";

const API = "https://photospicker.googleapis.com/v1";

export async function createPhotosSession(userId: string) {
  const auth = await googleAccess(userId);
  const response = await fetch(API + "/sessions", { method: "POST", headers: { Authorization: "Bearer " + auth.token, "Content-Type": "application/json" }, body: "{}" });
  const session: any = await response.json();
  if (!response.ok || !session.id || !session.pickerUri) throw new Error("GOOGLE_PHOTOS_SCOPE_REQUIRED");
  const id = crypto.randomUUID();
  await execute("INSERT INTO provider_picker_sessions (id,user_id,provider_connection_id,provider_session_id,picker_uri) VALUES ($1,$2,$3,$4,$5)", [id, userId, auth.connectionId, session.id, session.pickerUri]);
  return { id, pickerUri: session.pickerUri + "/autoclose", pollingConfig: session.pollingConfig || null };
}

export async function pollPhotosSession(userId: string, id: string) {
  const rows = await query<{ provider_session_id: string }>("SELECT provider_session_id FROM provider_picker_sessions WHERE id=$1 AND user_id=$2 AND expires_at>NOW()", [id, userId]);
  if (!rows[0]) throw new Error("PHOTOS_SESSION_NOT_FOUND");
  const auth = await googleAccess(userId);
  const response = await fetch(API + "/sessions/" + encodeURIComponent(rows[0].provider_session_id), { headers: { Authorization: "Bearer " + auth.token } });
  const raw = await response.text();
  let session: any = {};
  try { session = raw ? JSON.parse(raw) : {}; } catch { session = {}; }
  if (!response.ok) throw new Error("PHOTOS_SESSION_HTTP_" + response.status + "_" + String(session.error?.status || "UNKNOWN"));
  return { ready: Boolean(session.mediaItemsSet), pollingConfig: session.pollingConfig || null };
}

export async function queuePhotosItems(userId: string, id: string) {
  const rows = await query<{ provider_session_id: string; provider_connection_id: string }>("SELECT provider_session_id,provider_connection_id FROM provider_picker_sessions WHERE id=$1 AND user_id=$2 AND expires_at>NOW()", [id, userId]);
  if (!rows[0]) throw new Error("PHOTOS_SESSION_NOT_FOUND");
  const auth = await googleAccess(userId);
  const items: any[] = [];
  let pageToken = "";
  do {
    const params = new URLSearchParams({ sessionId: rows[0].provider_session_id, pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(API + "/mediaItems?" + params, { headers: { Authorization: "Bearer " + auth.token } });
    const body: any = await response.json();
    if (!response.ok) throw new Error("PHOTOS_ITEMS_FAILED");
    items.push(...(body.mediaItems || []));
    pageToken = body.nextPageToken || "";
  } while (pageToken && items.length < 500);
  const jobs: any[] = [];
  for (const item of items.slice(0,500)) {
    const file = item.mediaFile || {};
    const itemType = String(item.type || "").toUpperCase();
    const reportedMimeType = String(file.mimeType || "").toLowerCase().split(";", 1)[0].trim();
    const isVideo = itemType === "VIDEO" || reportedMimeType.startsWith("video/") || Boolean(file.mediaFileMetadata?.videoMetadata);
    const mimeType = isVideo ? (reportedMimeType.startsWith("video/") ? reportedMimeType : "video/mp4") : (reportedMimeType || (itemType === "PHOTO" ? "image/jpeg" : ""));
    if (!item.id || !mediaTypeAllowed(mimeType)) continue;
    const jobId = crypto.randomUUID();
    const name = String(file.filename || (isVideo ? "Google Photos video" : "Google Photos media")).slice(0,255);
    if (isVideo && !file.baseUrl) {
      const error = "Google Photos did not provide a downloadable URL. Wait until the video plays in Google Photos, then select it again.";
      await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status,provider_payload,error_message) VALUES ($1,$2,$3,$4,$5,$$failed$$,$6::jsonb,$7) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$failed$$,provider_payload=EXCLUDED.provider_payload,error_message=EXCLUDED.error_message,bytes_transferred=0,progress=0,media_object_id=NULL,started_at=NULL,completed_at=NULL,delivered_at=NULL,updated_at=NOW()", [jobId, userId, rows[0].provider_connection_id, "photos:" + item.id, name, JSON.stringify({ provider: "google-photos", mimeType, type: item.type }), error]);
      jobs.push({ id: jobId, name, mimeType, provider: "google-photos", status: "failed", progress: 0, error });
      continue;
    }
    if (!file.baseUrl) continue;
    await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status,provider_payload) VALUES ($1,$2,$3,$4,$5,$$queued$$,$6::jsonb) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$queued$$,provider_payload=EXCLUDED.provider_payload,bytes_transferred=0,progress=0,error_message=NULL,media_object_id=NULL,started_at=NULL,completed_at=NULL,delivered_at=NULL,updated_at=NOW()", [jobId, userId, rows[0].provider_connection_id, "photos:" + item.id, name, JSON.stringify({ provider: "google-photos", baseUrl: file.baseUrl, mimeType: mimeType, type: item.type, createTime: item.createTime || null, videoProcessingStatus: file.mediaFileMetadata?.videoMetadata?.processingStatus || null })]);
    jobs.push({ id: jobId, name, mimeType, status: "queued", progress: 0 });
  }
  await execute("UPDATE provider_picker_sessions SET status=$$queued$$,updated_at=NOW() WHERE id=$1", [id]);
  await fetch(API + "/sessions/" + encodeURIComponent(rows[0].provider_session_id), { method: "DELETE", headers: { Authorization: "Bearer " + auth.token } }).catch(() => undefined);
  return { jobs };
}
