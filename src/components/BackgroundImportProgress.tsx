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
}

export function BackgroundImportProgress({ onImported }: { onImported: (items: ImportedCloudMedia[]) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [actionId, setActionId] = useState("");
  const delivering = useRef(new Set<string>());
  const onImportedRef = useRef(onImported);
  onImportedRef.current = onImported;

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
    refresh();
    const receive = (event: Event) => {
      const incoming = (event as CustomEvent<Job[]>).detail || [];
      setJobs(previous => [...incoming, ...previous.filter(job => !incoming.some(item => item.id === job.id))]);
      void deliverCompleted(incoming);
    };
    window.addEventListener("aeterna-import-jobs", receive);
    return () => window.removeEventListener("aeterna-import-jobs", receive);
  }, []);

  useEffect(() => {
    if (!jobs.some(job => ["queued", "transferring", "cancel_requested"].includes(job.status))) return;
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

  if (!jobs.length) return null;
  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#120B21] border border-[#DFB260]/30 space-y-3">
      <div className="text-sm font-cinzel text-[#FFF2A8] flex items-center justify-between gap-2">
        <span className="flex items-center gap-2"><Loader2 className={"w-4 h-4 " + (jobs.some(job => ["queued","transferring"].includes(job.status)) ? "animate-spin" : "")} /> Import activity</span>
        <button onClick={refresh} className="text-[#F5D77F]"><RefreshCw className="w-4 h-4" /></button>
      </div>
      {jobs.map(job => {
        const expired = job.provider === "google-photos" && job.error?.includes("expired");
        return (
          <div key={job.id} className="border-t border-[#DFB260]/15 pt-2 first:border-0">
            <div className="flex justify-between gap-3 text-[11px]"><span className="text-[#FFF2A8] truncate">{job.name}</span><span className="text-[#F5D77F] shrink-0">{job.status.replace("_", " ")} - {job.progress || 0}%</span></div>
            <div className="h-1.5 bg-black/40 rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-[#DFB260] to-[#F5D77F] transition-all" style={{ width: (job.progress || 0) + "%" }} /></div>
            <div className="flex items-start justify-between gap-2 mt-1">
              <div>{job.error && <p className="text-[10px] text-rose-300">{job.error}</p>}{expired && <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("aeterna-reselect-google-photos"))} className="text-[10px] text-[#F5D77F] underline underline-offset-2">Select this item again in Google Photos</button>}</div>
              {["queued","transferring","cancel_requested"].includes(job.status) && <button onClick={() => act(job, "cancel")} disabled={Boolean(actionId)} className="text-[10px] text-rose-300 flex items-center gap-1"><Ban className="w-3 h-3" /> Cancel</button>}
              {["failed","cancelled"].includes(job.status) && !expired && <button onClick={() => act(job, "retry")} disabled={Boolean(actionId)} className="text-[10px] text-[#F5D77F] flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Retry</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
