import React, { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

interface AuditRow {
  id: string;
  name: string;
  albumName?: string | null;
  contentType?: string | null;
  mimeType?: string | null;
  bytesTotal?: number;
  status: string;
  processingStatus?: string | null;
  archiveStatus?: string | null;
  arweaveId?: string | null;
  r2UploadedAt?: string | null;
  permanentArchiveDate?: string | null;
  error?: string | null;
  processingError?: string | null;
}

const formatBytes = (value = 0) => value >= 1024 ** 3 ? (value / 1024 ** 3).toFixed(2) + " GB" : value >= 1024 ** 2 ? (value / 1024 ** 2).toFixed(1) + " MB" : value >= 1024 ? (value / 1024).toFixed(0) + " KB" : value + " B";
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleString() : "—";
const compactId = (value: string) => value.length > 18 ? value.slice(0,8) + "…" + value.slice(-8) : value;

function auditStatus(row: AuditRow) {
  if (row.status === "failed" || row.processingStatus === "failed") return "Import failed";
  if (row.archiveStatus === "failed") return "R2 ready · archive failed";
  if (row.archiveStatus === "confirmed") return "Permanent";
  if (["staging","queued","uploading","submitted"].includes(row.archiveStatus || "")) return "R2 ready · " + row.archiveStatus;
  if (row.status === "complete") return row.processingStatus === "processing" ? "R2 ready · processing" : "R2 ready";
  return row.status;
}

export function ImportHistoryView({ onOpenAlbum }: { onOpenAlbum?: (albumName: string) => void }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/import-jobs?history=true");
    if (response.ok) setRows((await response.json()).jobs || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!rows.some(row => ["queued","transferring"].includes(row.status) || ["queued","processing"].includes(row.processingStatus || "") || ["staging","queued","uploading","submitted"].includes(row.archiveStatus || ""))) return;
    const timer = window.setInterval(load, 5000);
    return () => window.clearInterval(timer);
  }, [rows]);

  const totals = useMemo(() => ({
    files: rows.length,
    r2: rows.filter(row => Boolean(row.r2UploadedAt)).length,
    permanent: rows.filter(row => row.archiveStatus === "confirmed" && Boolean(row.arweaveId)).length
  }), [rows]);

  return (
    <section className="space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DFB260]/40 pb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F5D77F]">Storage operations ledger</p>
          <h1 className="mt-1 font-cinzel text-3xl font-bold text-[#FFF2A8]">Audit</h1>
          <p className="mt-1 text-xs text-[#C8B1E4]">{totals.files} files · {totals.r2} uploaded to R2 · {totals.permanent} permanently archived</p>
        </div>
        <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-[#DFB260]/50 px-3 py-2 text-xs text-[#FFF2A8] disabled:opacity-50">
          <RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Refresh
        </button>
      </header>

      <div className="overflow-x-auto rounded-lg border border-[#DFB260]/35 bg-[#0A0514]/90">
        <table className="w-full min-w-[1180px] border-collapse text-left text-xs">
          <thead className="bg-[#1A0C33] text-[10px] uppercase tracking-wider text-[#F5D77F]">
            <tr>
              {["File","Album","Type","Size","Status","Arweave ID","Upload to R2 date","Permanent archive date"].map(label => <th key={label} className="border-b border-r border-[#DFB260]/25 px-3 py-3 font-semibold last:border-r-0">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const status=auditStatus(row);
              const statusColor=status === "Permanent" ? "text-emerald-300" : status.includes("failed") ? "text-rose-300" : status.includes("queued") || status.includes("uploading") || status.includes("submitted") || status.includes("processing") ? "text-amber-200" : "text-[#C8B1E4]";
              return <tr key={row.id} className="border-b border-[#DFB260]/15 last:border-b-0 hover:bg-[#1A0C33]/45">
                <td className="max-w-[260px] border-r border-[#DFB260]/15 px-3 py-2.5 font-medium text-[#FFF2A8]" title={row.name}><span className="block truncate">{row.name}</span></td>
                <td className="max-w-[190px] border-r border-[#DFB260]/15 px-3 py-2.5 text-[#C8B1E4]">{row.albumName ? <button onClick={() => onOpenAlbum?.(row.albumName || "")} className="max-w-full truncate text-left hover:text-[#F5D77F] hover:underline">{row.albumName}</button> : "—"}</td>
                <td className="border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[11px] text-[#C8B1E4]">{row.contentType || row.mimeType || "—"}</td>
                <td className="whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[#C8B1E4]">{formatBytes(Number(row.bytesTotal || 0))}</td>
                <td className={"whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 font-semibold " + statusColor} title={row.error || row.processingError || status}>{status}</td>
                <td className="border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[10px]">{row.arweaveId ? <a href={"https://arweave.net/" + row.arweaveId} target="_blank" rel="noreferrer" className="text-[#F5D77F] hover:underline" title={row.arweaveId}>{compactId(row.arweaveId)}</a> : "—"}</td>
                <td className="whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 text-[#C8B1E4]">{formatDate(row.r2UploadedAt)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#C8B1E4]">{formatDate(row.permanentArchiveDate)}</td>
              </tr>;
            })}
            {!loading && !rows.length && <tr><td colSpan={8} className="px-4 py-14 text-center text-[#C8B1E4]">No file operations have been recorded.</td></tr>}
            {loading && !rows.length && <tr><td colSpan={8} className="px-4 py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#F5D77F]" /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
