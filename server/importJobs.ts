import { execute, query } from "./db";
import { googleAccess } from "./googleDrive";
import { mediaTypeAllowed, r2Bucket, r2Modules, safeObjectName } from "./r2";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_BYTES = 5 * 1024 * 1024 * 1024;
const JOB_FIELDS = "id,provider_file_name AS name,status,progress,bytes_total AS \"bytesTotal\",bytes_transferred AS \"bytesTransferred\",media_object_id AS \"mediaId\",provider_payload->>$$mimeType$$ AS \"mimeType\",provider_payload->>$$provider$$ AS provider,(provider_payload->>$$width$$)::integer AS width,(provider_payload->>$$height$$)::integer AS height,(provider_payload->>$$durationMillis$$)::bigint AS \"durationMs\",provider_payload->>$$createTime$$ AS \"createdTime\",EXISTS(SELECT 1 FROM media_objects mo WHERE mo.id=media_object_id AND mo.thumbnail_object_key IS NOT NULL) AS \"hasThumbnail\",error_message AS error,attempts,resume_offset AS \"resumeOffset\",created_at AS \"createdAt\",started_at AS \"startedAt\",updated_at AS \"updatedAt\",delivered_at AS \"deliveredAt\"";
let lastCleanupAt = 0;
let workerBusy = false;

const googleMediaHost = (hostname: string) => hostname === "googleusercontent.com" || hostname.endsWith(".googleusercontent.com") || hostname === "googlevideo.com" || hostname.endsWith(".googlevideo.com") || hostname === "google.com" || hostname.endsWith(".google.com");

async function fetchGoogleMedia(url: string, token: string, offset = 0) {
  let current = new URL(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (current.protocol !== "https:" || !googleMediaHost(current.hostname)) throw new Error("UNTRUSTED_GOOGLE_MEDIA_REDIRECT");
    const headers: Record<string, string> = { Authorization: "Bearer " + token };
    if (offset > 0) headers.Range = "bytes=" + offset + "-";
    const response = await fetch(current, { headers, redirect: "manual" });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get("location");
    await response.body?.cancel().catch(() => undefined);
    if (!location) throw new Error("GOOGLE_MEDIA_REDIRECT_MISSING_LOCATION");
    current = new URL(location, current);
  }
  throw new Error("GOOGLE_MEDIA_TOO_MANY_REDIRECTS");
}

async function persistVideoThumbnail(payload: any, token: string, userId: string, mediaId: string) {
  if (!String(payload.mimeType || "").startsWith("video/")) return null;
  let thumbnailUrl = payload.provider === "google-photos" && payload.baseUrl ? payload.baseUrl + "=w1280-h720-c" : "";
  if (payload.provider === "google-drive" && payload.sourceId) {
    const metadataResponse = await fetch(DRIVE_API + "/files/" + encodeURIComponent(payload.sourceId) + "?fields=thumbnailLink", { headers: { Authorization: "Bearer " + token } });
    const metadata: any = await metadataResponse.json();
    thumbnailUrl = metadata.thumbnailLink || "";
  }
  if (!thumbnailUrl) return null;
  const thumbnail = await fetchGoogleMedia(thumbnailUrl, token);
  if (!thumbnail.ok) return null;
  const body = new Uint8Array(await thumbnail.arrayBuffer());
  if (!body.length || body.length > 15 * 1024 * 1024) return null;
  const key = userId + "/" + mediaId + "-poster.jpg";
  const { client, PutObjectCommand } = await r2Modules();
  await client.send(new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: body, ContentType: thumbnail.headers.get("content-type") || "image/jpeg" }));
  return key;
}

async function uploadWithCheckpoints(download: Response, job: any, objectKey: string, mimeType: string, total: number) {
  const { client, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand } = await r2Modules();
  let uploadId = String(job.multipart_upload_id || "");
  let parts: Array<{ ETag: string; PartNumber: number }> = Array.isArray(job.uploaded_parts) ? job.uploaded_parts : [];
  let offset = Number(job.resume_offset || 0);
  if (!uploadId) {
    const created = await client.send(new CreateMultipartUploadCommand({ Bucket: r2Bucket(), Key: objectKey, ContentType: mimeType }));
    uploadId = String(created.UploadId || "");
    if (!uploadId) throw new Error("MULTIPART_START_FAILED");
    parts = [];
    offset = 0;
    await execute("UPDATE media_import_jobs SET multipart_upload_id=$1,uploaded_parts=$$[]$$::jsonb,resume_offset=0,updated_at=NOW() WHERE id=$2", [uploadId, job.id]);
  }
  const reader = download.body!.getReader();
  const partSize = 8 * 1024 * 1024;
  let buffered = new Uint8Array(0);
  const uploadPart = async (body: Uint8Array) => {
    const state = await query<{ status: string }>("SELECT status FROM media_import_jobs WHERE id=$1", [job.id]);
    if (state[0]?.status === "cancel_requested") throw new Error("IMPORT_CANCELLED");
    const partNumber = parts.length + 1;
    const result = await client.send(new UploadPartCommand({ Bucket: r2Bucket(), Key: objectKey, UploadId: uploadId, PartNumber: partNumber, Body: body }));
    if (!result.ETag) throw new Error("MULTIPART_PART_FAILED");
    parts.push({ ETag: result.ETag, PartNumber: partNumber });
    offset += body.byteLength;
    const progress = total ? Math.min(99, Math.round(offset / total * 100)) : Math.min(99, parts.length);
    await execute("UPDATE media_import_jobs SET uploaded_parts=$1::jsonb,resume_offset=$2,bytes_transferred=$2,progress=$3,updated_at=NOW() WHERE id=$4", [JSON.stringify(parts), offset, progress, job.id]);
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (value?.byteLength) {
      const combined = new Uint8Array(buffered.byteLength + value.byteLength);
      combined.set(buffered);
      combined.set(value, buffered.byteLength);
      buffered = combined;
      while (buffered.byteLength >= partSize) {
        await uploadPart(buffered.slice(0, partSize));
        buffered = buffered.slice(partSize);
      }
    }
    if (done) break;
  }
  if (buffered.byteLength) await uploadPart(buffered);
  const completed = await client.send(new CompleteMultipartUploadCommand({ Bucket: r2Bucket(), Key: objectKey, UploadId: uploadId, MultipartUpload: { Parts: parts } }));
  return { ETag: completed.ETag || null, bytes: offset };
}

export async function queueDriveJobs(userId: string, fileIds: string[]) {
  const auth = await googleAccess(userId);
  const jobs: any[] = [];
  for (const fileId of Array.from(new Set(fileIds.map(String))).slice(0, 25)) {
    const response = await fetch(DRIVE_API + "/files/" + encodeURIComponent(fileId) + "?fields=id,name,mimeType,size,createdTime,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis)", { headers: { Authorization: "Bearer " + auth.token } });
    const file: any = await response.json();
    const size = Number(file.size || 0);
    if (!response.ok || !file.id || !mediaTypeAllowed(file.mimeType) || size < 1 || size > MAX_BYTES) continue;
    const existing = await query<any>("SELECT " + JOB_FIELDS + " FROM media_import_jobs WHERE user_id=$1 AND provider_connection_id=$2 AND provider_file_id=$3 AND status=$$complete$$", [userId, auth.connectionId, fileId]);
    if (existing[0]) { jobs.push({ ...existing[0], mimeType: file.mimeType, size }); continue; }
    const id = crypto.randomUUID();
    await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status,provider_payload,bytes_total) VALUES ($1,$2,$3,$4,$5,$$queued$$,$6::jsonb,$7) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$queued$$,provider_payload=EXCLUDED.provider_payload,attempts=0,bytes_total=EXCLUDED.bytes_total,bytes_transferred=0,progress=0,error_message=NULL,media_object_id=NULL,started_at=NULL,completed_at=NULL,delivered_at=NULL,updated_at=NOW()", [id, userId, auth.connectionId, fileId, String(file.name).slice(0,255), JSON.stringify({ provider: "google-drive", mimeType: file.mimeType, sourceId: file.id, createTime: file.createdTime || null, width: Number(file.imageMediaMetadata?.width || file.videoMediaMetadata?.width || 0) || null, height: Number(file.imageMediaMetadata?.height || file.videoMediaMetadata?.height || 0) || null, durationMillis: Number(file.videoMediaMetadata?.durationMillis || 0) || null }), size]);
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
  const rows = await query<any>("UPDATE media_import_jobs SET status=$$queued$$,attempts=0,progress=CASE WHEN bytes_total>0 THEN LEAST(99,ROUND(resume_offset*100.0/bytes_total)) ELSE 0 END,bytes_transferred=resume_offset,error_message=NULL,started_at=NULL,completed_at=NULL,updated_at=NOW() WHERE id=$1 AND user_id=$2 AND status IN ($$failed$$,$$cancelled$$) RETURNING " + JOB_FIELDS, [id, userId]);
  if (!rows[0]) throw new Error("JOB_NOT_RETRYABLE");
  return rows[0];
}

export async function acknowledgeImportJobs(userId: string, ids: string[]) {
  await execute("UPDATE media_import_jobs SET delivered_at=NOW(),updated_at=NOW() WHERE user_id=$1 AND id=ANY($2::text[]) AND status=$$complete$$", [userId, ids.slice(0,500)]);
}

export async function maintainImportQueue() {
  await execute("UPDATE media_import_jobs SET attempts=0,updated_at=NOW(),error_message=NULL WHERE status=$$queued$$ AND attempts>=3");
  await execute("UPDATE media_import_jobs SET status=$$queued$$,attempts=0,progress=0,bytes_transferred=0,error_message=NULL,started_at=NULL,completed_at=NULL,updated_at=NOW() WHERE status=$$failed$$ AND error_message LIKE $$%media_objects_user_source_idx%$$");
  await execute("UPDATE media_import_jobs SET status=CASE WHEN status=$$cancel_requested$$ THEN $$cancelled$$ ELSE $$queued$$ END,started_at=NULL,updated_at=NOW(),error_message=CASE WHEN status=$$transferring$$ THEN $$Recovered after an interrupted worker.$$ ELSE error_message END WHERE status IN ($$transferring$$,$$cancel_requested$$) AND updated_at<NOW()-INTERVAL $$10 minutes$$");
  if (Date.now() - lastCleanupAt < 5 * 60_000) return;
  lastCleanupAt = Date.now();
  const pending = await query<{ id: string; object_key: string }>("SELECT id,object_key FROM media_objects WHERE status=$$pending$$ AND created_at<NOW()-INTERVAL $$24 hours$$ LIMIT 100");
  const { client, DeleteObjectCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand } = await r2Modules();
  for (const object of pending) {
    await client.send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: object.object_key })).catch(() => undefined);
    await execute("DELETE FROM media_objects WHERE id=$1 AND status=$$pending$$", [object.id]);
  }
  const multipart = await client.send(new ListMultipartUploadsCommand({ Bucket: r2Bucket() }));
  const cutoff = Date.now() - 24 * 60 * 60_000;
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
    const resumeOffset = Number(job.resume_offset || 0);
    const rangeHeaders: Record<string, string> = { Authorization: "Bearer " + auth.token };
    if (resumeOffset > 0) rangeHeaders.Range = "bytes=" + resumeOffset + "-";
    const checkpointComplete = resumeOffset > 0 && Number(job.bytes_total || 0) > 0 && resumeOffset >= Number(job.bytes_total);
    const download = checkpointComplete ? new Response(new Uint8Array()) : payload.provider === "google-photos" ? await fetchGoogleMedia(downloadUrl, auth.token, resumeOffset) : await fetch(downloadUrl, { headers: rangeHeaders });
    if (!download.ok || !download.body) {
      if (payload.provider === "google-photos" && [401,403,404].includes(download.status)) throw new Error("PHOTOS_SELECTION_EXPIRED");
      throw new Error("DOWNLOAD_FAILED_HTTP_" + download.status + "_" + new URL(download.url || downloadUrl).hostname);
    }
    if (resumeOffset > 0 && !checkpointComplete && download.status !== 206) throw new Error("PROVIDER_RANGE_RESUME_UNAVAILABLE");
    const contentRange = download.headers.get("content-range") || "";
    const rangeTotal = Number(contentRange.match(/\/(\d+)$/)?.[1] || 0);
    const responseBytes = Number(download.headers.get("content-length") || 0);
    const total = rangeTotal || Number(job.bytes_total || 0) || resumeOffset + responseBytes;
    if (total > MAX_BYTES) throw new Error("MEDIA_EXCEEDS_5_GB");
    await execute("UPDATE media_import_jobs SET bytes_total=$1,updated_at=NOW() WHERE id=$2", [total, job.id]);
    const existingObjects = await query<{ id: string; object_key: string; status: string; size_bytes: string }>("SELECT id,object_key,status,size_bytes FROM media_objects WHERE user_id=$1 AND source_provider=$2 AND source_id=$3 LIMIT 1", [job.user_id, payload.provider, job.provider_file_id]);
    const existingObject = existingObjects[0];
    if (existingObject?.status === "ready") {
      await download.body.cancel().catch(() => undefined);
      const existingSize = Number(existingObject.size_bytes || total || 0);
      const thumbnailKey = await persistVideoThumbnail(payload, auth.token, job.user_id, existingObject.id).catch(() => null);
      await execute("UPDATE media_objects SET width=COALESCE($1,width),height=COALESCE($2,height),duration_ms=COALESCE($3,duration_ms),captured_at=COALESCE($4,captured_at),thumbnail_object_key=COALESCE($5,thumbnail_object_key) WHERE id=$6", [payload.width, payload.height, payload.durationMillis, payload.createTime, thumbnailKey, existingObject.id]);
      await execute("UPDATE media_import_jobs SET status=$$complete$$,media_object_id=$1,progress=100,bytes_total=$2,bytes_transferred=$2,completed_at=NOW(),updated_at=NOW(),error_message=NULL WHERE id=$3", [existingObject.id, existingSize, job.id]);
      return { id: job.id, status: "complete" };
    }
    const mediaId = existingObject?.id || crypto.randomUUID();
    const objectKey = existingObject?.object_key || job.user_id + "/" + mediaId + "-" + safeObjectName(job.provider_file_name);
    if (existingObject) {
      await execute("UPDATE media_objects SET original_name=$1,content_type=$2,size_bytes=$3,width=$4,height=$5,duration_ms=$6,captured_at=$7,status=$$pending$$,etag=NULL,completed_at=NULL WHERE id=$8", [job.provider_file_name, mimeType, total, payload.width, payload.height, payload.durationMillis, payload.createTime, mediaId]);
    } else {
      await execute("INSERT INTO media_objects (id,user_id,object_key,original_name,content_type,size_bytes,status,source_provider,source_id,width,height,duration_ms,captured_at) VALUES ($1,$2,$3,$4,$5,$6,$$pending$$,$7,$8,$9,$10,$11,$12)", [mediaId, job.user_id, objectKey, job.provider_file_name, mimeType, total, payload.provider, job.provider_file_id, payload.width, payload.height, payload.durationMillis, payload.createTime]);
    }
    const result = await uploadWithCheckpoints(download, job, objectKey, mimeType, total);
    const thumbnailKey = await persistVideoThumbnail(payload, auth.token, job.user_id, mediaId).catch(() => null);
    await execute("UPDATE media_objects SET status=$$ready$$,etag=$1,size_bytes=CASE WHEN size_bytes>0 THEN size_bytes ELSE $2 END,thumbnail_object_key=COALESCE($3,thumbnail_object_key),completed_at=NOW() WHERE id=$4", [result.ETag, result.bytes || total, thumbnailKey, mediaId]);
    await execute("UPDATE media_import_jobs SET status=$$complete$$,media_object_id=$1,progress=100,bytes_total=$2,bytes_transferred=$2,resume_offset=$2,completed_at=NOW(),updated_at=NOW(),error_message=NULL WHERE id=$3", [mediaId, result.bytes || total, job.id]);
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
