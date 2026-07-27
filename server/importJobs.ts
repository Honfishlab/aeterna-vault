import { execute, query } from "./db";
import { googleAccess } from "./googleDrive";
import { mediaTypeAllowed, r2Bucket, r2Modules, safeObjectName } from "./r2";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const JOB_FIELDS = "id,provider_file_name AS name,status,progress,bytes_total AS \"bytesTotal\",bytes_transferred AS \"bytesTransferred\",media_object_id AS \"mediaId\",provider_payload->>$$mimeType$$ AS \"mimeType\",provider_payload->>$$provider$$ AS provider,error_message AS error,attempts,created_at AS \"createdAt\",started_at AS \"startedAt\",updated_at AS \"updatedAt\",delivered_at AS \"deliveredAt\"";
let lastCleanupAt = 0;
let workerBusy = false;

const googleMediaHost = (hostname: string) => hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com") || hostname === "googlevideo.com" || hostname.endsWith(".googlevideo.com") || hostname === "google.com" || hostname.endsWith(".google.com");

async function fetchGoogleMedia(url: string, token: string) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (current.protocol !== "https:" || !googleMediaHost(current.hostname)) throw new Error("UNTRUSTED_GOOGLE_MEDIA_REDIRECT");
    const response = await fetch(current, { headers: { Authorization: "Bearer " + token }, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (!location) throw new Error("GOOGLE_MEDIA_REDIRECT_MISSING_LOCATION");
    current = new URL(location, current);
  }
  throw new Error("GOOGLE_MEDIA_TOO_MANY_REDIRECTS");
}

export async function queueDriveJobs(userId: string, fileIds: string[]) {
  const auth = await googleAccess(userId);
  const jobs: any[] = [];
  for (const fileId of Array.from(new Set(fileIds.map(String))).slice(0, 25)) {
    const response = await fetch(DRIVE_API + "/files/" + encodeURIComponent(fileId) + "?fields=id,name,mimeType,size", { headers: { Authorization: "Bearer " + auth.token } });
    const file: any = await response.json();
    const size = Number(file.size || 0);
    if (!response.ok || !file.id || !mediaTypeAllowed(file.mimeType) || size < 1 || size > MAX_BYTES) continue;
    const existing = await query<any>("SELECT " + JOB_FIELDS + " FROM media_import_jobs WHERE user_id=$1 AND provider_connection_id=$2 AND provider_file_id=$3 AND status=$$complete$$", [userId, auth.connectionId, fileId]);
    if (existing[0]) { jobs.push({ ...existing[0], mimeType: file.mimeType, size }); continue; }
    const id = crypto.randomUUID();
    await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status,provider_payload,bytes_total) VALUES ($1,$2,$3,$4,$5,$$queued$$,$6::jsonb,$7) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$queued$$,provider_payload=EXCLUDED.provider_payload,attempts=0,bytes_total=EXCLUDED.bytes_total,bytes_transferred=0,progress=0,error_message=NULL,media_object_id=NULL,started_at=NULL,completed_at=NULL,delivered_at=NULL,updated_at=NOW()", [id, userId, auth.connectionId, fileId, String(file.name).slice(0,255), JSON.stringify({ provider: "google-drive", mimeType: file.mimeType }), size]);
    jobs.push({ id, name: file.name, mimeType: file.mimeType, size, status: "queued", progress: 0 });
  }
  return { jobs };
}

export async function jobStatus(userId: string, ids: string[]) {
  if (ids.length) return query("SELECT " + JOB_FIELDS + " FROM media_import_jobs WHERE user_id=$1 AND id=ANY($2::text[]) ORDER BY created_at", [userId, ids.slice(0,500)]);
  return query("SELECT " + JOB_FIELDS + " FROM media_import_jobs WHERE user_id=$1 AND (status IN ($$queued$$,$$transferring$$,$$cancel_requested$$) OR (status IN ($$failed$$,$$cancelled$$) AND updated_at>NOW()-INTERVAL $$7 days$$) OR (status=$$complete$$ AND delivered_at IS NULL)) ORDER BY created_at DESC LIMIT 100", [userId]);
}

export async function cancelImportJob(userId: string, id: string) {
  const rows = await query<any>("UPDATE media_import_jobs SET status=CASE WHEN status=$$queued$$ THEN $$cancelled$$ ELSE $$cancel_requested$$ END,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ($$queued$$,$$transferring$$) RETURNING " + JOB_FIELDS, [id, userId]);
  if (!rows[0]) throw new Error("JOB_NOT_CANCELLABLE");
  return rows[0];
}

export async function retryImportJob(userId: string, id: string) {
  const rows = await query<any>("UPDATE media_import_jobs SET status=$$queued$$,attempts=0,progress=0,bytes_transferred=0,error_message=NULL,started_at=NULL,completed_at=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ($$failed$$,$$cancelled$$) RETURNING " + JOB_FIELDS, [id, userId]);
  if (!rows[0]) throw new Error("JOB_NOT_RETRYABLE");
  return rows[0];
}

export async function acknowledgeImportJobs(userId: string, ids: string[]) {
  await execute("UPDATE media_import_jobs SET delivered_at=NOW(),updated_at=NOW() WHERE user_id=$1 AND id=ANY($2::text[]) AND status=$$complete$$", [userId, ids.slice(0,500)]);
}

export async function maintainImportQueue() {
  await execute("UPDATE media_import_jobs SET attempts=0,updated_at=NOW(),error_message=NULL WHERE status=$$queued$$ AND attempts>=3");
  await execute("UPDATE media_import_jobs SET status=CASE WHEN status=$$cancel_requested$$ THEN $$cancelled$$ ELSE $$queued$$ END,started_at=NULL,updated_at=NOW(),error_message=CASE WHEN status=$$transferring$$ THEN $$Recovered after an interrupted worker.$$ ELSE error_message END WHERE status IN ($$transferring$$,$$cancel_requested$$) AND updated_at<NOW()-INTERVAL $$10 minutes$$");
  if (Date.now() - lastCleanupAt < 5 * 60_000) return;
  lastCleanupAt = Date.now();
  const pending = await query<{ id: string; object_key: string }>("SELECT id,object_key FROM media_objects WHERE status=$$pending$$ AND created_at<NOW()-INTERVAL $$1 hour$$ LIMIT 100");
  const { client, DeleteObjectCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand } = await r2Modules();
  for (const object of pending) {
    await client.send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: object.object_key })).catch(() => undefined);
    await execute("DELETE FROM media_objects WHERE id=$1 AND status=$$pending$$", [object.id]);
  }
  const multipart = await client.send(new ListMultipartUploadsCommand({ Bucket: r2Bucket() }));
  const cutoff = Date.now() - 60 * 60_000;
  for (const upload of multipart.Uploads || []) {
    if (upload.Key && upload.UploadId && upload.Initiated && new Date(upload.Initiated).getTime() < cutoff) {
      await client.send(new AbortMultipartUploadCommand({ Bucket: r2Bucket(), Key: upload.Key, UploadId: upload.UploadId })).catch(() => undefined);
    }
  }
}

export function startImportWorker() {
  if (workerBusy) return { accepted: false, busy: true };
  workerBusy = true;
  void processNextImportJob()
    .catch(error => console.error("Background import failed", error))
    .finally(() => { workerBusy = false; });
  return { accepted: true, busy: false };
}

export async function processNextImportJob() {
  await maintainImportQueue();
  const rows = await query<any>("UPDATE media_import_jobs SET status=$$transferring$$,started_at=NOW(),attempts=attempts+1,progress=GREATEST(progress,1),updated_at=NOW() WHERE id=(SELECT id FROM media_import_jobs WHERE status=$$queued$$ AND attempts<3 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *");
  const job = rows[0];
  if (!job) return null;
  try {
    const auth = await googleAccess(job.user_id);
    const payload = job.provider_payload || {};
    let downloadUrl: string;
    const mimeType = payload.mimeType || "application/octet-stream";
    if (mimeType.startsWith("video/") && payload.videoProcessingStatus && payload.videoProcessingStatus !== "READY") {
      throw new Error("GOOGLE_VIDEO_NOT_READY_" + payload.videoProcessingStatus);
    }
    if (payload.provider === "google-photos") downloadUrl = payload.baseUrl + (mimeType.startsWith("video/") ? "=dv" : "=d");
    else downloadUrl = DRIVE_API + "/files/" + encodeURIComponent(job.provider_file_id) + "?alt=media";
    const download = payload.provider === "google-photos" ? await fetchGoogleMedia(downloadUrl, auth.token) : await fetch(downloadUrl, { headers: { Authorization: "Bearer " + auth.token } });
    if (!download.ok || !download.body) {
      if (payload.provider === "google-photos" && [401,403,404].includes(download.status)) throw new Error("PHOTOS_SELECTION_EXPIRED");
      throw new Error("DOWNLOAD_FAILED_HTTP_" + download.status + "_" + new URL(download.url || downloadUrl).hostname);
    }
    const total = Number(download.headers.get("content-length") || job.bytes_total || 0);
    if (total > MAX_BYTES) throw new Error("MEDIA_EXCEEDS_5_GB");
    await execute("UPDATE media_import_jobs SET bytes_total=$1,updated_at=NOW() WHERE id=$2", [total, job.id]);
    const mediaId = crypto.randomUUID();
    const objectKey = job.user_id + "/" + mediaId + "-" + safeObjectName(job.provider_file_name);
    await execute("DELETE FROM media_objects WHERE user_id=$1 AND source_provider=$2 AND source_id=$3 AND status=$$pending$$", [job.user_id, payload.provider, job.provider_file_id]);
    await execute("INSERT INTO media_objects (id,user_id,object_key,original_name,content_type,size_bytes,status,source_provider,source_id) VALUES ($1,$2,$3,$4,$5,$6,$$pending$$,$7,$8)", [mediaId, job.user_id, objectKey, job.provider_file_name, mimeType, total, payload.provider, job.provider_file_id]);
    const { client, Upload } = await r2Modules();
    const { Readable } = await import("node:stream");
    const upload = new Upload({ client, params: { Bucket: r2Bucket(), Key: objectKey, Body: Readable.fromWeb(download.body as any), ContentType: mimeType }, queueSize: 2, partSize: 8 * 1024 * 1024, leavePartsOnError: false });
    let lastProgress = 0;
    let lastReportedBytes = 0;
    upload.on("httpUploadProgress", (event: any) => {
      const loaded = Number(event.loaded || 0);
      const progress = total ? Math.min(99, Math.round(loaded / total * 100)) : Math.min(99, lastProgress + 1);
      if (progress >= lastProgress + 1 || loaded >= lastReportedBytes + 8 * 1024 * 1024) {
        lastProgress = Math.max(lastProgress, progress);
        lastReportedBytes = loaded;
        execute("UPDATE media_import_jobs SET bytes_transferred=$1,progress=$2,updated_at=NOW() WHERE id=$3", [loaded, progress, job.id]).catch(() => undefined);
      }
    });
    const cancellationTimer = setInterval(async () => {
      const state = await query<{ status: string }>("SELECT status FROM media_import_jobs WHERE id=$1", [job.id]);
      if (state[0]?.status === "cancel_requested") upload.abort();
      else await execute("UPDATE media_import_jobs SET updated_at=NOW() WHERE id=$1", [job.id]);
    }, 1000);
    const result = await upload.done().finally(() => clearInterval(cancellationTimer));
    await execute("UPDATE media_objects SET status=$$ready$$,etag=$1,size_bytes=CASE WHEN size_bytes>0 THEN size_bytes ELSE $2 END,completed_at=NOW() WHERE id=$3", [result.ETag || null, total, mediaId]);
    await execute("UPDATE media_import_jobs SET status=$$complete$$,media_object_id=$1,progress=100,bytes_transferred=bytes_total,completed_at=NOW(),updated_at=NOW() WHERE id=$2", [mediaId, job.id]);
    return { id: job.id, status: "complete" };
  } catch (error: any) {
    const state = await query<{ status: string }>("SELECT status FROM media_import_jobs WHERE id=$1", [job.id]);
    const cancelled = state[0]?.status === "cancel_requested";
    const expired = error?.message === "PHOTOS_SELECTION_EXPIRED";
    const videoNotReady = String(error?.message || "").startsWith("GOOGLE_VIDEO_NOT_READY_");
    const retry = !cancelled && !expired && !videoNotReady && Number(job.attempts || 0) < 3;
    const status = cancelled ? "cancelled" : retry ? "queued" : "failed";
    const message = expired ? "Google Photos selection expired. Select the items again." : videoNotReady ? "Google Photos is still processing this video. Wait until it plays in Google Photos, then select it again." : String(error?.message || "IMPORT_FAILED").slice(0,500);
    await execute("UPDATE media_import_jobs SET status=$1,error_message=$2,updated_at=NOW() WHERE id=$3", [status, message, job.id]);
    return { id: job.id, status };
  }
}
