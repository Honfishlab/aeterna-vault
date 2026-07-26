import React, { useEffect, useState } from "react";
import { Check, Cloud, ExternalLink, Image as ImageIcon, Loader2, LogOut, RefreshCw, Video, X } from "lucide-react";

export interface ImportedCloudMedia {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  mediaId: string;
  mediaUrl: string;
  createdTime?: string | null;
}

interface ProviderStatus {
  configured: boolean;
  connected: boolean;
  accountEmail?: string | null;
  displayName?: string | null;
  redirectUri?: string;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime?: string | null;
  width?: number | null;
  height?: number | null;
  thumbnailUrl: string;
}

export function CloudImportModal({ isOpen, onClose, onImported }: {
  isOpen: boolean;
  onClose: () => void;
  onImported: (items: ImportedCloudMedia[]) => void;
}) {
  const [status, setStatus] = useState<ProviderStatus | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google/status");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to check Google Drive.");
      setStatus(body);
      if (body.connected) await loadFiles(null, true);
    } catch (reason: any) {
      setError(reason?.message || "Unable to check Google Drive.");
    } finally {
      setLoading(false);
    }
  };

  const loadFiles = async (pageToken: string | null, replace = false) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google/files" + (pageToken ? "?pageToken=" + encodeURIComponent(pageToken) : ""));
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to load Drive media.");
      setFiles(previous => replace ? body.files : [...previous, ...body.files]);
      setNextPageToken(body.nextPageToken || null);
    } catch (reason: any) {
      setError(reason?.message || "Unable to load Drive media.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    loadStatus();
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === "aeterna-provider-oauth") loadStatus();
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [isOpen]);

  if (!isOpen) return null;

  const connect = () => {
    const popup = window.open("/api/integrations/google/connect", "aeterna-google-drive", "popup=yes,width=560,height=720");
    if (!popup) setError("Allow popups for Aeterna Vault, then try again.");
  };

  const disconnect = async () => {
    setLoading(true);
    const response = await fetch("/api/integrations/google/disconnect", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    if (response.ok) {
      setStatus(previous => previous ? { ...previous, connected: false } : null);
      setFiles([]);
      setSelected([]);
    } else setError("Google Drive could not be disconnected.");
    setLoading(false);
  };

  const importSelected = async () => {
    setImporting(true);
    setError("");
    try {
      const response = await fetch("/api/integrations/google/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: selected }),
      });
      const body = await response.json();
      if (!response.ok && !body.imported?.length) throw new Error(body.error || "Import failed.");
      onImported(body.imported || []);
      if (body.failed?.length) setError(`${body.failed.length} item(s) could not be imported.`);
      else onClose();
    } catch (reason: any) {
      setError(reason?.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-[#08030f]/90 backdrop-blur-md flex items-center justify-center p-3">
      <div className="cosmic-card-gold w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-[#DFB260]">
        <div className="p-5 border-b border-[#DFB260]/30 flex items-center justify-between">
          <div>
            <div className="text-[#F5D77F] text-xs font-mono uppercase tracking-wider flex items-center gap-2"><Cloud className="w-4 h-4" /> Connected media</div>
            <h2 className="font-cinzel text-2xl text-[#FFF2A8] font-bold">Import from Google Drive</h2>
            <p className="text-xs text-[#C8B1E4] mt-1">Selected originals transfer securely into your private Aeterna R2 vault.</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#C8B1E4] hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          {error && <div className="mb-4 p-3 rounded-xl border border-rose-500/50 bg-rose-950/40 text-rose-200 text-sm">{error}</div>}
          {loading && !files.length ? (
            <div className="py-20 flex justify-center text-[#F5D77F]"><Loader2 className="w-8 h-8 animate-spin" /></div>
          ) : !status?.configured ? (
            <div className="py-14 text-center space-y-4">
              <Cloud className="w-12 h-12 mx-auto text-[#DFB260]" />
              <h3 className="text-xl text-[#FFF2A8] font-cinzel">Google Drive needs administrator setup</h3>
              <p className="text-sm text-[#C8B1E4] max-w-xl mx-auto">Add the Google OAuth client ID, client secret, and provider token-encryption key to the Render environment.</p>
              {status?.redirectUri && <code className="block text-xs text-[#F5D77F] break-all">{status.redirectUri}</code>}
            </div>
          ) : !status.connected ? (
            <div className="py-14 text-center space-y-5">
              <Cloud className="w-14 h-14 mx-auto text-[#DFB260]" />
              <div>
                <h3 className="text-xl text-[#FFF2A8] font-cinzel">Connect your Google Drive</h3>
                <p className="text-sm text-[#C8B1E4] mt-2">Aeterna requests read-only access. It cannot edit or delete your Drive files.</p>
              </div>
              <button onClick={connect} className="gold-filled-btn px-6 py-3 inline-flex items-center gap-2"><ExternalLink className="w-4 h-4" /> Connect Google Drive</button>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-[#C8B1E4]">Connected as <strong className="text-[#FFF2A8]">{status.accountEmail || status.displayName}</strong></div>
                <div className="flex gap-2">
                  <button onClick={() => loadFiles(null, true)} className="gold-beveled-btn px-3 py-2 text-xs flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
                  <button onClick={disconnect} className="px-3 py-2 text-xs text-rose-300 border border-rose-500/40 rounded-xl flex items-center gap-1"><LogOut className="w-3.5 h-3.5" /> Disconnect</button>
                </div>
              </div>
              {!files.length ? <div className="py-16 text-center text-[#C8B1E4]">No supported images or videos were found.</div> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {files.map(file => {
                    const active = selected.includes(file.id);
                    return (
                      <button key={file.id} type="button" onClick={() => setSelected(values => active ? values.filter(id => id !== file.id) : values.length < 25 ? [...values, file.id] : values)}
                        className={`relative text-left rounded-2xl overflow-hidden border transition-all ${active ? "border-[#F5D77F] ring-2 ring-[#F5D77F]/50" : "border-[#DFB260]/25 hover:border-[#DFB260]"}`}>
                        <div className="aspect-square bg-[#120B21]">
                          {file.mimeType.startsWith("image/") ? <img src={file.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" /> :
                            <div className="w-full h-full flex items-center justify-center"><Video className="w-10 h-10 text-[#DFB260]" /></div>}
                        </div>
                        <div className="p-2 bg-[#160b28]">
                          <p className="text-[11px] text-[#FFF2A8] truncate">{file.name}</p>
                          <p className="text-[9px] text-[#C8B1E4]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                        <span className={`absolute top-2 right-2 w-6 h-6 rounded-full border flex items-center justify-center ${active ? "bg-[#F5D77F] text-[#120B21] border-[#FFF2A8]" : "bg-black/50 border-white/50"}`}>{active ? <Check className="w-4 h-4" /> : file.mimeType.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <Video className="w-3 h-3" />}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {nextPageToken && <button onClick={() => loadFiles(nextPageToken)} disabled={loading} className="mt-5 w-full gold-beveled-btn py-2 text-xs">Load more media</button>}
            </>
          )}
        </div>

        {status?.connected && (
          <div className="p-4 border-t border-[#DFB260]/30 flex items-center justify-between">
            <span className="text-xs text-[#C8B1E4]">{selected.length} selected · maximum 25 per import</span>
            <button onClick={importSelected} disabled={!selected.length || importing} className="gold-filled-btn px-6 py-3 flex items-center gap-2 disabled:opacity-40">
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />} Import into Vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
