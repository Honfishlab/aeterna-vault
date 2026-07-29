import React, { useEffect, useState } from "react";
import { RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { MemoryItem } from "../types";

interface DeletedAlbum {
  id: string;
  albumName: string;
  itemCount: number;
  mediaCount: number;
  deletedAt: string;
  purgeAfter: string;
}

export function RecycleBinView({ onRestore }: { onRestore: (items: MemoryItem[]) => void }) {
  const [albums, setAlbums] = useState<DeletedAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const response = await fetch("/api/media/recycle-bin");
    if (response.ok) setAlbums((await response.json()).albums || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const action = async (album: DeletedAlbum, permanent: boolean) => {
    if (permanent && !window.confirm(`Permanently delete “${album.albumName}”? This cannot be undone.`)) return;
    setBusy(album.id);
    const response = await fetch(permanent ? "/api/media/purge-album" : "/api/media/restore-album", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: album.id }),
    });
    if (response.ok) {
      const result = await response.json();
      if (!permanent) onRestore(result.items || []);
      setAlbums(previous => previous.filter(item => item.id !== album.id));
    } else window.alert((await response.json()).error || "The recycle-bin action failed.");
    setBusy(null);
  };

  return <section className="space-y-6 pb-16">
    <div className="cosmic-card p-6 sm:p-8 rounded-3xl flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-mono text-[#F5D77F] uppercase tracking-widest">30-day recovery</p><h1 className="font-cinzel text-3xl text-[#FFF2A8] font-bold mt-2">Recycle Bin</h1><p className="text-sm text-[#C8B1E4] mt-2">Restore albums with their original metadata, or permanently remove them.</p></div>
      <button onClick={load} className="gold-beveled-btn px-4 py-2 flex gap-2 text-xs"><RefreshCw className="w-4 h-4"/>Refresh</button>
    </div>
    {!loading && !albums.length && <div className="cosmic-card rounded-3xl p-12 text-center text-[#C8B1E4]"><Trash2 className="mx-auto mb-3 text-[#F5D77F]"/>Recycle bin is empty.</div>}
    <div className="grid md:grid-cols-2 gap-4">{albums.map(album => {
      const days = Math.max(0, Math.ceil((new Date(album.purgeAfter).getTime() - Date.now()) / 86400000));
      return <article key={album.id} className="cosmic-card rounded-2xl p-5">
        <h2 className="font-cinzel text-lg font-bold text-[#FFF2A8]">{album.albumName}</h2>
        <p className="text-xs text-[#C8B1E4] mt-2">{album.itemCount} items · {album.mediaCount} stored originals · {days} days remaining</p>
        <div className="flex gap-2 mt-5"><button disabled={busy===album.id} onClick={() => action(album,false)} className="gold-filled-btn px-4 py-2 text-xs flex gap-2"><RotateCcw className="w-4 h-4"/>Restore</button><button disabled={busy===album.id} onClick={() => action(album,true)} className="px-4 py-2 text-xs rounded-xl border border-rose-500/50 text-rose-300">Delete permanently</button></div>
      </article>;
    })}</div>
  </section>;
}
