import React, { useState, useEffect } from 'react';
import { 
  X, Globe, ExternalLink, Share2, Info, Trash2, 
  ChevronLeft, ChevronRight, FolderEdit, Clock, MapPin, 
  ShieldCheck, Copy, Check, Users, Sparkles, Loader2, Tag
} from 'lucide-react';

export interface ImageViewerData {
  id?: string;
  imageUrl: string;
  title: string;
  description?: string;
  date?: string;
  time?: string;
  location?: string;
  category?: string;
  albumName?: string;
  tags?: string[];
  people?: string[];
  autoTags?: {
    category?: string;
    people?: string[];
    location?: string;
    tags?: string[];
  };
  permawebTxId?: string;
  encryptionLevel?: string;
  blockHeight?: number;
}

interface ImageViewerModalProps {
  image: ImageViewerData | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  onDelete?: (id: string) => void;
  onSelectView?: (view: string) => void;
  onOpenEditAlbum?: (albumName: string) => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  onDelete,
  onSelectView,
  onOpenEditAlbum
}) => {
  const [showInfo, setShowInfo] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  if (!image) return null;

  const txId = image.permawebTxId || 'ar_9xK2mP1a8f331';
  const arweaveUrl = `https://arweave.net/${txId}`;
  const encryption = image.encryptionLevel || 'AES-GCM-256 Vault';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(arweaveUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#05020A]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-fade-in">
      {/* TOP FLOATING CONTROL BAR */}
      <div 
        className="relative z-20 w-full p-4 sm:px-6 bg-gradient-to-b from-black/90 via-black/50 to-transparent flex items-center justify-between text-white border-b border-[#DFB260]/30"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center space-x-3 truncate pr-4">
          <div className="p-2 rounded-xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#F5D77F]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="truncate">
            <h4 className="font-cinzel font-bold text-sm sm:text-base text-[#FFF2A8] truncate">
              {image.title || 'Untitled Memory Asset'}
            </h4>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#F5D77F]">
              <span>{image.category || 'Personal'}</span>
              <span>•</span>
              <span>Arweave Tx: {txId.slice(0, 10)}...</span>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          {onSelectView && (
            <button
              onClick={() => {
                onClose();
                onSelectView('immortal');
              }}
              className="p-2 rounded-full hover:bg-white/10 text-[#F5D77F] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 bg-white/10 border border-[#DFB260]/40"
              title="Immortal Gateway Independent Viewer"
            >
              <Globe className="w-4 h-4 text-[#F5D77F]" />
              <span className="text-xs font-mono font-bold hidden sm:inline">Immortal Gateway</span>
            </button>
          )}

          <a
            href={image.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer hidden sm:flex"
            title="Open Original Image"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
            title="Copy Immutable Arweave URL"
          >
            {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setShowInfo(prev => !prev)}
            className={`p-2 rounded-full transition-colors cursor-pointer ${
              showInfo ? 'bg-[#DFB260] text-black font-bold shadow-lg' : 'hover:bg-white/10 text-white/90'
            }`}
            title="Toggle Details Info Sidebar"
          >
            <Info className="w-5 h-5" />
          </button>

          {onDelete && image.id && (
            <button
              onClick={() => {
                onDelete(image.id!);
                onClose();
              }}
              className="p-2 rounded-full hover:bg-red-600/80 text-red-400 hover:text-white transition-colors cursor-pointer"
              title="Delete Memory Item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer"
            title="Close Viewer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT CANVAS & SIDEBAR CONTAINER */}
      <div className="relative w-full h-full flex-1 flex items-center justify-center overflow-hidden">
        {/* IMAGE DISPLAY */}
        <div 
          className="relative w-full h-full flex-1 flex items-center justify-center p-4 overflow-hidden cursor-pointer"
          onClick={onClose}
        >
          <img
            src={image.imageUrl}
            alt={image.title}
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
            className="max-w-full max-h-full w-auto h-auto object-contain select-none transition-all duration-300 pointer-events-auto rounded-xl shadow-2xl border border-[#DFB260]/30"
            style={{
              maxHeight: 'calc(100vh - 120px)',
              maxWidth: showInfo ? 'calc(100vw - 380px)' : '100vw'
            }}
          />

          {/* PREVIOUS & NEXT NAV BUTTONS */}
          {hasPrev && onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-[#DFB260] text-white hover:text-black flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xl opacity-80 hover:opacity-100"
              title="Previous Photo (Left Arrow)"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
          )}

          {hasNext && onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-12 h-12 rounded-full bg-black/60 hover:bg-[#DFB260] text-white hover:text-black flex items-center justify-center backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-2xl opacity-80 hover:opacity-100"
              title="Next Photo (Right Arrow)"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          )}
        </div>

        {/* BOTTOM OVERLAY BAR (when sidebar is closed) */}
        {!showInfo && (
          <div 
            className="absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-1 max-w-3xl">
              <div className="flex items-center space-x-2 text-xs font-mono text-[#F5D77F]">
                {image.date && <span>{image.date} {image.time ? `• ${image.time}` : ''}</span>}
                {image.location && (
                  <>
                    <span>•</span>
                    <span>📍 {image.location}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-white/90 font-medium line-clamp-2 leading-relaxed">
                {image.description || 'Verified heirloom media asset sealed on Arweave blockweave storage.'}
              </p>
              {image.tags && image.tags.length > 0 && (
                <div className="flex items-center space-x-1.5 pt-1 flex-wrap gap-y-1">
                  {image.tags.map((t) => (
                    <span key={t} className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/10 text-[#FFF2A8] border border-white/20">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setShowInfo(true)}
              className="gold-beveled-btn text-xs px-4 py-2 text-[#FFF2A8] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-end sm:self-center"
            >
              <Info className="w-4 h-4 text-[#F5D77F]" />
              <span>View Full Details</span>
            </button>
          </div>
        )}

        {/* RIGHT DETAILS PANEL */}
        {showInfo && (
          <div 
            className="absolute top-0 right-0 bottom-0 z-40 w-full sm:w-96 bg-[#0e071b]/95 backdrop-blur-2xl border-l border-[#DFB260]/40 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl text-white pointer-events-auto animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-4">
                <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#F5D77F]" />
                  <span>Photo &amp; Storage Details</span>
                </h3>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Details List */}
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider block font-bold mb-1">
                    Title
                  </label>
                  <p className="font-bold text-sm text-[#FFF2A8]">{image.title}</p>
                </div>

                <div>
                  <label className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider block font-bold mb-1">
                    Description
                  </label>
                  <p className="text-[#C8B1E4] leading-relaxed font-medium bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/20">
                    {image.description || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/20">
                  <div>
                    <span className="text-[10px] text-[#F5D77F] font-mono block">Date Preserved</span>
                    <span className="font-bold text-[#FFF2A8]">{image.date || 'Recent'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#F5D77F] font-mono block">Time</span>
                    <span className="font-bold text-[#FFF2A8]">{image.time || 'N/A'}</span>
                  </div>
                </div>

                {image.location && (
                  <div className="bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/20">
                    <span className="text-[10px] text-[#F5D77F] font-mono block">Location</span>
                    <span className="font-bold text-[#FFF2A8]">📍 {image.location}</span>
                  </div>
                )}

                {image.people && image.people.length > 0 && (
                  <div>
                    <label className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider flex items-center gap-1 font-bold mb-1.5">
                      <Users className="w-3 h-3 text-[#F5D77F]" />
                      <span>People Featured</span>
                    </label>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {image.people.map((p) => (
                        <span key={p} className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 font-semibold flex items-center gap-1">
                          <Users className="w-2.5 h-2.5 text-[#F5D77F]" />
                          <span>{p}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {image.albumName && (
                  <div className="bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/20 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#F5D77F] font-mono block">Album</span>
                      <span className="font-bold text-[#FFF2A8]">📁 {image.albumName}</span>
                    </div>
                    {onOpenEditAlbum && (
                      <button
                        onClick={() => {
                          const name = image.albumName!;
                          onClose();
                          onOpenEditAlbum(name);
                        }}
                        className="text-[11px] text-[#F5D77F] hover:underline flex items-center gap-1 font-semibold cursor-pointer bg-[#DFB260]/20 px-2.5 py-1 rounded-lg border border-[#DFB260]/40"
                      >
                        <FolderEdit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                )}

                {image.tags && image.tags.length > 0 && (
                  <div>
                    <label className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider block font-bold mb-1.5">
                      Tags
                    </label>
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {image.tags.map((t) => (
                        <span key={t} className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-[#120B21] text-[#F5D77F] border border-[#DFB260]/30 font-medium">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {image.autoTags && (
                  <div className="bg-[#190C30] p-3 rounded-xl border border-[#DFB260]/40 space-y-1.5">
                    <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5D77F]">
                      <Sparkles className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span>AI Auto-Tag Analysis</span>
                    </div>
                    {image.autoTags.location && (
                      <p className="text-[11px] text-[#C8B1E4]"><strong className="text-[#FFF2A8]">Location:</strong> {image.autoTags.location}</p>
                    )}
                    {image.autoTags.people && image.autoTags.people.length > 0 && (
                      <p className="text-[11px] text-[#C8B1E4]"><strong className="text-[#FFF2A8]">People:</strong> {image.autoTags.people.join(', ')}</p>
                    )}
                    {image.autoTags.tags && image.autoTags.tags.length > 0 && (
                      <div className="flex items-center space-x-1 flex-wrap gap-y-1 pt-1">
                        {image.autoTags.tags.map(t => (
                          <span key={t} className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/30">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Permanent Storage Specs */}
                <div className="bg-[#120B21] p-3.5 rounded-xl border border-[#DFB260]/30 space-y-2">
                  <span className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider font-bold block">
                    Permanent Storage Specs
                  </span>
                  <div className="space-y-1 text-[11px] font-mono text-[#C8B1E4]">
                    <div className="flex justify-between">
                      <span>Encryption:</span>
                      <span className="text-[#FFF2A8] font-semibold">{encryption}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Network:</span>
                      <span className="text-[#FFF2A8] font-semibold">Arweave Permaweb</span>
                    </div>
                    {image.blockHeight && (
                      <div className="flex justify-between">
                        <span>Block Height:</span>
                        <span className="text-[#FFF2A8] font-semibold">#{image.blockHeight}</span>
                      </div>
                    )}
                    <div className="truncate pt-1 border-t border-[#DFB260]/20">
                      <span>Tx ID: </span>
                      <span className="text-[#F5D77F] font-bold">{txId}</span>
                    </div>

                    <div className="pt-2 border-t border-[#DFB260]/30 space-y-2">
                      <span className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider font-bold block">
                        Immortal Gateway Independent Viewer
                      </span>
                      <a
                        href={arweaveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-[#23173A] hover:bg-[#322252] text-[#FFF2A8] text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-[#DFB260]/60 flex items-center justify-between transition-colors group cursor-pointer shadow-sm"
                      >
                        <span className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-[#F5D77F]" />
                          <span>Launch Arweave Viewer</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#F5D77F] group-hover:translate-x-1 transition-transform" />
                      </a>
                      <div className="flex flex-col gap-1.5 pt-1">
                        <a
                          href={`/gateway/${txId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-mono text-[#FFF2A8] bg-[#DFB260]/20 hover:bg-[#DFB260]/30 border border-[#DFB260]/60 p-2 rounded-lg flex items-center justify-between font-bold transition-all shadow-sm"
                        >
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>App Gateway Inspector</span>
                          </span>
                          <ExternalLink className="w-3 h-3 text-[#F5D77F]" />
                        </a>
                        <a
                          href={arweaveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-mono text-[#F5D77F] hover:underline flex items-center gap-1 font-bold px-1"
                        >
                          <ExternalLink className="w-3 h-3 text-[#F5D77F]" />
                          <span className="truncate">{arweaveUrl}</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="pt-4 border-t border-[#DFB260]/30 space-y-2">
              {onSelectView && (
                <button
                  onClick={() => {
                    onClose();
                    onSelectView('immortal');
                  }}
                  className="bg-[#2E2342] hover:bg-[#3E2F59] text-[#FFF2A8] border border-[#DFB260]/70 w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2 cursor-pointer rounded-xl transition-all shadow-md"
                >
                  <Globe className="w-4 h-4 text-[#F5D77F]" />
                  <span>Immortal Gateway Viewer</span>
                </button>
              )}

              <a
                href={image.imageUrl}
                target="_blank"
                rel="noreferrer"
                className="gold-beveled-btn w-full text-xs py-2 text-[#FFF2A8] font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-[#F5D77F]" />
                <span>Open Full Resolution</span>
              </a>

              <button
                onClick={handleCopyLink}
                className="gold-filled-btn w-full text-xs py-2 font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Immutable Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
