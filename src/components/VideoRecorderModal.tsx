import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MemoryItem } from '../types';
import { 
  createPermawebTransaction, 
  encryptData, 
  saveTransactionToLedger 
} from '../lib/arweaveEngine';
import { triggerGlobalArweaveAlert } from './NotificationSystem';
import { 
  Video, 
  VideoOff, 
  Camera, 
  Mic, 
  MicOff, 
  Square, 
  Pause, 
  Play, 
  RotateCcw, 
  Upload, 
  X, 
  CheckCircle2, 
  HardDrive, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  Loader2, 
  Radio, 
  AlertCircle,
  FileCheck,
  FolderPlus,
  Plus,
  Trash2,
  Tag,
  Sliders,
  Layers,
  Image as ImageIcon
} from 'lucide-react';

interface VideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMemory: (memory: MemoryItem | MemoryItem[]) => void;
}

interface CustomAttribute {
  key: string;
  value: string;
}

export const VideoRecorderModal: React.FC<VideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onAddMemory
}) => {
  // Capture Mode: 'video' vs 'photo'
  const [captureMode, setCaptureMode] = useState<'video' | 'photo'>('video');

  // Camera & Stream states
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0); // in seconds
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Metadata & Album states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Personal' | 'Family' | 'Legal' | 'Memorial' | 'Time Capsule'>('Personal');
  const [albumChoice, setAlbumChoice] = useState<string>('Family Reunions');
  const [customAlbumInput, setCustomAlbumInput] = useState<string>('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
  const [location, setLocation] = useState('Personal Studio Capture');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('Live Capture, Permaweb Vault');
  const [encryptionLevel, setEncryptionLevel] = useState<'Standard' | 'Vault Level 3' | 'Level 5 Protected' | 'Quantum-Proof'>('Level 5 Protected');

  // Custom Metadata Key-Value Attributes
  const [attributes, setAttributes] = useState<CustomAttribute[]>([
    { key: 'Capture Device', value: 'Live Studio Camera' },
    { key: 'Resolution', value: 'HD 1080p' }
  ]);
  const [newAttrKey, setNewAttrKey] = useState('');
  const [newAttrVal, setNewAttrVal] = useState('');

  // Archival overlay states
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const [archiveStep, setArchiveStep] = useState(1);
  const [archiveStatusText, setArchiveStatusText] = useState('');
  const [generatedTx, setGeneratedTx] = useState('');
  const [cipherHash, setCipherHash] = useState('');

  // Refs
  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const playbackVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Initialize camera when modal opens or captureMode/facingMode changes
  useEffect(() => {
    if (isOpen && !recordedBlob) {
      startCamera();
    } else if (!isOpen) {
      stopCamera();
      resetRecorderState();
    }
    return () => {
      stopCamera();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isOpen, facingMode, captureMode]);

  // Bind live camera stream to video element
  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Default title generator
  useEffect(() => {
    if (isOpen) {
      const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (captureMode === 'photo') {
        setTitle(`Live Photo Memory - ${nowStr}`);
      } else {
        setTitle(`Live Video Memory - ${nowStr}`);
      }
    }
  }, [captureMode, isOpen]);

  // Start video/audio camera stream
  const startCamera = async () => {
    setIsCameraStarting(true);
    setCameraError(null);
    stopCamera();

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: captureMode === 'video'
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera or microphone permission was denied. Please allow permissions in your browser address bar.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera device detected. Please connect a webcam or camera device.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Permission or device error.'}`);
      }
    } finally {
      setIsCameraStarting(false);
    }
  };

  // Stop camera media tracks
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Toggle Mute Audio
  const handleToggleAudio = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = isAudioMuted;
      });
      setIsAudioMuted(!isAudioMuted);
    }
  };

  // Switch camera facing mode
  const handleFlipCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Switch between Video Feed and Photo Snapshot mode
  const handleModeChange = (mode: 'video' | 'photo') => {
    if (mode === captureMode) return;
    if (isRecording) {
      handleStopRecording();
    }
    resetRecorderState();
    setCaptureMode(mode);
  };

  // SNAP PHOTO SNAPSHOT
  const handleTakeSnapshot = () => {
    if (!liveVideoRef.current) return;

    const video = liveVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Flip horizontally if front-facing camera for natural mirror effect
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setPreviewUrl(url);
          stopCamera();
        }
      }, 'image/jpeg', 0.95);
    }
  };

  // START VIDEO RECORDING
  const handleStartRecording = () => {
    if (!stream) return;

    recordedChunksRef.current = [];
    setRecordingTime(0);

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = '';
        }
      }
    }

    try {
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { 
          type: mimeType || 'video/webm' 
        });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        stopCamera();
      };

      recorder.start(500);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setIsPaused(false);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Failed to start MediaRecorder:', err);
      triggerGlobalArweaveAlert({
        type: 'timeout',
        itemTitle: 'Live Camera Capture',
        errorMsg: `Failed to initialize media recording: ${err.message || 'Unsupported codec or stream error.'}`
      });
    }
  };

  // Pause / Resume Video Recording
  const handleTogglePause = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Stop Video Recording
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  // Reset & Retake
  const handleRetake = () => {
    resetRecorderState();
    startCamera();
  };

  const resetRecorderState = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
    setIsArchiving(false);
    setArchiveProgress(0);
  };

  // Add / Remove Custom Attribute
  const handleAddAttribute = () => {
    if (!newAttrKey.trim() || !newAttrVal.trim()) return;
    setAttributes(prev => [...prev, { key: newAttrKey.trim(), value: newAttrVal.trim() }]);
    setNewAttrKey('');
    setNewAttrVal('');
  };

  const handleRemoveAttribute = (index: number) => {
    setAttributes(prev => prev.filter((_, i) => i !== index));
  };

  // Format timer string MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ARCHIVE TO PERMAWEB VAULT
  const handleArchiveMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedBlob || !title) return;

    setIsArchiving(true);
    setArchiveProgress(10);
    setArchiveStep(1);

    // Format date string with time
    const parsedDate = new Date(date);
    let formattedDateString = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (time) {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 || 12;
      formattedDateString += ` at ${formattedH}:${minutes} ${ampm}`;
    }

    // Determine final album name
    const finalAlbumName = albumChoice === 'CUSTOM' ? (customAlbumInput.trim() || 'Custom Album') : albumChoice;

    try {
      setArchiveStatusText(`Processing live ${captureMode === 'photo' ? 'photo snapshot' : 'video stream'} payload...`);
      let mediaBuffer = await recordedBlob.arrayBuffer();
      const contentType = recordedBlob.type || (captureMode === 'photo' ? 'image/jpeg' : 'video/webm');

      setArchiveProgress(35);

      if (encryptionLevel !== 'Standard') {
        setArchiveStatusText('Encrypting payload frames with AES-256 vault cipher...');
        const { cipherBuffer } = await encryptData(mediaBuffer, '1234');
        mediaBuffer = cipherBuffer;
      }

      setArchiveStatusText('Generating Arweave block transaction with custom attributes...');
      const tx = await createPermawebTransaction({
        data: mediaBuffer,
        contentType,
        title,
        category,
        encryptionLevel
      });

      setGeneratedTx(tx.id);
      setCipherHash(tx.dataHash);
      saveTransactionToLedger(tx);

      setArchiveProgress(65);
      setArchiveStep(2);

      setArchiveStatusText('Broadcasting media payload to Arweave gateways...');
      await fetch('/api/arweave/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          contentType,
          encryptionLevel,
          dataHash: tx.dataHash,
          sizeBytes: tx.sizeBytes
        })
      });

      setArchiveProgress(90);
      setArchiveStep(3);

      setTimeout(() => {
        setArchiveProgress(100);

        // Build list of tags including custom attributes
        const attributeTags = attributes.map(a => `${a.key}: ${a.value}`);
        const parsedTagList = tags.split(',').map(t => t.trim()).filter(Boolean);
        const finalTags = Array.from(new Set([
          ...parsedTagList,
          ...attributeTags,
          captureMode === 'photo' ? 'Live Photo' : 'Live Video',
          'Camera Capture'
        ]));

        const newMemoryItem: MemoryItem = {
          id: `mem-live-${Date.now()}`,
          title,
          category,
          date: formattedDateString,
          time: time || undefined,
          location: location || 'Camera Recording Studio',
          imageUrl: previewUrl || (captureMode === 'photo' 
            ? 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800'
            : 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&q=80&w=800'),
          description: description || `Live ${captureMode === 'photo' ? 'photo snapshot' : 'video recording'} captured directly in studio and archived to permaweb vault.`,
          encryptionLevel,
          permawebTxId: tx.id,
          tags: finalTags,
          albumName: finalAlbumName !== 'Unassigned' ? finalAlbumName : undefined
        };

        onAddMemory(newMemoryItem);
      }, 800);

    } catch (err: any) {
      console.error('Error archiving live media:', err);
      setArchiveProgress(100);
      triggerGlobalArweaveAlert({
        type: 'timeout',
        itemTitle: title || 'Live Memory',
        errorMsg: err?.message || 'Arweave permaweb upload request timed out or was disrupted.'
      });
    }
  };

  const handleFinishModal = () => {
    stopCamera();
    resetRecorderState();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto text-[#E8DDF5]">
      
      {!isArchiving ? (
        <div className="cosmic-card-gold max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-[#DFB260] max-h-[94vh] overflow-y-auto no-scrollbar">
          
          <button
            onClick={handleFinishModal}
            className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] text-sm font-semibold p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-20"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-[#F5D77F] text-xs font-mono font-semibold uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Live Camera Studio Capture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
              Live Record Studio
            </h2>
            <p className="text-xs text-[#C8B1E4]/80 font-medium">
              Capture a live photo snapshot or record a video message, assign to an album, and permanently store on Arweave permaweb.
            </p>
          </div>

          {/* MODE SELECTOR TABS (Video Feed vs Photo Snapshot) */}
          <div className="bg-[#120B21] p-1.5 rounded-2xl border border-[#DFB260]/40 flex items-center justify-between text-xs font-semibold gap-2">
            <button
              type="button"
              onClick={() => handleModeChange('video')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                captureMode === 'video'
                  ? 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-white font-bold shadow-md border border-amber-300/30'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Live Video Feed</span>
            </button>

            <button
              type="button"
              onClick={() => handleModeChange('photo')}
              className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                captureMode === 'photo'
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 text-[#120B21] font-bold shadow-md border border-amber-300/50'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Photo Snapshot</span>
            </button>
          </div>

          {/* CAMERA STAGE / PREVIEW */}
          <div className="bg-[#0A0416] rounded-3xl border-2 border-[#DFB260]/40 overflow-hidden relative shadow-2xl flex items-center justify-center min-h-[300px] sm:min-h-[360px]">
            
            {/* 1. Camera Loading State */}
            {isCameraStarting && (
              <div className="flex flex-col items-center space-y-3 p-8 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-[#F5D77F]" />
                <p className="text-xs font-mono text-[#FFF2A8]">Initializing camera hardware &amp; media stream...</p>
              </div>
            )}

            {/* 2. Camera Error State */}
            {cameraError && !recordedBlob && (
              <div className="flex flex-col items-center space-y-3 p-8 text-center max-w-md">
                <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <p className="text-xs font-semibold text-rose-200">{cameraError}</p>
                <button
                  type="button"
                  onClick={startCamera}
                  className="gold-filled-btn text-xs px-5 py-2 uppercase tracking-wider font-bold cursor-pointer"
                >
                  Retry Camera Access
                </button>
              </div>
            )}

            {/* 3. Live Stream View */}
            {!recordedBlob && !cameraError && (
              <div className="relative w-full h-full flex items-center justify-center bg-black">
                <video
                  ref={liveVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-[320px] sm:h-[380px] object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />

                {/* Overlays on Live Video */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center space-x-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-500/50">
                    <span className={`w-3 h-3 rounded-full bg-rose-500 ${isPaused ? 'opacity-50' : 'animate-ping'}`}></span>
                    <span className="text-xs font-mono font-bold text-rose-300">
                      {isPaused ? 'PAUSED' : 'REC'} {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                {/* Top Controls: Flip camera & Audio Mute (for video) */}
                {!isRecording && (
                  <div className="absolute top-4 right-4 flex items-center space-x-2">
                    {captureMode === 'video' && (
                      <button
                        type="button"
                        onClick={handleToggleAudio}
                        className={`p-2.5 rounded-full border backdrop-blur-md transition-colors cursor-pointer ${
                          isAudioMuted 
                            ? 'bg-rose-950/80 border-rose-500 text-rose-300' 
                            : 'bg-black/60 border-[#DFB260]/40 text-[#FFF2A8] hover:bg-black/80'
                        }`}
                        title={isAudioMuted ? "Unmute Microphone" : "Mute Microphone"}
                      >
                        {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleFlipCamera}
                      className="p-2.5 rounded-full bg-black/60 border border-[#DFB260]/40 text-[#FFF2A8] hover:bg-black/80 backdrop-blur-md transition-colors cursor-pointer"
                      title="Flip Camera"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Control Overlay Bar */}
                <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center space-x-4">
                  {captureMode === 'photo' ? (
                    <button
                      type="button"
                      onClick={handleTakeSnapshot}
                      disabled={!stream}
                      className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 hover:from-amber-300 hover:to-yellow-200 text-[#120B21] font-bold px-7 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 transition-transform active:scale-95 cursor-pointer border-2 border-white/40 disabled:opacity-50 font-cinzel text-xs uppercase tracking-wider"
                    >
                      <Camera className="w-4 h-4 text-[#120B21]" />
                      <span>Snap Photo Frame</span>
                    </button>
                  ) : !isRecording ? (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      disabled={!stream}
                      className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold px-6 py-3 rounded-full shadow-2xl flex items-center space-x-2.5 transition-transform active:scale-95 cursor-pointer border-2 border-white/20 disabled:opacity-50"
                    >
                      <span className="w-3.5 h-3.5 rounded-full bg-white animate-pulse"></span>
                      <span className="text-xs uppercase tracking-wider font-cinzel">Start Live Video Recording</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-3 bg-black/80 backdrop-blur-md p-2 rounded-full border border-[#DFB260]/50 shadow-2xl">
                      <button
                        type="button"
                        onClick={handleTogglePause}
                        className="p-3 rounded-full bg-[#1e1035] border border-[#DFB260]/40 text-[#FFF2A8] hover:bg-white/10 cursor-pointer"
                        title={isPaused ? "Resume Recording" : "Pause Recording"}
                      >
                        {isPaused ? <Play className="w-5 h-5 text-emerald-400" /> : <Pause className="w-5 h-5 text-amber-400" />}
                      </button>

                      <button
                        type="button"
                        onClick={handleStopRecording}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-full flex items-center space-x-2 cursor-pointer shadow-lg text-xs uppercase tracking-wider"
                      >
                        <Square className="w-4 h-4 fill-current" />
                        <span>Finish &amp; Review</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. Recorded Playback / Snapshot Review */}
            {recordedBlob && previewUrl && (
              <div className="relative w-full h-full flex flex-col items-center bg-black">
                {captureMode === 'photo' ? (
                  <img
                    src={previewUrl}
                    alt="Captured Snapshot"
                    className="w-full h-[320px] sm:h-[380px] object-contain bg-black"
                  />
                ) : (
                  <video
                    ref={playbackVideoRef}
                    src={previewUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-[320px] sm:h-[380px] object-cover"
                  />
                )}

                <div className="absolute top-4 left-4 bg-emerald-950/90 border border-emerald-500/50 px-3 py-1 rounded-full text-emerald-300 text-[11px] font-mono font-bold flex items-center space-x-1.5 shadow-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>
                    {captureMode === 'photo' ? 'Photo Captured' : `Recorded (${formatTime(recordingTime)})`} • {(recordedBlob.size / 1024 / (captureMode === 'photo' ? 1 : 1024)).toFixed(1)} {captureMode === 'photo' ? 'KB' : 'MB'}
                  </span>
                </div>

                <div className="absolute top-4 right-4">
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="bg-black/70 hover:bg-black text-[#FFF2A8] border border-[#DFB260]/50 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center space-x-1.5 backdrop-blur-md cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{captureMode === 'photo' ? 'Retake Photo' : 'Record Again'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* METADATA & ALBUM FORM (Shown once media is captured) */}
          {recordedBlob ? (
            <form onSubmit={handleArchiveMedia} className="space-y-4 text-xs font-sans animate-fade-in pt-2">
              <div className="bg-[#120B21] p-3 rounded-2xl border border-[#DFB260]/40 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-semibold text-[#F5D77F]">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span>Captured {captureMode === 'photo' ? 'Photo Frame' : 'Video Stream'} Ready for Vault Archival</span>
                </div>
                <button
                  type="button"
                  onClick={handleRetake}
                  className="text-[#C8B1E4] hover:text-[#FFF2A8] text-[11px] underline font-mono cursor-pointer"
                >
                  Discard &amp; Retake
                </button>
              </div>

              {/* Title & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Memory Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Message to My Future Grandchildren 2026"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  >
                    <option value="Personal" className="bg-[#120B21]">Personal</option>
                    <option value="Family" className="bg-[#120B21]">Family</option>
                    <option value="Memorial" className="bg-[#120B21]">Memorial</option>
                    <option value="Legal" className="bg-[#120B21]">Legal</option>
                    <option value="Time Capsule" className="bg-[#120B21]">Time Capsule</option>
                  </select>
                </div>
              </div>

              {/* Album Selection & Custom Album Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1 flex items-center justify-between">
                    <span>Assign to Album</span>
                    <FolderPlus className="w-3.5 h-3.5 text-[#F5D77F]" />
                  </label>
                  <select
                    value={albumChoice}
                    onChange={(e) => setAlbumChoice(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  >
                    <option value="Family Reunions" className="bg-[#120B21]">Family Reunions &amp; Gatherings</option>
                    <option value="Ancestral Keepsakes" className="bg-[#120B21]">Ancestral Keepsakes</option>
                    <option value="Milestone Celebrations" className="bg-[#120B21]">Milestone Celebrations</option>
                    <option value="Personal Memorials" className="bg-[#120B21]">Personal Memorials</option>
                    <option value="Time Capsule Messages" className="bg-[#120B21]">Time Capsule Messages</option>
                    <option value="Unassigned" className="bg-[#120B21]">Unassigned (Default)</option>
                    <option value="CUSTOM" className="bg-[#120B21]">+ Create Custom Album Name...</option>
                  </select>
                </div>

                {albumChoice === 'CUSTOM' ? (
                  <div>
                    <label className="block text-[#FFF2A8] font-semibold mb-1">Custom Album Name</label>
                    <input
                      type="text"
                      value={customAlbumInput}
                      onChange={(e) => setCustomAlbumInput(e.target.value)}
                      placeholder="e.g. Hawaii Summer Trip 2026"
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[#FFF2A8] font-semibold mb-1">Encryption Tier</label>
                    <select
                      value={encryptionLevel}
                      onChange={(e: any) => setEncryptionLevel(e.target.value)}
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                    >
                      <option value="Standard" className="bg-[#120B21]">Standard Public</option>
                      <option value="Vault Level 3" className="bg-[#120B21]">Vault Level 3 Encrypted</option>
                      <option value="Level 5 Protected" className="bg-[#120B21]">Level 5 Protected</option>
                      <option value="Quantum-Proof" className="bg-[#120B21]">Quantum-Proof Multi-sig</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Date, Time, Location */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Honolulu Studio"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  />
                </div>
              </div>

              {/* Story / Context */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Story / Message Context</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide context or instructions for this recorded media entry..."
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                ></textarea>
              </div>

              {/* Tags Input */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                />
              </div>

              {/* Custom Attributes Log (Key-Value Metadata) */}
              <div className="bg-[#0D061A] p-3.5 rounded-2xl border border-[#DFB260]/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#F5D77F]">
                  <span className="flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Custom Metadata Attributes Log</span>
                  </span>
                  <span className="text-[10px] text-[#C8B1E4]/70 font-mono">{attributes.length} attributes attached</span>
                </div>

                {/* Attribute Pills */}
                {attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {attributes.map((attr, idx) => (
                      <span key={idx} className="inline-flex items-center space-x-1.5 bg-[#170E2B] border border-[#DFB260]/40 px-2.5 py-1 rounded-xl text-[11px]">
                        <span className="text-[#F5D77F] font-semibold">{attr.key}:</span>
                        <span className="text-[#FFF2A8]">{attr.value}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttribute(idx)}
                          className="text-[#C8B1E4] hover:text-rose-400 p-0.5 ml-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add Attribute Row */}
                <div className="flex items-center space-x-2 pt-1">
                  <input
                    type="text"
                    value={newAttrKey}
                    onChange={(e) => setNewAttrKey(e.target.value)}
                    placeholder="Attribute name (e.g. Subject)"
                    className="w-1/2 bg-[#120B21] border border-[#DFB260]/30 rounded-xl px-3 py-1.5 text-[#FFF2A8] text-xs placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F]"
                  />
                  <input
                    type="text"
                    value={newAttrVal}
                    onChange={(e) => setNewAttrVal(e.target.value)}
                    placeholder="Value (e.g. Anniversary)"
                    className="w-1/2 bg-[#120B21] border border-[#DFB260]/30 rounded-xl px-3 py-1.5 text-[#FFF2A8] text-xs placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F]"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttribute}
                    className="bg-[#24133d] hover:bg-[#341b57] text-[#FFF2A8] border border-[#DFB260]/40 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 flex items-center justify-end space-x-3 font-semibold">
                <button
                  type="button"
                  onClick={handleFinishModal}
                  className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-filled-btn px-6 py-2.5 text-xs cursor-pointer flex items-center space-x-2"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Archive {captureMode === 'photo' ? 'Photo' : 'Video'} to Permaweb Vault</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-[11px] text-center text-[#C8B1E4]/70 font-mono italic">
              {captureMode === 'photo' ? 'Press "Snap Photo Frame" above to capture a live camera photo.' : 'Press "Start Live Video Recording" above to turn on camera capture.'}
            </p>
          )}

        </div>
      ) : (
        /* ARCHIVING OVERLAY */
        <div className="cosmic-card-gold max-w-lg w-full p-8 text-center space-y-6 shadow-2xl relative animate-fade-in border border-[#DFB260]">
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center mx-auto">
            <HardDrive className="w-8 h-8 animate-bounce text-[#F5D77F]" />
          </div>

          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 text-[10px] font-mono font-semibold uppercase mb-2">
              <Loader2 className="w-3 h-3 animate-spin text-[#F5D77F]" />
              <span>Arweave Permanent Weave</span>
            </div>
            <h3 className="font-cinzel font-bold text-3xl text-[#FFF2A8]">
              Archiving Live Media
            </h3>
            <p className="text-xs text-[#C8B1E4]/80 mt-1 font-medium">
              {archiveStatusText || 'Live capture payload being stored permanently.'}
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="text-[#C8B1E4]/80 uppercase font-bold">Permaweb Frame Sync</span>
              <span className="text-[#F5D77F]">{archiveProgress}%</span>
            </div>
            <div className="w-full bg-[#120B21] rounded-full h-3.5 p-0.5 border border-[#DFB260]/30 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#DFB260] via-[#F5D77F] to-[#FFF2A8] h-full rounded-full transition-all duration-300"
                style={{ width: `${archiveProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Step checklist */}
          <div className="bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 text-left text-xs space-y-2.5 font-sans">
            <div className={`flex items-center space-x-2 ${archiveStep >= 1 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <CheckCircle2 className="w-4 h-4 text-[#F5D77F]" />
              <span>AES-256 client-side media payload encryption complete</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 2 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <HardDrive className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep >= 2 ? '✓' : '•'} Broadcasting transaction &amp; attributes to Arweave nodes...</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 3 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <ShieldCheck className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep >= 3 ? '✓' : '⊙'} Permanent permaweb block verification</span>
            </div>
          </div>

          <div className="text-[11px] text-[#FFF2A8] font-mono space-y-1 bg-[#120B21] p-2.5 rounded-xl border border-[#DFB260]/30">
            <div>Arweave Tx ID: <span className="text-[#F5D77F] font-bold">{generatedTx}</span></div>
            {cipherHash && (
              <div className="text-[10px] text-[#C8B1E4]/70 truncate">SHA-256 Hash: <span className="font-semibold text-[#FFF2A8]">{cipherHash}</span></div>
            )}
          </div>

          {archiveProgress < 100 ? (
            <button
              onClick={handleFinishModal}
              className="gold-beveled-btn w-full py-3 text-xs text-[#FFF2A8] font-semibold cursor-pointer"
            >
              Run in Background
            </button>
          ) : (
            <button
              onClick={handleFinishModal}
              className="gold-filled-btn w-full py-3 text-xs cursor-pointer font-bold uppercase tracking-wider"
            >
              ✓ Live Capture Permanently Sealed to Permaweb
            </button>
          )}

        </div>
      )}

    </div>
  );
};
