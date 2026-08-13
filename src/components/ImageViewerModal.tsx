import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Globe, ExternalLink, Share2, Info, Trash2, 
  ChevronLeft, ChevronRight, FolderEdit, Clock, MapPin, 
  ShieldCheck, Copy, Check, Users, Sparkles, Loader2, Tag, ZoomIn, ZoomOut, RotateCw, Maximize2, Play, Pause, Move, Minimize2
} from 'lucide-react';

export interface ImageViewerData {
  id?: string;
  mediaId?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType?: 'photo' | 'video' | 'document';
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  sourceProvider?: string;
  sourceCreatedAt?: string;
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
  archiveJobId?: string;
  archiveStatus?: "r2_only" | "staging" | "queued" | "uploading" | "submitted" | "confirmed" | "failed";
  archiveError?: string;
  archiveConfirmations?: number;
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
  images?: ImageViewerData[];
  onSelectImage?: (image: ImageViewerData) => void;
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
  onOpenEditAlbum,
  images = [],
  onSelectImage
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [thumbnailSaving, setThumbnailSaving] = useState(false);
  const [archive, setArchive] = useState<any>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 });

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const changeZoom = (next: number) => {
    const clamped = Math.min(6, Math.max(0.5, next));
    setZoom(clamped);
    if (clamped <= 1) setPosition({ x: 0, y: 0 });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev && hasPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext && hasNext) onNext();
      if (e.key === '+' || e.key === '=') changeZoom(zoom + 0.25);
      if (e.key === '-') changeZoom(zoom - 0.25);
      if (e.key.toLowerCase() === 'r') setRotation(value => value + 90);
      if (e.key === '0') resetView();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(value => !value); }
      if (e.key.toLowerCase() === 'f') stageRef.current?.requestFullscreen?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext, hasPrev, hasNext, zoom]);

  useEffect(() => { resetView(); }, [image?.id, image?.imageUrl, image?.videoUrl]);

  useEffect(() => {
    if (!isPlaying || !onNext || !hasNext) return;
    const timer = window.setInterval(onNext, 5500);
    return () => window.clearInterval(timer);
  }, [isPlaying, onNext, hasNext]);

  useEffect(() => {
    const current = images.findIndex(item => item.id === image?.id);
    [images[current - 1], images[current + 1]].filter(Boolean).forEach(item => {
      const preload = new Image();
      preload.src = item.imageUrl;
    });
  }, [image?.id, images]);

  useEffect(() => {
    setArchive(null);
    if (!image?.mediaId) return;
    let active=true;
    const load=async()=>{
      const response=await fetch("/api/media/status?ids="+encodeURIComponent(image.mediaId!));
      if(response.ok&&active){const body=await response.json();setArchive(body.media?.[0]||null);}
    };
    void load();
    const timer=window.setInterval(load,10000);
    return()=>{active=false;window.clearInterval(timer);};
  },[image?.mediaId]);

  useEffect(() => {
    const listener = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', listener);
    return () => document.removeEventListener('fullscreenchange', listener);
  }, []);

  if (!image) return null;

  const isVideo = image.mediaType === 'video' || Boolean(image.videoUrl);
  const mediaUrl = isVideo ? image.videoUrl : image.imageUrl;
  const archiveState = archive || image;
  const txId = archiveState.permawebTxId as string | undefined;
  const archiveStatus = archiveState.archiveStatus || (image.mediaId ? "r2_only" : undefined);
  const arweaveUrl = txId ? "https://arweave.net/" + txId : undefined;
  const encryption = image.encryptionLevel || 'AES-GCM-256 Vault';

  const selectCurrentVideoFrame = async () => {
    if (!image.mediaId || !videoRef.current) return;
    setThumbnailSaving(true);
    try {
      const response = await fetch("/api/media/thumbnail/select", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mediaId: image.mediaId, second: videoRef.current.currentTime }) });
      if (!response.ok) throw new Error("THUMBNAIL_SELECTION_FAILED");
      window.alert("Thumbnail frame selected. The updated poster will appear after background processing.");
    } catch { window.alert("The thumbnail frame could not be selected. Please try again."); }
    finally { setThumbnailSaving(false); }
  };

  const handleCopyLink = () => {
    if (!arweaveUrl) return;
    navigator.clipboard.writeText(arweaveUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div ref={stageRef} className="fixed inset-0 z-50 bg-[#05020A]/95 backdrop-blur-2xl flex flex-col justify-between overflow-hidden animate-fade-in">
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
              {image.title || 'Untitled memory'}
            </h4>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#F5D77F]">
              <span>{image.albumName ? `Album: ${image.albumName}` : image.category || 'Personal'}</span>
              <span>•</span>
              <span>{txId ? 'Permanently archived' : archiveStatus === 'r2_only' ? 'Private vault' : 'Archive pending'}</span>
            </div>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1 mr-2 rounded-full bg-black/50 border border-white/15 p-1">
            <button onClick={() => changeZoom(zoom - 0.25)} className="p-2 rounded-full hover:bg-white/15" title="Zoom out (-)"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={resetView} className="min-w-14 px-2 py-1.5 rounded-full hover:bg-white/15 text-[10px] font-mono" title="Fit image (0)">{Math.round(zoom * 100)}%</button>
            <button onClick={() => changeZoom(zoom + 0.25)} className="p-2 rounded-full hover:bg-white/15" title="Zoom in (+)"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setRotation(value => value + 90)} className="p-2 rounded-full hover:bg-white/15" title="Rotate (R)"><RotateCw className="w-4 h-4" /></button>
            <button onClick={() => { if (!isPlaying) stageRef.current?.requestFullscreen?.(); setIsPlaying(value => !value); }} className={isPlaying ? 'p-2 rounded-full bg-[#DFB260] text-black' : 'p-2 rounded-full hover:bg-white/15'} title="Cinematic slideshow (Space)">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
            <button onClick={() => isFullscreen ? document.exitFullscreen() : stageRef.current?.requestFullscreen?.()} className="p-2 rounded-full hover:bg-white/15" title="Fullscreen (F)">{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</button>
          </div>
          {onSelectView && txId && (
            <button
              onClick={() => {
                onClose();
                onSelectView('immortal');
              }}
              className="p-2 rounded-full hover:bg-white/10 text-[#F5D77F] hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 px-3 bg-white/10 border border-[#DFB260]/40"
              title="Open this memory in the permanent archive"
            >
              <Globe className="w-4 h-4 text-[#F5D77F]" />
              <span className="text-xs font-semibold hidden sm:inline">Permanent archive</span>
            </button>
          )}

          <a
            href={mediaUrl}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer hidden sm:flex"
            title="Open Original Image"
          >
            <ExternalLink className="w-5 h-5" />
          </a>

          <button
            onClick={handleCopyLink}
            disabled={!txId}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
            title={txId ? "Copy verified Arweave URL" : "This file is not submitted to Arweave"}
          >
            {copiedLink ? <Check className="w-5 h-5 text-emerald-400" /> : <Share2 className="w-5 h-5" />}
          </button>

          {isVideo && image.mediaId && (
            <button onClick={selectCurrentVideoFrame} disabled={thumbnailSaving} className="p-2 rounded-full hover:bg-white/10 text-[#F5D77F] disabled:opacity-50" title="Use the current video frame as thumbnail">
              {thumbnailSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setShowInfo(prev => !prev)}
            className={`min-h-11 px-3 rounded-full transition-colors cursor-pointer flex items-center gap-2 ${
              showInfo ? 'bg-[#DFB260] text-black font-bold shadow-lg' : 'hover:bg-white/10 text-white/90'
            }`}
            title="View or edit memory details"
          >
            <Info className="w-5 h-5" />
            <span className="hidden sm:inline text-xs font-semibold">Details</span>
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
          className={zoom > 1 ? 'relative w-full h-full flex-1 flex items-center justify-center overflow-hidden touch-none cursor-grab' : 'relative w-full h-full flex-1 flex items-center justify-center overflow-hidden touch-none cursor-zoom-in'}
          onWheel={(e) => { e.preventDefault(); changeZoom(zoom + (e.deltaY < 0 ? 0.2 : -0.2)); }}
          onDoubleClick={(e) => { e.stopPropagation(); zoom > 1 ? resetView() : changeZoom(2); }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest('button, a')) return;
            if (zoom <= 1) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            dragStartRef.current = { x: e.clientX, y: e.clientY, originX: position.x, originY: position.y };
            setIsDragging(true);
          }}
          onPointerMove={(e) => {
            if (!isDragging) return;
            setPosition({ x: dragStartRef.current.originX + e.clientX - dragStartRef.current.x, y: dragStartRef.current.originY + e.clientY - dragStartRef.current.y });
          }}
          onPointerUp={() => setIsDragging(false)}
          onPointerCancel={() => setIsDragging(false)}
        >
          {isVideo && mediaUrl ? (
            <video
              ref={videoRef}
              key={mediaUrl}
              src={mediaUrl}
              poster={image.thumbnailUrl || image.imageUrl}
              controls
              autoPlay
              playsInline
              preload="metadata"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg shadow-2xl border border-[#DFB260]/20 bg-black"
              style={{
                maxHeight: "calc(100vh - 120px)",
                maxWidth: showInfo ? "calc(100vw - 380px)" : "100vw"
              }}
            >
              Your browser does not support video playback.
            </video>
          ) : (
            <img
              src={image.imageUrl}
              alt={image.title}
              onClick={(e) => e.stopPropagation()}
              referrerPolicy="no-referrer"
              draggable={false}
              className={(isDragging ? "max-w-full max-h-full w-auto h-auto object-contain select-none rounded-lg shadow-2xl border border-[#DFB260]/20" : "max-w-full max-h-full w-auto h-auto object-contain select-none rounded-lg shadow-2xl border border-[#DFB260]/20 transition-transform duration-500 ease-out") + (isPlaying ? " viewer-ken-burns" : "")}
              style={{
                maxHeight: "calc(100vh - 120px)",
                maxWidth: showInfo ? "calc(100vw - 380px)" : "100vw",
                transform: "translate3d(" + position.x + "px, " + position.y + "px, 0) scale(" + zoom + ") rotate(" + rotation + "deg)"
              }}
            />
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex md:hidden items-center gap-1 rounded-full bg-black/75 border border-white/20 p-1.5 backdrop-blur-xl">
            <button onClick={() => changeZoom(zoom - 0.25)} className="p-2"><ZoomOut className="w-4 h-4" /></button>
            <button onClick={resetView} className="px-2 text-[10px] font-mono">{Math.round(zoom * 100)}%</button>
            <button onClick={() => changeZoom(zoom + 0.25)} className="p-2"><ZoomIn className="w-4 h-4" /></button>
            <button onClick={() => setRotation(value => value + 90)} className="p-2"><RotateCw className="w-4 h-4" /></button>
            <button onClick={() => { if (!isPlaying) stageRef.current?.requestFullscreen?.(); setIsPlaying(value => !value); }} className="p-2">{isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}</button>
            <button onClick={() => stageRef.current?.requestFullscreen?.()} className="p-2"><Maximize2 className="w-4 h-4" /></button>
          </div>

          {zoom > 1 && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-mono text-white/70 flex items-center gap-1"><Move className="w-3 h-3" /> Drag to pan · double-click to fit</div>}

          {/* PREVIOUS & NEXT NAV BUTTONS */}
          {hasPrev && onPrev && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
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
              onPointerDown={(e) => e.stopPropagation()}
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

          {images.length > 1 && !showInfo && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 max-w-[80vw] overflow-x-auto rounded-2xl bg-black/65 border border-white/15 p-2 backdrop-blur-xl flex gap-2">
              {images.map((item, index) => (
                <button key={item.id || item.imageUrl} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onSelectImage?.(item); }} className="relative flex-none w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 opacity-75 hover:opacity-100 transition-all" style={{ borderColor: item.id === image.id ? "#F5D77F" : "transparent" }} title={String(index + 1) + ". " + item.title}>
                  {item.mediaType === "video" || item.videoUrl ? (
                    <>
                      <video src={item.videoUrl} poster={item.thumbnailUrl || item.imageUrl} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/20"><Play className="w-5 h-5 fill-white text-white drop-shadow-lg" /></span>
                    </>
                  ) : (
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  )}
                </button>
              ))}
            </div>
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
                {(image.fileSizeBytes || image.width || image.height || image.durationMs || image.sourceProvider) && (
                  <div className="grid grid-cols-2 gap-3 bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/20">
                    {image.durationMs && <div><span className="text-[10px] text-[#F5D77F] font-mono block">Duration</span><span className="font-bold text-[#FFF2A8]">{Math.floor(image.durationMs / 60000)}:{String(Math.floor(image.durationMs / 1000) % 60).padStart(2, "0")}</span></div>}
                    {image.width && image.height && <div><span className="text-[10px] text-[#F5D77F] font-mono block">Resolution</span><span className="font-bold text-[#FFF2A8]">{image.width} × {image.height}</span></div>}
                    {image.fileSizeBytes && <div><span className="text-[10px] text-[#F5D77F] font-mono block">Original size</span><span className="font-bold text-[#FFF2A8]">{(image.fileSizeBytes / 1024 / 1024).toFixed(1)} MB</span></div>}
                    {image.sourceProvider && <div><span className="text-[10px] text-[#F5D77F] font-mono block">Imported from</span><span className="font-bold text-[#FFF2A8]">{image.sourceProvider.replaceAll("-", " ")}</span></div>}
                  </div>
                )}

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
                  <span className="text-[10px] font-mono text-[#F5D77F] uppercase tracking-wider font-bold block">Permanent storage</span>
                  <div className="space-y-2 text-[11px] font-mono text-[#C8B1E4]">
                    <div className="flex justify-between"><span>Operational copy:</span><span className="text-emerald-300 font-semibold">{image.mediaId ? "Private R2 ready" : "Not linked"}</span></div>
                    <div className="flex justify-between"><span>Arweave:</span><span className="text-[#FFF2A8] font-semibold uppercase">{archiveStatus || "not requested"}</span></div>
                    {archiveState.archiveConfirmations > 0 && <div className="flex justify-between"><span>Confirmations:</span><span>{archiveState.archiveConfirmations}</span></div>}
                    {archiveState.archiveError && <p className="rounded-lg bg-rose-500/10 p-2 text-rose-300">{archiveState.archiveError}</p>}
                    {txId ? <>
                      <div className="break-all pt-2 border-t border-[#DFB260]/20"><span>Real Tx ID: </span><span className="text-[#F5D77F] font-bold">{txId}</span></div>
                      <a href={arweaveUrl} target="_blank" rel="noreferrer" className="w-full bg-[#23173A] hover:bg-[#322252] text-[#FFF2A8] text-xs font-mono font-bold py-2.5 px-3 rounded-xl border border-[#DFB260]/60 flex items-center justify-between">
                        <span className="flex items-center gap-2"><Globe className="w-4 h-4"/>Open submitted transaction</span><ExternalLink className="w-3.5 h-3.5"/>
                      </a>
                    </> : <p className="rounded-lg bg-black/20 p-2">No Arweave transaction exists for this file. Gateway actions remain disabled until submission.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="pt-4 border-t border-[#DFB260]/30 space-y-2">
              {onSelectView && txId && (
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
                href={mediaUrl}
                target="_blank"
                rel="noreferrer"
                className="gold-beveled-btn w-full text-xs py-2 text-[#FFF2A8] font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-[#F5D77F]" />
                <span>Open Full Resolution</span>
              </a>

              <button
                onClick={handleCopyLink}
                disabled={!txId}
                className="gold-filled-btn disabled:opacity-40 disabled:cursor-not-allowed w-full text-xs py-2 font-bold flex items-center justify-center gap-2 cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                <span>{!txId ? 'Not on Arweave' : copiedLink ? 'Link Copied!' : 'Share Immutable Link'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
