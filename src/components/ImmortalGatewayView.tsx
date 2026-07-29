import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileCheck, Globe, Loader2, Lock, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Heir, LegacyLetter, MemoryItem } from "../types";
import { verifyAndDecryptArchive } from "../lib/permanentArchive";

interface ImmortalGatewayViewProps {
  memories: MemoryItem[];
  letters: LegacyLetter[];
  heirs: Heir[];
  onSelectView: (view: any) => void;
}

interface ArchiveJob {
  id: string;
  name: string;
  sizeBytes: number;
  payloadHash: string;
  encryptionMetadata: Record<string, unknown>;
  contentType: string;
  status: "staging" | "queued" | "uploading" | "submitted" | "confirmed" | "failed" | "cancelled";
  transactionId?: string | null;
  blockHeight?: number | null;
  confirmations?: number;
  error?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
}

interface Verification {
  verified: boolean;
  hash?: string | null;
  size?: number | null;
  gateways?: Array<{ gateway: string; verified: boolean; status: number | null; hash: string | null; size: number | null; error?: string }>;
}

interface CollectionViewer {
  id: string; title: string; transactionId: string; itemCount: number;
  status: "submitted" | "confirmed" | "failed"; blockHeight?: number | null; confirmations?: number; submittedAt: string;
}

const bytes = (value: number) => value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(2)} MB` : `${Math.ceil(value / 1024)} KB`;

export const ImmortalGatewayView: React.FC<ImmortalGatewayViewProps> = () => {
  const [jobs, setJobs] = useState<ArchiveJob[]>([]);
  const [configured, setConfigured] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [error, setError] = useState("");
  const [verification, setVerification] = useState<Record<string, Verification>>({});
  const [viewers, setViewers] = useState<CollectionViewer[]>([]);
  const [collectionTitle, setCollectionTitle] = useState("My Aeterna Permanent Collection");
  const [acknowledgePermanent, setAcknowledgePermanent] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [response,collectionResponse] = await Promise.all([
        fetch("/api/arweave/archive/jobs", { cache: "no-store" }),
        fetch("/api/arweave/collection", { cache: "no-store" }),
      ]);
      const [body,collectionBody] = await Promise.all([response.json(),collectionResponse.json()]);
      if (!response.ok) throw new Error(body.error || "Archive records could not be loaded.");
      setJobs(body.jobs || []);
      setConfigured(Boolean(body.configured));
      if (collectionResponse.ok) setViewers(collectionBody.viewers || []);
      setSelectedId(current => current || body.jobs?.[0]?.id || "");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Archive records could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  const selected = useMemo(() => jobs.find(job => job.id === selectedId) || jobs[0], [jobs, selectedId]);
  const proof = selected ? verification[selected.id] : undefined;
  const verified = Boolean(selected?.transactionId && proof?.verified);

  const check = async () => {
    if (!selected?.transactionId) return;
    setChecking(true);
    setError("");
    try {
      const response = await fetch(`/api/arweave/archive/verify/${encodeURIComponent(selected.id)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Gateway verification failed.");
      setVerification(current => ({ ...current, [selected.id]: body }));
      if (!body.verified) setError("The encrypted payload did not pass both gateway checks.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Gateway verification failed.");
    } finally {
      setChecking(false);
    }
  };

  const recover = async () => {
    if (!selected || !verified) return;
    const passphrase = window.prompt("Enter the archival passphrase. It remains in this browser only:");
    if (!passphrase) return;
    setRecovering(true);
    setError("");
    try {
      const blob = await verifyAndDecryptArchive(selected, passphrase);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = selected.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The archive could not be recovered.");
    } finally {
      setRecovering(false);
    }
  };

  const downloadManifest = () => {
    if (!selected || !verified) return;
    const manifest = { application: "Aeterna Vault", schema: 1, verifiedAt: new Date().toISOString(), archive: selected, verification: proof };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${selected.name}.arweave-manifest.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const publishCollection = async () => {
    if (!acknowledgePermanent || !collectionTitle.trim()) return;
    setPublishing(true); setError("");
    try {
      const response=await fetch("/api/arweave/collection/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:collectionTitle,acknowledgePermanent})});
      const body=await response.json(); if(!response.ok)throw new Error(body.error||"Collection publication failed.");
      await load();
    } catch(reason) { setError(reason instanceof Error?reason.message:"Collection publication failed."); }
    finally { setPublishing(false); }
  };

  return <div className="min-h-screen px-4 py-8 text-[#E8DDF5]">
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="cosmic-card-gold rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F5D77F]">Verified permanent storage</p><h1 className="mt-2 font-cinzel text-3xl font-bold text-[#FFF2A8]">Immortal Arweave Archive</h1><p className="mt-2 max-w-3xl text-sm text-[#C8B1E4]">Only authenticated archive jobs recorded by Aeterna appear here. No transaction, block, gateway, or confirmation values are simulated.</p></div>
          <button onClick={() => void load()} disabled={loading} className="gold-beveled-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}/>Refresh records</button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Service wallet</p><p className={configured ? "text-emerald-300" : "text-amber-200"}>{configured ? "Configured" : "Not configured"}</p></div>
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Recorded jobs</p><p className="text-[#FFF2A8]">{jobs.length}</p></div>
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Confirmed</p><p className="text-emerald-300">{jobs.filter(job => job.status === "confirmed").length}</p></div>
        </div>
      </section>

      <section className="cosmic-card-gold rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F5D77F]">Arweave-hosted collection</p><h2 className="mt-2 font-cinzel text-2xl text-[#FFF2A8]">Publish a permanent collection viewer</h2><p className="mt-2 max-w-3xl text-xs text-[#C8B1E4]">Creates a standalone HTML gallery transaction on Arweave. It references only confirmed Arweave payloads, fetches no media from R2, verifies every ciphertext hash, and decrypts locally.</p></div><Globe className="h-8 w-8 text-[#F5D77F]"/></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]"><input value={collectionTitle} onChange={event=>setCollectionTitle(event.target.value)} maxLength={100} className="rounded-xl border border-[#DFB260]/40 bg-[#120B21] p-3 text-sm text-[#FFF2A8]" placeholder="Permanent collection title"/><button onClick={publishCollection} disabled={publishing||!acknowledgePermanent||!jobs.some(job=>job.status==="confirmed")} className="gold-filled-btn flex items-center justify-center gap-2 px-5 py-3 text-xs disabled:opacity-30">{publishing?<Loader2 className="h-4 w-4 animate-spin"/>:<Globe className="h-4 w-4"/>}Publish collection to Arweave</button></div>
        <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-100"><input type="checkbox" checked={acknowledgePermanent} onChange={event=>setAcknowledgePermanent(event.target.checked)} className="mt-0.5"/><span>I understand the collection title, filenames, transaction IDs, MIME types, and encrypted payload metadata will become public and permanent. Passphrases and plaintext are never published.</span></label>
        {!jobs.some(job=>job.status==="confirmed")&&<p className="mt-3 text-xs text-amber-200">At least one confirmed archive is required before a collection viewer can be published.</p>}
        {viewers.length>0&&<div className="mt-4 grid gap-2">{viewers.map(viewer=><a key={viewer.id} href={`https://arweave.net/${viewer.transactionId}`} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFB260]/30 bg-[#120B21] p-3"><span><strong className="text-[#FFF2A8]">{viewer.title}</strong><span className="ml-2 text-[10px] text-[#C8B1E4]">{viewer.itemCount} items</span></span><span className="flex items-center gap-2 text-xs uppercase text-[#F5D77F]">{viewer.status}<ExternalLink className="h-4 w-4"/></span></a>)}</div>}
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200"><ShieldAlert className="h-4 w-4"/>{error}</div>}

      {!loading && jobs.length === 0 ? <section className="cosmic-card rounded-2xl p-10 text-center"><Lock className="mx-auto h-8 w-8 text-[#F5D77F]"/><h2 className="mt-3 font-cinzel text-xl text-[#FFF2A8]">No permanent archives yet</h2><p className="mt-2 text-sm text-[#C8B1E4]">Files stored only in R2 do not appear here. Queue an encrypted archive from the upload form or Account Management.</p></section> :
      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        <aside className="cosmic-card rounded-2xl p-3"><h2 className="px-2 py-2 font-cinzel text-sm text-[#FFF2A8]">Archive records</h2><div className="max-h-[65vh] space-y-2 overflow-y-auto">{jobs.map(job => <button key={job.id} onClick={() => { setSelectedId(job.id); setError(""); }} className={`w-full rounded-xl border p-3 text-left ${selected?.id === job.id ? "border-[#F5D77F] bg-[#DFB260]/15" : "border-[#DFB260]/20 bg-[#120B21]"}`}><p className="truncate text-xs font-semibold text-[#FFF2A8]">{job.name}</p><div className="mt-2 flex justify-between text-[10px]"><span className="uppercase text-[#F5D77F]">{job.status}</span><span className="text-[#C8B1E4]">{bytes(Number(job.sizeBytes || 0))}</span></div></button>)}</div></aside>

        {selected && <main className="cosmic-card-gold rounded-2xl p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] uppercase text-[#F5D77F]">Selected archive</p><h2 className="mt-1 break-all font-cinzel text-2xl text-[#FFF2A8]">{selected.name}</h2></div><span className={`rounded-full px-3 py-1 text-xs uppercase ${selected.status === "confirmed" ? "bg-emerald-500/20 text-emerald-200" : selected.status === "failed" ? "bg-rose-500/20 text-rose-200" : "bg-amber-500/20 text-amber-100"}`}>{selected.status}</span></div>
          <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-xl bg-[#120B21] p-3"><dt className="text-[#C8B1E4]">Ciphertext SHA-256</dt><dd className="mt-1 break-all font-mono text-[#FFF2A8]">{selected.payloadHash}</dd></div>
            <div className="rounded-xl bg-[#120B21] p-3"><dt className="text-[#C8B1E4]">Encryption</dt><dd className="mt-1 text-[#FFF2A8]">AES-256-GCM · browser encrypted</dd></div>
            <div className="rounded-xl bg-[#120B21] p-3"><dt className="text-[#C8B1E4]">Block height</dt><dd className="mt-1 text-[#FFF2A8]">{selected.blockHeight || "Awaiting confirmation"}</dd></div>
            <div className="rounded-xl bg-[#120B21] p-3"><dt className="text-[#C8B1E4]">Confirmations</dt><dd className="mt-1 text-[#FFF2A8]">{selected.confirmations || 0}</dd></div>
          </dl>
          {selected.transactionId ? <div className="mt-4 rounded-xl border border-[#DFB260]/30 bg-[#120B21] p-4"><p className="text-[10px] uppercase text-[#C8B1E4]">Real transaction ID</p><p className="mt-2 break-all font-mono text-xs text-[#F5D77F]">{selected.transactionId}</p></div> : <div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-xs text-amber-100">No Arweave transaction has been submitted. Gateway, recovery, and download controls are disabled.</div>}
          {selected.error && <p className="mt-3 rounded-xl bg-rose-500/10 p-3 text-xs text-rose-200">{selected.error}</p>}

          <section className="mt-5 rounded-2xl border border-[#DFB260]/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="flex items-center gap-2 font-cinzel text-[#FFF2A8]"><ShieldCheck className="h-4 w-4"/>Independent gateway verification</h3><p className="mt-1 text-xs text-[#C8B1E4]">Both configured gateways must return ciphertext matching the recorded SHA-256 hash.</p></div><button onClick={check} disabled={!selected.transactionId || checking} className="gold-filled-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-30">{checking ? <Loader2 className="h-4 w-4 animate-spin"/> : <Globe className="h-4 w-4"/>}Verify gateways</button></div>
            {proof?.gateways && <div className="mt-4 space-y-2">{proof.gateways.map(gateway => <div key={gateway.gateway} className="flex flex-wrap justify-between gap-2 rounded-xl bg-[#120B21] p-3 text-xs"><span>{gateway.gateway}</span><span className={gateway.verified ? "text-emerald-300" : "text-rose-300"}>{gateway.verified ? `Verified · HTTP ${gateway.status}` : gateway.error || `Failed · HTTP ${gateway.status || "network"}`}</span></div>)}</div>}
            {verified && <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4"/>Ciphertext independently verified.</p>}
          </section>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <a href={verified ? `https://arweave.net/${selected.transactionId}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!verified} className={`gold-beveled-btn flex items-center justify-center gap-2 px-3 py-3 text-xs ${verified ? "" : "pointer-events-none opacity-30"}`}><ExternalLink className="h-4 w-4"/>Open gateway</a>
            <button onClick={recover} disabled={!verified || recovering} className="gold-filled-btn flex items-center justify-center gap-2 px-3 py-3 text-xs disabled:opacity-30">{recovering ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}Verify, decrypt and download</button>
            <button onClick={downloadManifest} disabled={!verified} className="gold-beveled-btn flex items-center justify-center gap-2 px-3 py-3 text-xs disabled:opacity-30"><FileCheck className="h-4 w-4"/>Download proof manifest</button>
          </div>
        </main>}
      </div>}
    </div>
  </div>;
};
