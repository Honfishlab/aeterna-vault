import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { ImportedCloudMedia } from "./CloudImportModal";

interface Job {
  id: string;
  name: string;
  status: "queued" | "transferring" | "complete" | "failed";
  progress: number;
  bytesTotal?: number;
  bytesTransferred?: number;
  mediaId?: string | null;
  mimeType?: string;
  size?: number;
  error?: string | null;
}

export function BackgroundImportProgress({ onImported }: { onImported: (items: ImportedCloudMedia[]) => void }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [delivered, setDelivered] = useState<string[]>([]);

  useEffect(() => {
    const receive = (event: Event) => {
      const incoming = (event as CustomEvent<Job[]>).detail || [];
      setJobs(previous => [...previous.filter(job => !incoming.some(item => item.id === job.id)), ...incoming]);
    };
    window.addEventListener("aeterna-import-jobs", receive);
    return () => window.removeEventListener("aeterna-import-jobs", receive);
  }, []);

  useEffect(() => {
    if (!jobs.some(job => job.status === "queued" || job.status === "transferring")) return;
    const timer = window.setInterval(async () => {
      const response = await fetch("/api/import-jobs?ids=" + encodeURIComponent(jobs.map(job => job.id).join(",")));
      if (!response.ok) return;
      const body = await response.json();
      setJobs(previous => body.jobs.map((job: Job) => ({ ...previous.find(item => item.id === job.id), ...job })));
      const newlyComplete = body.jobs.filter((job: Job) => job.status === "complete" && job.mediaId && !delivered.includes(job.id));
      if (newlyComplete.length) {
        setDelivered(previous => [...previous, ...newlyComplete.map((job: Job) => job.id)]);
        onImported(newlyComplete.map((job: Job) => ({
          id: job.id,
          name: job.name,
          mimeType: job.mimeType || "application/octet-stream",
          size: Number(job.size || job.bytesTotal || 0),
          mediaId: job.mediaId!,
          mediaUrl: "/api/media/" + job.mediaId,
        })));
      }
    }, 2000);
    return () => window.clearInterval(timer);
  }, [jobs, delivered, onImported]);

  if (!jobs.length) return null;
  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#120B21] border border-[#DFB260]/30 space-y-3">
      <div className="text-sm font-cinzel text-[#FFF2A8] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Background imports</div>
      {jobs.map(job => (
        <div key={job.id}>
          <div className="flex justify-between gap-3 text-[11px]"><span className="text-[#FFF2A8] truncate">{job.name}</span><span className="text-[#F5D77F] shrink-0">{job.status} · {job.progress || 0}%</span></div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden mt-1"><div className="h-full bg-gradient-to-r from-[#DFB260] to-[#F5D77F] transition-all" style={{ width: `${job.progress || 0}%` }} /></div>
          {job.error && <p className="text-[10px] text-rose-300 mt-1">{job.error}</p>}
        </div>
      ))}
    </div>
  );
}
