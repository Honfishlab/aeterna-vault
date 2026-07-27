import React, { useEffect, useState } from "react";
import { AlertCircle, CloudDownload, Loader2 } from "lucide-react";
interface ImportJob { id: string; status: "queued" | "transferring" | "cancel_requested" | "cancelled" | "complete" | "failed"; progress?: number; }
export function GlobalImportIndicator({ enabled, onOpen }: { enabled: boolean; onOpen: () => void }) {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  useEffect(() => {
    if (!enabled) { setJobs([]); return; }
    let active = true;
    const refresh = async () => { const response = await fetch("/api/import-jobs"); if (!response.ok) return; const body = await response.json(); if (active) setJobs(Array.isArray(body.jobs) ? body.jobs : []); };
    void refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => { active = false; window.clearInterval(timer); };
  }, [enabled]);
  const running = jobs.filter(job => ["queued", "transferring", "cancel_requested"].includes(job.status));
  const failed = jobs.filter(job => ["failed", "cancelled"].includes(job.status));
  const ready = jobs.filter(job => job.status === "complete");
  if (!running.length && !failed.length && !ready.length) return null;
  const progress = running.length ? Math.round(running.reduce((sum, job) => sum + Number(job.progress || 0), 0) / running.length) : 100;
  return <button type="button" onClick={onOpen} className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DFB260]/50 bg-[#1A0C33] text-[#FFF2A8] hover:bg-[#28134D] transition-colors" title="Open background import activity">
    {running.length ? <Loader2 className="w-4 h-4 text-[#F5D77F] animate-spin" /> : failed.length ? <AlertCircle className="w-4 h-4 text-rose-300" /> : <CloudDownload className="w-4 h-4 text-emerald-300" />}
    <span className="hidden xl:block text-[10px] font-semibold">{running.length ? "Importing " + running.length + " · " + progress + "%" : failed.length ? failed.length + " import " + (failed.length === 1 ? "issue" : "issues") : ready.length + " import ready"}</span>
    <span className="xl:hidden text-[10px] font-bold">{running.length || failed.length || ready.length}</span>
    {running.length > 0 && <span className="absolute left-2 right-2 -bottom-1 h-1 rounded-full overflow-hidden bg-black/60"><span className="block h-full bg-[#F5D77F]" style={{ width: progress + "%" }} /></span>}
  </button>;
}
