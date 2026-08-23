import React, { useEffect, useMemo, useState } from "react";
import { Archive, Loader2, Lock, RefreshCw, X } from "lucide-react";
import { downloadPermanentArchiveReceipt, MAX_PERMANENT_ARCHIVE_BYTES, pendingPermanentArchiveHandoffs, queuePermanentArchive } from "../lib/permanentArchive";

interface AuditRow {
  id: string;
  name: string;
  mediaId?: string | null;
  hasThumbnail?: boolean;
  albumName?: string | null;
  r2AlbumName?: string | null;
  arweaveAlbumName?: string | null;
  contentType?: string | null;
  mimeType?: string | null;
  bytesTotal?: number;
  status: string;
  processingStatus?: string | null;
  archiveStatus?: string | null;
  archiveJobId?: string | null;
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
  const [loadError, setLoadError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivePassphrase, setArchivePassphrase] = useState("");
  const [archiveError, setArchiveError] = useState("");
  const [archiving, setArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState({ current: 0, total: 0, item: "", percent: 0 });
  const [pendingHandoffs, setPendingHandoffs] = useState<ReturnType<typeof pendingPermanentArchiveHandoffs>>([]);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/audit/files");
    if (response.ok) { setRows((await response.json()).rows || []); setLoadError(""); } else { const body=await response.json().catch(()=>({})); setLoadError(body.error || "Audit records could not be loaded."); }
    setLoading(false);
  };

  useEffect(() => { void load(); setPendingHandoffs(pendingPermanentArchiveHandoffs()); }, []);
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

  const archiveEligibleRows = useMemo(() => rows.filter(row =>
    Boolean(row.mediaId) && Boolean(row.r2UploadedAt) && row.status === "complete" && !row.archiveStatus &&
    Number(row.bytesTotal || 0) > 0 && Number(row.bytesTotal || 0) <= MAX_PERMANENT_ARCHIVE_BYTES
  ), [rows]);

  const archiveR2Items = async () => {
    if (archivePassphrase.length < 12) { setArchiveError("Use a permanent-vault passphrase of at least 12 characters."); return; }
    if (!archiveEligibleRows.length) { setArchiveError("There are no eligible R2-only files to archive."); return; }
    if (!window.confirm(`Encrypt and permanently archive ${archiveEligibleRows.length} R2-only files to Arweave? Arweave transactions and fees cannot be reversed.`)) return;
    setArchiving(true); setArchiveError(""); setArchiveProgress({ current: 0, total: archiveEligibleRows.length, item: "", percent: 0 });
    try {
      for (let index = 0; index < archiveEligibleRows.length; index += 1) {
        const row = archiveEligibleRows[index];
        setArchiveProgress({ current: index + 1, total: archiveEligibleRows.length, item: row.name, percent: 0 });
        const response = await fetch(`/api/media/${encodeURIComponent(String(row.mediaId))}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Could not load ${row.name} from private R2 storage.`);
        const blob = await response.blob();
        const file = new File([blob], row.name, { type: row.contentType || row.mimeType || blob.type || "application/octet-stream" });
        await queuePermanentArchive(file, archivePassphrase, percent => setArchiveProgress({ current: index + 1, total: archiveEligibleRows.length, item: row.name, percent }), String(row.mediaId), row.r2AlbumName || row.albumName || undefined);
      }
      setArchivePassphrase(""); setArchiveOpen(false); await load();
    } catch (reason) { setArchiveError(reason instanceof Error ? reason.message : "R2 archive queueing failed."); await load(); }
    finally { setArchiving(false); }
  };

  return (
    <section className="space-y-5 pb-16">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#DFB260]/40 pb-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F5D77F]">Storage operations ledger</p>
          <h1 className="mt-1 font-cinzel text-3xl font-bold text-[#FFF2A8]">Activity &amp; Archive Status</h1>
          <p className="mt-1 text-xs text-[#C8B1E4]">{totals.files} files · {totals.r2} uploaded to R2 · {totals.permanent} permanently archived</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => { setArchiveOpen(true); setArchiveError(""); }} disabled={loading || !archiveEligibleRows.length} className="gold-filled-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40"><Archive className="h-4 w-4" /> Finish legacy archives ({archiveEligibleRows.length})</button>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 rounded-lg border border-[#DFB260]/50 px-3 py-2 text-xs text-[#FFF2A8] disabled:opacity-50"><RefreshCw className={"h-4 w-4 " + (loading ? "animate-spin" : "")} /> Refresh</button>
        </div>
      </header>

      {loadError && <div className="rounded-lg border border-rose-500/50 bg-rose-950/50 px-4 py-3 text-sm text-rose-200">{loadError}</div>}

      {pendingHandoffs.length>0&&<section className="rounded-xl border border-amber-300/45 bg-amber-300/10 p-4"><h2 className="font-cinzel text-base text-[#FFF2A8]">Permanent originals secured · viewing-copy setup interrupted</h2><p className="mt-1 text-xs text-[#C8B1E4]">These encrypted originals are already queued independently of this browser. Their receipts preserve the hashes and job references needed for support or recovery.</p><div className="mt-3 flex flex-wrap gap-2">{pendingHandoffs.map(item=><button key={item.jobId} type="button" onClick={()=>downloadPermanentArchiveReceipt(item.jobId)} className="rounded-lg border border-[#F5D77F]/45 px-3 py-2 text-xs text-[#FFF2A8] hover:bg-[#F5D77F]/10">Download receipt · {item.name}</button>)}</div></section>}

      {archiveOpen && <section className="rounded-xl border border-[#DFB260]/45 bg-[#120821]/95 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 className="flex items-center gap-2 font-cinzel text-lg text-[#FFF2A8]"><Lock className="h-4 w-4" /> Finish older R2-only uploads</h2><p className="mt-1 text-xs text-[#C8B1E4]">New uploads archive automatically. These {archiveEligibleRows.length} files predate that behavior and can be encrypted now to complete permanent storage.</p></div><button aria-label="Close archive panel" onClick={() => setArchiveOpen(false)} disabled={archiving} className="text-[#C8B1E4] hover:text-white disabled:opacity-30"><X className="h-5 w-5" /></button></div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row"><input type="password" value={archivePassphrase} onChange={event => setArchivePassphrase(event.target.value)} disabled={archiving} placeholder="Permanent-vault passphrase (12+ characters)" className="min-w-0 flex-1 rounded-lg border border-[#DFB260]/40 bg-[#080411] px-3 py-2.5 text-sm text-[#FFF2A8] outline-none focus:border-[#F5D77F]" /><button onClick={archiveR2Items} disabled={archiving || archivePassphrase.length < 12} className="gold-filled-btn flex items-center justify-center gap-2 px-5 py-2.5 text-xs disabled:opacity-30">{archiving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />} Encrypt &amp; queue all</button></div>
        {archiving && <div className="mt-3 text-xs text-[#FFF2A8]"><div className="flex justify-between gap-3"><span className="truncate">{archiveProgress.current} of {archiveProgress.total}: {archiveProgress.item}</span><span>{archiveProgress.percent}%</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#F5D77F] transition-[width]" style={{ width: `${archiveProgress.percent}%` }} /></div><p className="mt-2 text-[10px] text-amber-200">Keep this window open while browser encryption and staging complete.</p></div>}
        {archiveError && <p role="alert" className="mt-3 text-xs text-rose-300">{archiveError}</p>}
      </section>}

      <div className="overflow-x-auto rounded-lg border border-[#DFB260]/35 bg-[#0A0514]/90">
        <table className="w-full min-w-[1480px] border-collapse text-left text-xs">
          <thead className="bg-[#1A0C33] text-[10px] uppercase tracking-wider text-[#F5D77F]">
            <tr>
              {["Preview","File","R2 album","Arweave album","Type","Size","Status","Receipt","Arweave ID","Upload to R2 date","Permanent archive date"].map(label => <th key={label} className="border-b border-r border-[#DFB260]/25 px-3 py-3 font-semibold last:border-r-0">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const status=auditStatus(row);
              const statusColor=status === "Permanent" ? "text-emerald-300" : status.includes("failed") ? "text-rose-300" : status.includes("queued") || status.includes("uploading") || status.includes("submitted") || status.includes("processing") ? "text-amber-200" : "text-[#C8B1E4]";
              return <tr key={row.id} className="border-b border-[#DFB260]/15 last:border-b-0 hover:bg-[#1A0C33]/45">
                <td className="w-[68px] border-r border-[#DFB260]/15 px-2 py-2">{row.mediaId ? ((row.contentType || row.mimeType || "").startsWith("image/") || row.hasThumbnail ? <img src={"/api/media/" + encodeURIComponent(row.mediaId) + (row.hasThumbnail ? "/thumbnail?size=small" : "")} alt="" loading="lazy" className="h-11 w-11 rounded object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded bg-[#1A0C33] text-[9px] text-[#C8B1E4]">MEDIA</span>) : "—"}</td>
                <td className="max-w-[260px] border-r border-[#DFB260]/15 px-3 py-2.5 font-medium text-[#FFF2A8]" title={row.name}><>{row.mediaId ? <a href={"/api/media/" + encodeURIComponent(row.mediaId)} target="_blank" rel="noreferrer" className="block truncate hover:underline">{row.name}</a> : <span className="block truncate">{row.name}</span>}</></td>
                <td className="max-w-[190px] border-r border-[#DFB260]/15 px-3 py-2.5 text-[#C8B1E4]">{row.r2AlbumName || row.albumName ? <button onClick={() => onOpenAlbum?.(row.r2AlbumName || row.albumName || "")} className="max-w-full truncate text-left hover:text-[#F5D77F] hover:underline">{row.r2AlbumName || row.albumName}</button> : "—"}</td>
                <td className="max-w-[190px] border-r border-[#DFB260]/15 px-3 py-2.5 text-[#C8B1E4]">{row.arweaveAlbumName || "—"}</td>
                <td className="border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[11px] text-[#C8B1E4]">{row.contentType || row.mimeType || "—"}</td>
                <td className="whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[#C8B1E4]">{formatBytes(Number(row.bytesTotal || 0))}</td>
                <td className={"whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 font-semibold " + statusColor} title={row.error || row.processingError || status}>{status}</td>
                <td className="whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5">{row.archiveJobId ? <button type="button" onClick={()=>downloadPermanentArchiveReceipt(String(row.archiveJobId))} className="text-[#F5D77F] hover:underline">Download receipt</button> : "—"}</td>
                <td className="border-r border-[#DFB260]/15 px-3 py-2.5 font-mono text-[10px]">{row.arweaveId ? <a href={"https://arweave.net/" + row.arweaveId} target="_blank" rel="noreferrer" className="text-[#F5D77F] hover:underline" title={row.arweaveId}>{compactId(row.arweaveId)}</a> : "—"}</td>
                <td className="whitespace-nowrap border-r border-[#DFB260]/15 px-3 py-2.5 text-[#C8B1E4]">{formatDate(row.r2UploadedAt)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[#C8B1E4]">{formatDate(row.permanentArchiveDate)}</td>
              </tr>;
            })}
            {!loading && !rows.length && <tr><td colSpan={11} className="px-4 py-14 text-center text-[#C8B1E4]">No file operations have been recorded.</td></tr>}
            {loading && !rows.length && <tr><td colSpan={11} className="px-4 py-14 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-[#F5D77F]" /></td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
