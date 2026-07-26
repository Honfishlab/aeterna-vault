import { execute, query } from "./db";
import { googleAccess } from "./googleDrive";
import { mediaTypeAllowed, r2Bucket, r2Modules, safeObjectName } from "./r2";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const MAX_BYTES = 5 * 1024 * 1024 * 1024;

export async function queueDriveJobs(userId: string, fileIds: string[]) {
  const auth = await googleAccess(userId);
  const jobs: any[] = [];
  for (const fileId of Array.from(new Set(fileIds.map(String))).slice(0, 25)) {
    const response = await fetch(DRIVE_API + "/files/" + encodeURIComponent(fileId) + "?fields=id,name,mimeType,size", { headers: { Authorization: "Bearer " + auth.token } });
    const file: any = await response.json();
    const size = Number(file.size || 0);
    if (!response.ok || !file.id || !mediaTypeAllowed(file.mimeType) || size < 1 || size > MAX_BYTES) continue;
    const existing = await query<any>("SELECT id,provider_file_name AS name,status,progress,media_object_id AS \"mediaId\" FROM media_import_jobs WHERE user_id=$1 AND provider_connection_id=$2 AND provider_file_id=$3 AND status=$$complete$$", [userId, auth.connectionId, fileId]);
    if (existing[0]) { jobs.push({ ...existing[0], mimeType: file.mimeType, size }); continue; }
    const id = crypto.randomUUID();
    await execute("INSERT INTO media_import_jobs (id,user_id,provider_connection_id,provider_file_id,provider_file_name,status,provider_payload,bytes_total) VALUES ($1,$2,$3,$4,$5,$$queued$$,$6::jsonb,$7) ON CONFLICT (user_id,provider_connection_id,provider_file_id) DO UPDATE SET id=EXCLUDED.id,status=$$queued$$,provider_payload=EXCLUDED.provider_payload,bytes_total=EXCLUDED.bytes_total,bytes_transferred=0,progress=0,error_message=NULL", [id, userId, auth.connectionId, fileId, String(file.name).slice(0,255), JSON.stringify({ provider: "google-drive", mimeType: file.mimeType }), size]);
    jobs.push({ id, name: file.name, mimeType: file.mimeType, size, status: "queued", progress: 0 });
  }
  return { jobs };
}

export async function jobStatus(userId: string, ids: string[]) {
  return query("SELECT id,provider_file_name AS name,status,progress,bytes_total AS \"bytesTotal\",bytes_transferred AS \"bytesTransferred\",media_object_id AS \"mediaId\",provider_payload->>$$mimeType$$ AS \"mimeType\",error_message AS error FROM media_import_jobs WHERE user_id=$1 AND id=ANY($2::text[]) ORDER BY created_at", [userId, ids.slice(0,500)]);
}

export async function processNextImportJob() {
  const rows = await query<any>("UPDATE media_import_jobs SET status=$$transferring$$,started_at=NOW(),attempts=attempts+1,progress=GREATEST(progress,1) WHERE id=(SELECT id FROM media_import_jobs WHERE status=$$queued$$ AND attempts<3 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *");
  const job = rows[0];
  if (!job) return null;
  try {
    const auth = await googleAccess(job.user_id);
    const payload = job.provider_payload || {};
    let downloadUrl: string;
    let mimeType = payload.mimeType || "application/octet-stream";
    if (payload.provider === "google-photos") {
      downloadUrl = payload.baseUrl + (mimeType.startsWith("video/") ? "=dv" : "=d");
    } else {
      downloadUrl = DRIVE_API + "/files/" + encodeURIComponent(job.provider_file_id) + "?alt=media";
    }
    const download = await fetch(downloadUrl, { headers: { Authorization: "Bearer " + auth.token } });
    if (!download.ok || !download.body) throw new Error("DOWNLOAD_FAILED");
    const total = Number(download.headers.get("content-length") || job.bytes_total || 0);
    await execute("UPDATE media_import_jobs SET bytes_total=$1 WHERE id=$2", [total, job.id]);
    const mediaId = crypto.randomUUID();
    const objectKey = job.user_id + "/" + mediaId + "-" + safeObjectName(job.provider_file_name);
    await execute("DELETE FROM media_objects WHERE user_id=$1 AND source_provider=$2 AND source_id=$3 AND status=$$pending$$", [job.user_id, payload.provider, job.provider_file_id]);
    await execute("INSERT INTO media_objects (id,user_id,object_key,original_name,content_type,size_bytes,status,source_provider,source_id) VALUES ($1,$2,$3,$4,$5,$6,$$pending$$,$7,$8)", [mediaId, job.user_id, objectKey, job.provider_file_name, mimeType, total, payload.provider, job.provider_file_id]);
    const { client, Upload } = await r2Modules();
    const { Readable } = await import("node:stream");
    const upload = new Upload({ client, params: { Bucket: r2Bucket(), Key: objectKey, Body: Readable.fromWeb(download.body as any), ContentType: mimeType }, queueSize: 2, partSize: 8 * 1024 * 1024, leavePartsOnError: false });
    let lastProgress = 0;
    upload.on("httpUploadProgress", (event: any) => {
      const loaded = Number(event.loaded || 0);
      const progress = total ? Math.min(99, Math.round(loaded / total * 100)) : Math.min(99, lastProgress + 1);
      if (progress >= lastProgress + 2) {
        lastProgress = progress;
        execute("UPDATE media_import_jobs SET bytes_transferred=$1,progress=$2 WHERE id=$3", [loaded, progress, job.id]).catch(() => undefined);
      }
    });
    const result = await upload.done();
    await execute("UPDATE media_objects SET status=$$ready$$,etag=$1,size_bytes=CASE WHEN size_bytes>0 THEN size_bytes ELSE $2 END,completed_at=NOW() WHERE id=$3", [result.ETag || null, total, mediaId]);
    await execute("UPDATE media_import_jobs SET status=$$complete$$,media_object_id=$1,progress=100,bytes_transferred=bytes_total,completed_at=NOW() WHERE id=$2", [mediaId, job.id]);
    return { id: job.id, status: "complete" };
  } catch (error: any) {
    const retry = Number(job.attempts || 0) < 3;
    await execute("UPDATE media_import_jobs SET status=$1,error_message=$2 WHERE id=$3", [retry ? "queued" : "failed", String(error?.message || "IMPORT_FAILED").slice(0,500), job.id]);
    return { id: job.id, status: retry ? "queued" : "failed" };
  }
}
