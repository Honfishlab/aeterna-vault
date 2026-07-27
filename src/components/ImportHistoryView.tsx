import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, CloudDownload, Film, Loader2, RefreshCw, XCircle } from "lucide-react";

interface HistoryJob {
  id: string;
  name: string;
  provider?: string;
  mimeType?: string;
  status: string;
  processingStatus?: string | null;
  processingError?: string | null;
  progress: number;
  bytesTotal?: number;
  error?: string | null;
  attempts?: number;
  createdAt?: string;
  completedAt?: string | null;
}

const bytes = (value = 0) => value >= 1024 ** 3 ? (value / 1024 ** 3).toFixed(1) + " GB" : value >= 1024 ** 2 ? (value / 1024 ** 2).toFixed(1) + " MB" : (value / 1024).toFixed(0) + " KB";

export function ImportHistoryView() {
  const [jobs, setJobs] = useState<HistoryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/import-jobs?history=true");
    if (response.ok) setJobs((await response.json()).jobs || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!jobs.some(job => ["queued", "transferring"].includes(job.status) || ["queued", "processing"].includes(job.processingStatus || ""))) return;
    const timer = window.setInterval(load, 4000);
    return () => window.clearInterval(timer);
  }, [jobs]);

  const visible = useMemo(() => jobs.filter(job => filter === "all" || (filter === "processing" ? ["queued", "processing"].includes(job.processingStatus || "") : job.status === filter)), [jobs, filter]);
  const counts = useMemo(() => ({
    complete: jobs.filter(job => job.status === "complete").length,
    failed: jobs.filter(job => job.status === "failed").length,
    processing: jobs.filter(job => ["queued", "processing"].includes(job.processingStatus || "")).length,
  }), [jobs]);

  return (
    <section className="space-y-6 pb-16">
      <div className="cosmic-card p-6 sm:p-8 rounded-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-mono text-[#F5D77F] uppercase tracking-widest">Connected media operations</p>
            <h1 className="font-cinzel text-3xl text-[#FFF2A8] font-bold mt-2">Import History</h1>
            <p className="text-sm text-[#C8B1E4] mt-2">Transfers, resumptions, failures, and browser-compatible video processing.</p>
          </div>
          <button onClick={load} className="gold-beveled-btn px-4 py-2 flex items-center gap-2 text-xs"><RefreshCw className="w-4 h-4" /> Refresh</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-[#120B21]/80 rounded-2xl p-4 border border-[#DFB260]/20"><strong className="text-2xl text-[#FFF2A8]">{counts.complete}</strong><span className="block text-[10px] text-[#C8B1E4] uppercase">Transferred</span></div>
          <div className="bg-[#120B21]/80 rounded-2xl p-4 border border-[#DFB260]/20"><strong className="text-2xl text-[#FFF2A8]">{counts.processing}</strong><span className="block text-[10px] text-[#C8B1E4] uppercase">Processing</span></div>
          <div className="bg-[#120B21]/80 rounded-2xl p-4 border border-[#DFB260]/20"><strong className="text-2xl text-[#FFF2A8]">{counts.failed}</strong><span className="block text-[10px] text-[#C8B1E4] uppercase">Needs attention</span></div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["all", "complete", "processing", "failed", "cancelled"].map(value => <button key={value} onClick={() => setFilter(value)} className={filter === value ? "gold-filled-btn px-4 py-2 text-xs" : "gold-beveled-btn px-4 py-2 text-xs"}>{value}</button>)}
      </div>

      <div className="space-y-3">
        {loading && !jobs.length && <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#F5D77F]" /></div>}
        {visible.map(job => {
          const processing = ["queued", "processing"].includes(job.processingStatus || "");
          const failed = job.status === "failed" || job.processingStatus === "failed";
          const Icon = failed ? XCircle : processing ? Film : job.status === "complete" ? CheckCircle2 : ["queued", "transferring"].includes(job.status) ? Loader2 : Clock3;
          return (
            <article key={job.id} className="cosmic-card rounded-2xl p-4 flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-[#DFB260]/15 text-[#F5D77F]"><Icon className={"w-5 h-5 " + (["queued", "transferring"].includes(job.status) ? "animate-spin" : "")} /></div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap justify-between gap-2"><h3 className="text-sm font-bold text-[#FFF2A8] truncate">{job.name}</h3><time className="text-[10px] font-mono text-[#C8B1E4]">{job.createdAt ? new Date(job.createdAt).toLocaleString() : ""}</time></div>
                <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-mono"><span className="px-2 py-1 rounded bg-[#120B21] text-[#F5D77F]">{job.provider || "cloud"}</span><span className="px-2 py-1 rounded bg-[#120B21] text-[#C8B1E4]">{bytes(Number(job.bytesTotal || 0))}</span><span className="px-2 py-1 rounded bg-[#120B21] text-[#C8B1E4]">transfer: {job.status}</span>{job.processingStatus && <span className="px-2 py-1 rounded bg-[#120B21] text-[#C8B1E4]">video: {job.processingStatus}</span>}</div>
                {(job.error || job.processingError) && <p className="mt-2 text-xs text-rose-300">{job.error || job.processingError}</p>}
                {processing && <div className="mt-3 h-2 rounded-full bg-black/40 overflow-hidden"><div className="h-full w-2/3 animate-pulse bg-gradient-to-r from-[#B77A2D] to-[#FFF2A8]" /></div>}
              </div>
            </article>
          );
        })}
        {!loading && !visible.length && <div className="cosmic-card p-12 rounded-3xl text-center text-[#C8B1E4]"><CloudDownload className="w-10 h-10 mx-auto mb-3 text-[#F5D77F]" />No imports match this filter.</div>}
      </div>
    </section>
  );
}
