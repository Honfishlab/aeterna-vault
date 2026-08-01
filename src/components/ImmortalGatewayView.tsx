import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, ExternalLink, FileCheck, FolderArchive, Globe, Loader2, Lock, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { Heir, LegacyLetter, MemoryItem } from "../types";
import { queuePermanentArchive, verifyAndDecryptArchive } from "../lib/permanentArchive";
import { PassphraseRecoveryVault } from "./PassphraseRecoveryVault";

interface ImmortalGatewayViewProps {
  memories: MemoryItem[];
  letters: LegacyLetter[];
  heirs: Heir[];
  onSelectView: (view: any) => void;
}

interface ArchiveJob {
  id: string;
  mediaId?: string | null;
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
  id: string; title: string; albumName?: string | null; transactionId: string; itemCount: number;
  status: "submitted" | "confirmed" | "failed"; blockHeight?: number | null; confirmations?: number; submittedAt: string;
}


interface AlbumArchiveItem {
  memoryId: string; mediaId: string; title: string; name: string; contentType: string;
  sizeBytes: number; mediaStatus: string; archiveStatus: string; archiveJobId?: string | null;
  transactionId?: string | null; archiveError?: string | null;
}

interface AlbumReadiness {
  albumName: string; itemCount: number; totalBytes: number; confirmedCount: number;
  pendingCount: number; failedCount: number; eligibleCount: number; ineligibleCount: number;
  items: AlbumArchiveItem[];
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
  const [publishingAll, setPublishingAll] = useState(false);
  const [albums, setAlbums] = useState<AlbumReadiness[]>([]);
  const [selectedAlbumName, setSelectedAlbumName] = useState("");
  const [albumPassphrase, setAlbumPassphrase] = useState("");
  const [bulkArchiving, setBulkArchiving] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({current:0,total:0,item:"",percent:0});
  const [estimatedCost, setEstimatedCost] = useState("");

  const load = useCallback(async () => {
    try {
      const [response,collectionResponse,albumResponse] = await Promise.all([
        fetch("/api/arweave/archive/jobs", { cache: "no-store" }),
        fetch("/api/arweave/collection", { cache: "no-store" }),
        fetch("/api/arweave/albums", { cache: "no-store" }),
      ]);
      const [body,collectionBody,albumBody] = await Promise.all([response.json(),collectionResponse.json(),albumResponse.json()]);
      if (!response.ok) throw new Error(body.error || "Archive records could not be loaded.");
      setJobs(body.jobs || []);
      setConfigured(Boolean(body.configured));
      if (collectionResponse.ok) setViewers(collectionBody.viewers || []);
      if (albumResponse.ok) { setAlbums(albumBody.albums || []); setSelectedAlbumName(current => current || albumBody.albums?.[0]?.albumName || ""); }
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

  const allFilesViewer = useMemo(() => viewers.find(viewer => !viewer.albumName && viewer.status === "confirmed"), [viewers]);
  const pendingAllFilesViewer = useMemo(() => viewers.find(viewer => !viewer.albumName && viewer.status === "submitted"), [viewers]);
  const confirmedArchiveCount = jobs.filter(job=>job.status==="confirmed").length;
  const allFilesViewerOutdated = Boolean(allFilesViewer && allFilesViewer.itemCount < confirmedArchiveCount);

  const publishAllFilesViewer = async () => {
    const confirmedCount=confirmedArchiveCount;
    if(!confirmedCount)return;
    if(!window.confirm(`Publish an independent Arweave viewer containing all ${confirmedCount} confirmed permanent archives? The viewer and its public metadata cannot be removed.`))return;
    setPublishingAll(true);setError("");
    try{
      const response=await fetch("/api/arweave/collection/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Aeterna — All Permanent Archives",scope:"all",acknowledgePermanent:true})});
      const body=await response.json();if(!response.ok)throw new Error(body.error||"All-files viewer publication failed.");
      await load();
    }catch(reason){setError(reason instanceof Error?reason.message:"All-files viewer publication failed.");}
    finally{setPublishingAll(false);}
  };

  const selectedAlbum = useMemo(() => albums.find(album => album.albumName === selectedAlbumName), [albums, selectedAlbumName]);
  const albumReady = Boolean(selectedAlbum && selectedAlbum.itemCount > 0 && selectedAlbum.confirmedCount === selectedAlbum.itemCount);

  useEffect(() => {
    if (!selectedAlbum?.totalBytes) { setEstimatedCost(""); return; }
    let active=true;
    fetch(`/api/arweave/archive/price?bytes=${Math.max(1,selectedAlbum.totalBytes)}`, { cache:"no-store" })
      .then(response=>response.json()).then(body=>{if(active)setEstimatedCost(body.ar ? `≈ ${body.ar} AR` : "Unavailable");})
      .catch(()=>{if(active)setEstimatedCost("Unavailable");});
    return ()=>{active=false;};
  }, [selectedAlbum?.albumName, selectedAlbum?.totalBytes]);

  const archiveEligibleAlbumItems = async () => {
    if (!selectedAlbum) return;
    if (albumPassphrase.length < 12) { setError("Use an archival passphrase of at least 12 characters."); return; }
    const eligible=selectedAlbum.items.filter(item=>item.archiveStatus==="r2_only"&&item.mediaStatus==="ready"&&item.sizeBytes>0&&item.sizeBytes<10*1024*1024-32);
    if (!eligible.length) { setError("This album has no eligible R2-only items to queue."); return; }
    if (!window.confirm(`Permanently archive ${eligible.length} eligible items from “${selectedAlbum.albumName}” to Arweave? This cannot be undone.`)) return;
    setBulkArchiving(true); setError(""); setBulkProgress({current:0,total:eligible.length,item:"",percent:0});
    try {
      for (let index=0; index<eligible.length; index+=1) {
        const item=eligible[index];
        setBulkProgress({current:index+1,total:eligible.length,item:item.name,percent:0});
        const response=await fetch(`/api/media/${encodeURIComponent(item.mediaId)}`, { cache:"no-store" });
        if(!response.ok)throw new Error(`Could not load ${item.name} from private storage.`);
        const blob=await response.blob();
        const file=new File([blob],item.name,{type:item.contentType||blob.type||"application/octet-stream"});
        await queuePermanentArchive(file,albumPassphrase,value=>setBulkProgress({current:index+1,total:eligible.length,item:item.name,percent:value}),item.mediaId);
      }
      setAlbumPassphrase("");
      await load();
    } catch(reason) {
      setError(reason instanceof Error?reason.message:"Album archive queueing failed.");
      await load();
    } finally {
      setBulkArchiving(false);
    }
  };

  const publishCollection = async () => {
    if (!acknowledgePermanent || !collectionTitle.trim()) return;
    setPublishing(true); setError("");
    try {
      const response=await fetch("/api/arweave/collection/publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:collectionTitle,albumName:selectedAlbumName,acknowledgePermanent})});
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
          <div className="flex flex-wrap gap-2">
            {allFilesViewer&&<a href={`https://arweave.net/${allFilesViewer.transactionId}`} target="_blank" rel="noreferrer" className="gold-filled-btn flex items-center gap-2 px-4 py-2 text-xs"><Globe className="h-4 w-4"/>Open Independent Viewer ({allFilesViewer.itemCount})<ExternalLink className="h-3.5 w-3.5"/></a>}
            {(!allFilesViewer||allFilesViewerOutdated)&&!pendingAllFilesViewer&&<button onClick={publishAllFilesViewer} disabled={publishingAll||confirmedArchiveCount===0} className="gold-filled-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-30">{publishingAll?<Loader2 className="h-4 w-4 animate-spin"/>:<Globe className="h-4 w-4"/>}{allFilesViewerOutdated?`Publish Updated Viewer (${confirmedArchiveCount} items)`:"Publish All-Files Viewer"}</button>}
            <button onClick={() => void load()} disabled={loading} className="gold-beveled-btn flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40"><RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"}/>Refresh records</button>
          </div>

        </div>
        {pendingAllFilesViewer?<div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100"><Loader2 className="h-4 w-4 animate-spin"/><span><strong>Viewer publication awaiting Arweave confirmation.</strong> The {pendingAllFilesViewer.itemCount}-item viewer will become clickable only after the transaction is found and confirmed on-chain.</span></div>:allFilesViewerOutdated&&<div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-500/10 p-3 text-xs text-amber-100"><strong>Independent viewer update available.</strong> The published viewer contains {allFilesViewer?.itemCount} of {confirmedArchiveCount} confirmed archives. Arweave pages are immutable, so publish a new version to include the remaining items.</div>}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Service wallet</p><p className={configured ? "text-emerald-300" : "text-amber-200"}>{configured ? "Configured" : "Not configured"}</p></div>
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Recorded jobs</p><p className="text-[#FFF2A8]">{jobs.length}</p></div>
          <div className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">Confirmed</p><p className="text-emerald-300">{jobs.filter(job => job.status === "confirmed").length}</p></div>
        </div>
      </section>

      <PassphraseRecoveryVault/>

      <section className="cosmic-card-gold rounded-3xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F5D77F]">Arweave album publisher</p><h2 className="mt-2 font-cinzel text-2xl text-[#FFF2A8]">Archive and publish a permanent album</h2><p className="mt-2 max-w-3xl text-xs text-[#C8B1E4]">Choose an existing vault album, encrypt its eligible R2 originals in this browser, track confirmation readiness, then publish a standalone album viewer that reads only from Arweave.</p></div>
          <FolderArchive className="h-8 w-8 text-[#F5D77F]"/>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-xs text-[#C8B1E4]"><span>Vault album</span><select aria-label="Vault album" value={selectedAlbumName} onChange={event=>{setSelectedAlbumName(event.target.value);setCollectionTitle(`${event.target.value} — Permanent Album`);setError("");}} className="rounded-xl border border-[#DFB260]/40 bg-[#120B21] p-3 text-sm text-[#FFF2A8]"><option value="">Select an album</option>{albums.map(album=><option key={album.albumName} value={album.albumName}>{album.albumName} ({album.confirmedCount}/{album.itemCount} confirmed)</option>)}</select></label>
          <button onClick={()=>void load()} className="gold-beveled-btn self-end px-4 py-3 text-xs"><RefreshCw className="mr-2 inline h-4 w-4"/>Refresh readiness</button>
        </div>

        {selectedAlbum && <div className="mt-4 space-y-4">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[["Items",selectedAlbum.itemCount],["Confirmed",selectedAlbum.confirmedCount],["Processing",selectedAlbum.pendingCount],["Ready to queue",selectedAlbum.eligibleCount],["Ineligible",selectedAlbum.ineligibleCount],["Estimated cost",estimatedCost||"Loading…"]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-[#120B21] p-3"><p className="text-[10px] text-[#C8B1E4]">{label}</p><p className="mt-1 text-sm text-[#FFF2A8]">{value}</p></div>)}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-gradient-to-r from-[#B77A2D] to-[#FFF2A8] transition-all" style={{width:`${selectedAlbum.itemCount?Math.round(selectedAlbum.confirmedCount/selectedAlbum.itemCount*100):0}%`}}/></div>
          <p className="text-[10px] text-[#C8B1E4]">{selectedAlbum.confirmedCount} of {selectedAlbum.itemCount} items permanently confirmed · {bytes(selectedAlbum.totalBytes)} source media. Cost is an approximate aggregate network quote; actual per-transaction cost may differ.</p>

          {selectedAlbum.eligibleCount>0&&<div className="rounded-2xl border border-[#DFB260]/30 bg-[#120B21]/70 p-4">
            <h3 className="font-cinzel text-sm text-[#FFF2A8]">Queue eligible album items</h3>
            <p className="mt-1 text-xs text-[#C8B1E4]">Files under 10 MB are fetched privately, encrypted locally one at a time, and staged for the Arweave worker. Aeterna never stores this passphrase.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]"><input type="password" value={albumPassphrase} onChange={event=>setAlbumPassphrase(event.target.value)} disabled={bulkArchiving} placeholder="Album archival passphrase (12+ characters)" className="rounded-xl border border-[#DFB260]/40 bg-[#0B0712] p-3 text-sm text-[#FFF2A8]"/><button onClick={archiveEligibleAlbumItems} disabled={bulkArchiving||albumPassphrase.length<12} className="gold-filled-btn flex items-center justify-center gap-2 px-5 py-3 text-xs disabled:opacity-30">{bulkArchiving?<Loader2 className="h-4 w-4 animate-spin"/>:<Lock className="h-4 w-4"/>}Encrypt & queue {selectedAlbum.eligibleCount} items</button></div>
          </div>}

          {bulkArchiving&&<div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4"><div className="flex justify-between gap-3 text-xs text-[#FFF2A8]"><span className="truncate">Item {bulkProgress.current} of {bulkProgress.total}: {bulkProgress.item}</span><span>{bulkProgress.percent}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-black/40"><div className="h-full bg-[#F5D77F] transition-all" style={{width:`${bulkProgress.percent}%`}}/></div><p className="mt-2 text-[10px] text-[#C8B1E4]">Keep this page open while browser encryption and staging are in progress. Arweave submission continues in the background afterward.</p></div>}

          <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-[#DFB260]/20 p-3">{selectedAlbum.items.map(item=><div key={item.mediaId} className="flex items-center justify-between gap-3 rounded-xl bg-[#120B21] p-3 text-xs"><span className="min-w-0"><strong className="block truncate text-[#FFF2A8]">{item.name}</strong><span className="text-[10px] text-[#C8B1E4]">{bytes(item.sizeBytes)}</span></span><span className={item.archiveStatus==="confirmed"?"text-emerald-300":item.archiveStatus==="failed"?"text-rose-300":item.archiveStatus==="r2_only"?"text-[#C8B1E4]":"text-amber-200"}>{item.archiveStatus==="r2_only"&&item.sizeBytes>=10*1024*1024-32?"over 10 MB":item.archiveStatus.replace("_"," ")}</span></div>)}</div>

          <div className="border-t border-[#DFB260]/20 pt-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input value={collectionTitle} onChange={event=>setCollectionTitle(event.target.value)} maxLength={100} className="rounded-xl border border-[#DFB260]/40 bg-[#120B21] p-3 text-sm text-[#FFF2A8]" placeholder="Permanent collection title"/><button onClick={publishCollection} disabled={publishing||!acknowledgePermanent||!albumReady} className="gold-filled-btn flex items-center justify-center gap-2 px-5 py-3 text-xs disabled:opacity-30">{publishing?<Loader2 className="h-4 w-4 animate-spin"/>:<Globe className="h-4 w-4"/>}Publish album viewer to Arweave</button></div>
            <label className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-100"><input aria-label="I understand the collection title" type="checkbox" checked={acknowledgePermanent} onChange={event=>setAcknowledgePermanent(event.target.checked)} className="mt-0.5"/><span>I understand the album title, filenames, transaction IDs, MIME types, and encrypted payload metadata will become public and permanent. Passphrases and plaintext are never published.</span></label>
            {!albumReady&&<p className="mt-3 text-xs text-amber-200">Publishing unlocks when every album item is confirmed on Arweave. Items over the current 10 MB direct-upload limit remain ineligible.</p>}
          </div>
        </div>}
        {!selectedAlbum&&<p className="mt-4 rounded-xl bg-amber-500/10 p-4 text-xs text-amber-100">No linked vault album is selected. Albums require media stored in the vault.</p>}
        {viewers.length>0&&<div className="mt-4 grid gap-2">{viewers.map(viewer=>viewer.status==="confirmed"?<a key={viewer.id} href={`https://arweave.net/${viewer.transactionId}`} target="_blank" rel="noreferrer" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFB260]/30 bg-[#120B21] p-3"><span><strong className="text-[#FFF2A8]">{viewer.title}</strong><span className="ml-2 text-[10px] text-[#C8B1E4]">{viewer.albumName?`${viewer.albumName} · `:""}{viewer.itemCount} items</span></span><span className="flex items-center gap-2 text-xs uppercase text-emerald-300">confirmed<ExternalLink className="h-4 w-4"/></span></a>:<div key={viewer.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#DFB260]/20 bg-[#120B21] p-3"><span><strong className="text-[#FFF2A8]">{viewer.title}</strong><span className="ml-2 text-[10px] text-[#C8B1E4]">{viewer.albumName?`${viewer.albumName} · `:""}{viewer.itemCount} items</span></span><span className={viewer.status==="failed"?"text-xs uppercase text-rose-300":"flex items-center gap-2 text-xs uppercase text-amber-200"}>{viewer.status==="submitted"&&<Loader2 className="h-3.5 w-3.5 animate-spin"/>}{viewer.status}</span></div>)}</div>}
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
