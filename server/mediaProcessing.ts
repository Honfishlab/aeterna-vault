import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import ffmpegPath from "ffmpeg-static";
import { execute, query } from "./db";
import { r2Bucket, r2Modules } from "./r2";

const run = (args: string[]) => new Promise<void>((resolve, reject) => {
  if (!ffmpegPath) return reject(new Error("FFMPEG_NOT_AVAILABLE"));
  execFile(ffmpegPath, args, { timeout: 45 * 60_000, maxBuffer: 2 * 1024 * 1024 }, error => error ? reject(error) : resolve());
});

export async function queueMediaProcessing(userId: string, mediaId: string) {
  await execute("INSERT INTO media_processing_jobs (id,media_object_id,user_id) VALUES ($1,$2,$3) ON CONFLICT (media_object_id) DO UPDATE SET status=CASE WHEN media_processing_jobs.status=$$complete$$ THEN $$complete$$ ELSE $$queued$$ END,attempts=CASE WHEN media_processing_jobs.status=$$complete$$ THEN media_processing_jobs.attempts ELSE 0 END,error_message=NULL,updated_at=NOW()", [crypto.randomUUID(), mediaId, userId]);
  await execute("UPDATE media_objects SET processing_status=CASE WHEN processing_status=$$ready$$ THEN $$ready$$ ELSE $$queued$$ END,processing_error=NULL WHERE id=$1", [mediaId]);
}

export async function processNextMediaJob() {
  const rows = await query<any>("UPDATE media_processing_jobs SET status=$$processing$$,attempts=attempts+1,progress=5,started_at=NOW(),updated_at=NOW() WHERE id=(SELECT id FROM media_processing_jobs WHERE status=$$queued$$ AND attempts<3 ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *");
  const job = rows[0];
  if (!job) return null;
  const workspace = await mkdtemp(join(tmpdir(), "aeterna-transcode-"));
  try {
    const mediaRows = await query<any>("SELECT id,user_id,object_key,content_type FROM media_objects WHERE id=$1 AND user_id=$2 AND status=$$ready$$ LIMIT 1", [job.media_object_id, job.user_id]);
    const media = mediaRows[0];
    if (!media || !String(media.content_type).startsWith("video/")) throw new Error("VIDEO_SOURCE_NOT_FOUND");
    await execute("UPDATE media_objects SET processing_status=$$processing$$ WHERE id=$1", [media.id]);
    const source = join(workspace, "source");
    const playback = join(workspace, "playback.mp4");
    const { client, GetObjectCommand, PutObjectCommand } = await r2Modules();
    const object = await client.send(new GetObjectCommand({ Bucket: r2Bucket(), Key: media.object_key }));
    const body = object.Body?.transformToWebStream ? Readable.fromWeb(object.Body.transformToWebStream() as any) : object.Body;
    await pipeline(body, (await import("node:fs")).createWriteStream(source));
    await execute("UPDATE media_processing_jobs SET progress=25,updated_at=NOW() WHERE id=$1", [job.id]);
    await run(["-y", "-i", source, "-map_metadata", "0", "-c:v", "libx264", "-preset", "veryfast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", playback]);
    const playbackKey = media.user_id + "/" + media.id + "-playback.mp4";
    await client.send(new PutObjectCommand({ Bucket: r2Bucket(), Key: playbackKey, Body: await readFile(playback), ContentType: "video/mp4" }));
    await execute("UPDATE media_processing_jobs SET progress=70,updated_at=NOW() WHERE id=$1", [job.id]);
    const variants: Record<string, string> = {};
    for (const [label, width] of [["small", 320], ["medium", 640], ["large", 1280]] as const) {
      const poster = join(workspace, "poster-" + label + ".jpg");
      await run(["-y", "-ss", "0.1", "-i", source, "-frames:v", "1", "-vf", "scale=" + width + ":-2", "-q:v", "3", poster]);
      const key = media.user_id + "/" + media.id + "-poster-" + label + ".jpg";
      await client.send(new PutObjectCommand({ Bucket: r2Bucket(), Key: key, Body: await readFile(poster), ContentType: "image/jpeg" }));
      variants[label] = key;
    }
    await execute("UPDATE media_objects SET playback_object_key=$1,thumbnail_object_key=$2,thumbnail_variants=$3::jsonb,processing_status=$$ready$$,processing_error=NULL WHERE id=$4", [playbackKey, variants.large, JSON.stringify(variants), media.id]);
    await execute("UPDATE media_processing_jobs SET status=$$complete$$,progress=100,completed_at=NOW(),updated_at=NOW(),error_message=NULL WHERE id=$1", [job.id]);
    return { id: job.id, status: "complete" };
  } catch (error: any) {
    const retry = Number(job.attempts || 0) < 3;
    const status = retry ? "queued" : "failed";
    const message = String(error?.message || "TRANSCODE_FAILED").slice(0, 500);
    await execute("UPDATE media_processing_jobs SET status=$1,error_message=$2,updated_at=NOW() WHERE id=$3", [status, message, job.id]);
    await execute("UPDATE media_objects SET processing_status=$1,processing_error=$2 WHERE id=$3", [retry ? "queued" : "failed", message, job.media_object_id]);
    return { id: job.id, status };
  } finally {
    await rm(workspace, { recursive: true, force: true }).catch(() => undefined);
  }
}
