import React, { useEffect, useRef, useState } from "react";
import { Ban, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { ImportedCloudMedia } from "./CloudImportModal";

interface Job {
  id: string;
  name: string;
  status: "queued" | "transferring" | "cancel_requested" | "cancelled" | "complete" | "failed";
  progress: number;
  bytesTotal?: number;
  bytesTransferred?: number;
  mediaId?: string | null;
  mimeType?: string;
  provider?: string;
  error?: string | null;
  deliveredAt?: string | null;
  createdAt?: string | null;
  startedAt?: string | null;
  resumeOffset?: number;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  createdTime?: string | null;
  hasThumbnail?: boolean;
  processingStatus?: string | null;
  processingError?: string | null;
  albumName?: string | null;
}

const formatBytes = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0) + " " + units[index];
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) return "calculating";
  if (seconds < 60) return Math.max(1, Math.ceil(seconds)) + " sec";
  if (seconds < 3600) return Math.ceil(seconds / 60) + " min";
  return Math.floor(seconds / 3600) + " hr " + Math.ceil((seconds % 3600) / 60) + " min";
};

export interface ImportActivitySummary {
  transferring: number;
  processing: number;
  issues: number;
}

export function BackgroundImportProgress({ onImported, onStatusChange }: {
  onImported: (items: ImportedCloudMedia[]) => void;
  onStatusChange?: (summary: ImportActivitySummary) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [actionId, setActionId] = useState("");
  const [photoSessions, setPhotoSessions] = useState<string[]>([]);
  const [photoSessionError, setPhotoSessionError] = useState("");
  const [now, setNow] = useState(0);
  const delivering = useRef(new Set<string>());
  const onImportedRef = useRef(onImported);
  onImportedRef.current = onImported;

  useEffect(() => {
    onStatusChange?.({
      transferring: jobs.filter(job => ["queued", "transferring", "cancel_requested"].includes(job.status)).length + photoSessions.length,
      processing: jobs.filter(job => job.status === "complete" && ["queued", "processing"].includes(job.processingStatus || "")).length,
      issues: jobs.filter(job => ["failed", "cancelled"].includes(job.status) || job.processingStatus === "failed").length,
    });
  }, [jobs, photoSessions, onStatusChange]);

  const deliverCompleted = async (items: Job[]) => {
    const ready = items.filter(job => job.status === "complete" && job.mediaId && !job.deliveredAt && !delivering.current.has(job.id));
    if (!ready.length) return;
    ready.forEach(job => delivering.current.add(job.id));
    onImportedRef.current(ready.map(job => ({
      id: job.id,
      name: job.name,
      mimeType: job.mimeType || "application/octet-stream",
      size: Number(job.bytesTotal || 0),
      mediaId: job.mediaId!,
      mediaUrl: "/api/media/" + job.mediaId,
      thumbnailUrl: job.hasThumbnail ? "/api/media/" + job.mediaId + "/thumbnail?size=large" : undefined,
      width: job.width,
      height: job.height,
      durationMs: job.durationMs,
      createdTime: job.createdTime,
      sourceProvider: job.provider,
      processingStatus: job.processingStatus,
      albumName: job.albumName,
    })));
    const response = await fetch("/api/import-jobs/acknowledge", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: ready.map(job => job.id) }),
    });
    if (response.ok) setJobs(previous => previous.map(job => ready.some(item => item.id === job.id) ? { ...job, deliveredAt: new Date().toISOString() } : job));
  };

  const refresh = async () => {
    const response = await fetch("/api/import-jobs");
    if (!response.ok) return;
    const body = await response.json();
    const next = body.jobs || [];
    setJobs(next);
    await deliverCompleted(next);
  };

  useEffect(() => {
    setNow(Date.now());
    const clock = window.setInterval(() => setNow(Date.now()), 2000);
    refresh();
    const receive = (event: Event) => {
      const incoming = (event as CustomEvent<Job[]>).detail || [];
      setJobs(previous => [...incoming, ...previous.filter(job => !incoming.some(item => item.id === job.id))]);
      void deliverCompleted(incoming);
    };
    const receivePhotoSession = (event: Event) => {
      const id = String((event as CustomEvent<{ id?: string }>).detail?.id || "");
      if (id) setPhotoSessions(previous => previous.includes(id) ? previous : [...previous, id]);
    };
    window.addEventListener("aeterna-import-jobs", receive);
    window.addEventListener("aeterna-google-photos-session", receivePhotoSession);
    return () => {
      window.removeEventListener("aeterna-import-jobs", receive);
      window.removeEventListener("aeterna-google-photos-session", receivePhotoSession);
      window.clearInterval(clock);
    };
  }, []);

  useEffect(() => {
    if (!jobs.some(job => job.status === "complete" && job.deliveredAt && !["queued", "processing"].includes(job.processingStatus || ""))) return;
    const timer = window.setTimeout(() => {
      setJobs(previous => previous.filter(job => !(job.status === "complete" && job.deliveredAt && !["queued", "processing"].includes(job.processingStatus || ""))));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [jobs]);

  useEffect(() => {
    if (!photoSessions.length) return;
    let checking = false;
    const checkSessions = async () => {
      if (checking) return;
      checking = true;
      try {
        for (const id of photoSessions) {
          const statusResponse = await fetch("/api/integrations/google-photos/session/" + encodeURIComponent(id));
          const status = await statusResponse.json();
          if (!statusResponse.ok) {
            setPhotoSessionError(status.error || "Google Photos selection could not be checked.");
            continue;
          }
          if (!status.ready) continue;
          const queueResponse = await fetch("/api/integrations/google-photos/queue", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: id }) });
          const queued = await queueResponse.json();
          if (queueResponse.ok) {
            window.dispatchEvent(new CustomEvent("aeterna-import-jobs", { detail: queued.jobs || [] }));
            setPhotoSessionError(queued.jobs?.length ? "" : "Google returned no supported photos or videos.");
          } else setPhotoSessionError(queued.error || "Selected Photos could not be queued.");
          setPhotoSessions(previous => previous.filter(value => value !== id));
        }
      } finally { checking = false; }
    };
    void checkSessions();
    const timer = window.setInterval(checkSessions, 5000);
    return () => window.clearInterval(timer);
  }, [photoSessions]);

  useEffect(() => {
    if (!jobs.some(job => ["queued", "transferring", "cancel_requested"].includes(job.status) || ["queued", "processing"].includes(job.processingStatus || ""))) return;
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [jobs]);

  const act = async (job: Job, action: "cancel" | "retry") => {
    setActionId(job.id);
    const response = await fetch("/api/import-jobs/" + action, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id }),
    });
    const body = await response.json();
    if (response.ok) setJobs(previous => previous.map(item => item.id === job.id ? { ...item, ...body.job } : item));
    setActionId("");
  };

  if (!jobs.length && !photoSessions.length && !photoSessionError) return null;
  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#120B21] border border-[#DFB260]/30 space-y-3">
      <div className="text-sm font-cinzel text-[#FFF2A8] flex items-center justify-between gap-2">
        <span className="flex items-center gap-2"><Loader2 className={"w-4 h-4 " + (jobs.some(job => ["queued","transferring"].includes(job.status)) ? "animate-spin" : "")} /> Import activity</span>
        <button onClick={refresh} className="text-[#F5D77F]"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {photoSessions.length > 0 && <div className="text-xs text-[#C8B1E4] flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Waiting for your Google Photos selection…</div>}
      {photoSessionError && <p className="text-xs text-rose-300">{photoSessionError}</p>}
      {jobs.map(job => {
        const expired = job.provider === "google-photos" && job.error?.includes("expired");
        const transferred = Number(job.bytesTransferred || 0);
        const total = Number(job.bytesTotal || 0);
        const percent = job.status === "complete" ? 100 : Math.max(0, Math.min(99, Number(job.progress || 0)));
        const started = job.startedAt ? new Date(job.startedAt).getTime() : 0;
        const elapsedSeconds = started && now ? Math.max(1, (now - started) / 1000) : 0;
        const bytesPerSecond = elapsedSeconds && transferred ? transferred / elapsedSeconds : 0;
        const remainingSeconds = bytesPerSecond && total > transferred ? (total - transferred) / bytesPerSecond : Number.NaN;
        const active = ["queued", "transferring", "cancel_requested"].includes(job.status);
        const optimizing = job.status === "complete" && ["queued", "processing"].includes(job.processingStatus || "");
        return (
          <div key={job.id} className="border-t border-[#DFB260]/15 pt-3 first:border-0">
            <div className="flex justify-between gap-3 text-xs">
              <span className="text-[#FFF2A8] font-semibold truncate">{job.name}</span>
              <span className="text-[#F5D77F] font-mono shrink-0">{percent}%</span>
            </div>
            <div className="relative h-3 bg-black/50 rounded-full overflow-hidden mt-2 border border-[#DFB260]/20" role="progressbar" aria-label={"Importing " + job.name} aria-valuemin={0} aria-valuemax={100} aria-valuenow={total ? percent : undefined}>
              <div className={"h-full bg-gradient-to-r from-[#B77A2D] via-[#F5D77F] to-[#FFF2A8] transition-[width] duration-500 " + (active && !total ? "animate-pulse" : "")} style={{ width: (total ? percent : active ? Math.max(8, percent) : percent) + "%" }} />
            </div>
            <div className="flex justify-between gap-3 mt-1.5 text-[10px] font-mono text-[#C8B1E4]">
              <span>{optimizing ? "Transfer complete · optimizing video and thumbnails…" : job.status === "queued" && Number(job.resumeOffset || 0) > 0 ? "Ready to resume from " + formatBytes(Number(job.resumeOffset)) : job.status === "queued" ? "Waiting for transfer…" : job.status === "transferring" && !total ? "Preparing secure video stream…" : total ? formatBytes(transferred) + " of " + formatBytes(total) : job.status.replaceAll("_", " ")}</span>
              {active && bytesPerSecond > 0 && <span className="shrink-0">{formatBytes(bytesPerSecond)}/s · {formatDuration(remainingSeconds)} left</span>}
            </div>
            <div className="flex items-start justify-between gap-2 mt-2">
              <div>{(job.error || job.processingError) && <p className="text-[10px] text-rose-300">{job.error || job.processingError}</p>}{expired && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("aeterna-reselect-google-photos"))} className="text-[10px] text-[#F5D77F] underline underline-offset-2">Select this item again in Google Photos</button>}</div>
              {["queued","transferring","cancel_requested"].includes(job.status) && <button onClick={() => act(job, "cancel")} disabled={Boolean(actionId)} className="text-[10px] text-rose-300 flex items-center gap-1"><Ban className="w-3 h-3" /> Cancel</button>}
              {["failed","cancelled"].includes(job.status) && !expired && <button onClick={() => act(job, "retry")} disabled={Boolean(actionId)} className="text-[10px] text-[#F5D77F] flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Retry</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
