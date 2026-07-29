import React, { useEffect, useState } from "react";
import { HardDrive, Image, RefreshCw, Trash2, Video } from "lucide-react";

const formatBytes = (value = 0) => value >= 1024 ** 3 ? `${(value/1024**3).toFixed(2)} GB` : value >= 1024 ** 2 ? `${(value/1024**2).toFixed(1)} MB` : `${(value/1024).toFixed(0)} KB`;

export function StorageManagementView({ onOpenRecycle }: { onOpenRecycle: () => void }) {
  const [data, setData] = useState<any>(null);
  const load = async () => { const response = await fetch("/api/media/storage-summary"); if (response.ok) setData(await response.json()); };
  useEffect(() => { void load(); }, []);
  const totals = data?.totals || {};
  const totalBytes = Number(totals.activeBytes || 0) + Number(totals.trashBytes || 0);
  const quotaBytes = Number(data?.quotaBytes || 5368709120);
  const quotaPercent = Math.min(100, Math.round(Number(totals.activeBytes || 0) / Math.max(1,quotaBytes) * 100));
  return <section className="space-y-6 pb-16">
    <div className="cosmic-card p-6 sm:p-8 rounded-3xl flex flex-wrap justify-between gap-4"><div><p className="text-xs font-mono text-[#F5D77F] uppercase tracking-widest">Vault capacity</p><h1 className="font-cinzel text-3xl text-[#FFF2A8] font-bold mt-2">Storage Management</h1><p className="text-sm text-[#C8B1E4] mt-2">Original media usage, album distribution, and recoverable storage.</p></div><button onClick={load} className="gold-beveled-btn px-4 py-2 h-fit flex gap-2 text-xs"><RefreshCw className="w-4 h-4"/>Refresh</button></div>
    <div className="cosmic-card rounded-2xl p-5"><div className="flex justify-between text-sm"><strong className="text-[#FFF2A8]">{data?.plan || "starter"} plan</strong><span className={quotaPercent >= 90 ? "text-rose-300" : "text-[#C8B1E4]"}>{formatBytes(Number(totals.activeBytes||0))} of {formatBytes(quotaBytes)} · {quotaPercent}%</span></div><div className="h-3 rounded-full bg-black/40 overflow-hidden mt-3"><div className={quotaPercent>=90?"h-full bg-rose-500":"h-full bg-gradient-to-r from-[#B77A2D] to-[#FFF2A8]"} style={{width: String(quotaPercent)+"%"}}/></div>{quotaPercent>=80&&<p className="text-xs text-amber-200 mt-3">{quotaPercent>=100?"Storage limit reached. Uploads and cloud imports are blocked until space is freed.":"Your vault is approaching its storage limit."}</p>}</div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[[HardDrive,"Stored",formatBytes(totalBytes)],[Image,"Images",totals.imageCount||0],[Video,"Videos",totals.videoCount||0],[Trash2,"Recycle bin",formatBytes(Number(totals.trashBytes||0))]].map(([Icon,label,value]:any)=><div key={label} className="cosmic-card rounded-2xl p-5"><Icon className="w-5 h-5 text-[#F5D77F]"/><strong className="block text-2xl text-[#FFF2A8] mt-3">{value}</strong><span className="text-[10px] uppercase text-[#C8B1E4]">{label}</span></div>)}</div>
    <div className="cosmic-card rounded-3xl p-6"><div className="flex justify-between"><h2 className="font-cinzel text-xl text-[#FFF2A8]">Usage by album</h2><button onClick={onOpenRecycle} className="text-xs text-[#F5D77F]">Open recycle bin →</button></div><div className="space-y-4 mt-5">{(data?.albums||[]).map((album:any)=><div key={album.albumName}><div className="flex justify-between text-xs"><span className="text-[#FFF2A8]">{album.albumName} <small className="text-[#C8B1E4]">({album.count})</small></span><span>{formatBytes(Number(album.bytes))}</span></div><div className="h-2 bg-black/40 rounded-full mt-2 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B77A2D] to-[#FFF2A8]" style={{width:`${Math.max(2,Number(album.bytes)/Math.max(1,Number(totals.activeBytes))*100)}%`}}/></div></div>)}</div><p className="text-[10px] text-[#C8B1E4] mt-6">Estimated object-storage cost: ${data?.estimatedMonthlyStorageUsd ?? "—"}/month. Estimate only; provider requests and egress are not included.</p></div>
  </section>;
}
