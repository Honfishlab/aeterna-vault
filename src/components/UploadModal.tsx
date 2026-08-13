import React, { useEffect, useState, useRef } from 'react';
import { MemoryItem } from '../types';
import { triggerGlobalArweaveAlert } from './NotificationSystem';
import { compressImageFile } from '../lib/imageCompressor';
import { uploadMediaFile } from '../lib/mediaUpload';
import { queuePermanentArchive } from '../lib/permanentArchive';
import { getArchiveMasterPassphrase, setArchiveMasterPassphrase } from '../lib/archiveMasterSession';
import { CloudImportModal, ImportedCloudMedia } from './CloudImportModal';
import { BackgroundImportProgress, ImportActivitySummary } from './BackgroundImportProgress';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  HardDrive,
  ShieldCheck,
  FileCheck,
  FolderPlus,
  FileText,
  Images,
  Trash2,
  Plus,
  Clock,
  Layers,
  Sparkles,
  Loader2,
  Video,
  Camera,
  Users,
  Bot,
  Wand2,
  Tag,
  MapPin,
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Cloud
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMemory: (memory: MemoryItem | MemoryItem[]) => void;
  onOpenVideoRecorder?: () => void;
  onViewFiles?: (albumName?: string) => void;
}

export interface AlbumFileItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  size: number;
  mimeType?: string;
  storedMediaUrl?: string;
  thumbnailUrl?: string;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
  createdTime?: string | null;
  sourceProvider?: string;
  mediaId?: string;
  processingStatus?: string | null;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddMemory,
  onOpenVideoRecorder,
  onViewFiles,
}) => {
  // Upload mode: 'single' or 'album'
  const [uploadMode, setUploadMode] = useState<'single' | 'album'>('single');
  const [cloudImportOpen, setCloudImportOpen] = useState(false);
  const [cloudActivity, setCloudActivity] = useState<ImportActivitySummary>({ transferring: 0, processing: 0, issues: 0 });

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Personal' | 'Family' | 'Legal' | 'Memorial' | 'Time Capsule'>('Family');
  const [date, setDate] = useState('2024-08-18');
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('Family, Summer, Memories');
  const [people, setPeople] = useState('Wayne, Clara Pendelton');
  const [encryptionLevel, setEncryptionLevel] = useState<'Standard' | 'Vault Level 3' | 'Level 5 Protected' | 'Quantum-Proof'>('Level 5 Protected');
  const [archivalPassphrase, setArchivalPassphrase] = useState(() => getArchiveMasterPassphrase());
  const [securityError, setSecurityError] = useState('');
  const securityInputRef = useRef<HTMLInputElement | null>(null);

  // AI Auto-Tagging state & Real-time Progress Indicator
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1);
  const [aiStepStatusText, setAiStepStatusText] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{
    category?: string;
    people?: string[];
    location?: string;
    tags?: string[];
    description?: string;
  } | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  // Audio-to-Text Recording state inside UploadModal
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isPlayingRecordedAudio, setIsPlayingRecordedAudio] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setAudioDataUrl(reader.result);
          }
        };
        reader.readAsDataURL(audioBlob);

        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setAudioRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setAudioRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access denied or unavailable. Please check browser microphone permissions.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
  };

  const resetAudioRecording = () => {
    if (isRecordingAudio) {
      stopAudioRecording();
    }
    setAudioDataUrl(null);
    setAudioRecordingTime(0);
    setIsPlayingRecordedAudio(false);
  };

  const togglePlayAudio = () => {
    if (!audioDataUrl) return;
    if (!audioElementRef.current) {
      audioElementRef.current = new Audio(audioDataUrl);
      audioElementRef.current.onended = () => setIsPlayingRecordedAudio(false);
    } else {
      audioElementRef.current.src = audioDataUrl;
    }

    if (isPlayingRecordedAudio) {
      audioElementRef.current.pause();
      setIsPlayingRecordedAudio(false);
    } else {
      audioElementRef.current.play().catch(console.error);
      setIsPlayingRecordedAudio(true);
    }
  };

  const handleTranscribeAudio = async () => {
    if (!audioDataUrl) return;
    setIsTranscribingAudio(true);

    try {
      const res = await fetch('/api/ai/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioData: audioDataUrl,
          mimeType: 'audio/webm',
          shrineName: title || 'Time Capsule Memory',
          authorName: people || 'Family Historian'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription) {
          setDescription(prev => prev ? `${prev}\n\n[Spoken Story Transcription]: ${data.transcription}` : data.transcription);
          triggerGlobalArweaveAlert({
            type: 'failure',
            itemTitle: 'Spoken Memory Transcribed',
            errorMsg: 'Gemini AI successfully transcribed your voice recording into story text!'
          });
        }
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // Single file states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [singleImageUrl, setSingleImageUrl] = useState<string>('');

  // Album files states
  const [albumFiles, setAlbumFiles] = useState<AlbumFileItem[]>([]);
  const [pastedUrlInput, setPastedUrlInput] = useState('');
  const [selectedAlbumItemIds, setSelectedAlbumItemIds] = useState<string[]>([]);
  const [lastAlbumItemIndex, setLastAlbumItemIndex] = useState<number | null>(null);

  // Archiving overlay states
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const [archiveStep, setArchiveStep] = useState(1);
  const [archiveStatusText, setArchiveStatusText] = useState('');
  const [archiveQueueResult, setArchiveQueueResult] = useState({ queued: 0, failed: 0, privateOnly: 0 });
  const [generatedTx, setGeneratedTx] = useState('');
  const [cipherHash, setCipherHash] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (isOpen) setArchivalPassphrase(getArchiveMasterPassphrase()); }, [isOpen]);

  if (!isOpen) return null;

  // Process selected file(s) from input or drag-and-drop
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    let targetPreviewForAI = '';

    if (fileList.length > 1 || uploadMode === 'album') {
      // Switch to album mode if multiple files selected
      if (uploadMode !== 'album') {
        setUploadMode('album');
      }

      if (!title && fileList[0]) {
        setTitle(`Album: ${fileList[0].name.replace(/\.[^/.]+$/, "")}`);
      }

      for (let index = 0; index < fileList.length; index++) {
        const file = fileList[index];
        const previewUrl = await compressImageFile(file);
        if (index === 0) targetPreviewForAI = previewUrl;
        setAlbumFiles(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
            file,
            previewUrl,
            name: file.name,
            size: file.size
          }
        ]);
      }
    } else {
      // Single file mode
      const file = fileList[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      const previewUrl = await compressImageFile(file);
      setFilePreviewUrl(previewUrl);
      targetPreviewForAI = previewUrl;
    }

    // Auto-trigger AI Auto-Tagging analysis with real-time visual indicator
    if (targetPreviewForAI) {
      handleRunAIAutoTag(targetPreviewForAI);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (uploadMode === 'album' && cloudActivity.transferring > 0) return;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleAddPastedUrlToAlbum = () => {
    if (!pastedUrlInput.trim()) return;
    setAlbumFiles(prev => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        previewUrl: pastedUrlInput.trim(),
        name: `Web Photo #${prev.length + 1}`,
        size: 1520000 // default estimated size
      }
    ]);
    setPastedUrlInput("");
  };

  const handleCloudImported = (items: ImportedCloudMedia[]) => {
    if (!items.length) return;
    setUploadMode('album');
    if (!title) setTitle(items[0].albumName || (items.length === 1 ? (items[0].name.split(".").slice(0, -1).join(".") || items[0].name) : "Imported Google Drive Album"));
    setAlbumFiles(previous => [...previous, ...items.map(item => ({
      id: "google-" + item.id,
      previewUrl: item.thumbnailUrl || item.mediaUrl,
      storedMediaUrl: item.mediaUrl,
      mimeType: item.mimeType,
      name: item.name,
      size: item.size,
      thumbnailUrl: item.thumbnailUrl,
      width: item.width,
      height: item.height,
      durationMs: item.durationMs,
      createdTime: item.createdTime,
      sourceProvider: item.sourceProvider,
      mediaId: item.mediaId,
      processingStatus: item.processingStatus,
    }))]);
  };

  const handleRemoveAlbumFile = (id: string) => {
    setAlbumFiles(prev => prev.filter(f => f.id !== id));
    setSelectedAlbumItemIds(prev => prev.filter(itemId => itemId !== id));
  };

  const handleAlbumItemClick = (item: AlbumFileItem, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.shiftKey && lastAlbumItemIndex !== null) {
      const start = Math.min(lastAlbumItemIndex, index);
      const end = Math.max(lastAlbumItemIndex, index);
      const rangeIds = albumFiles.slice(start, end + 1).map(x => x.id);
      setSelectedAlbumItemIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      setLastAlbumItemIndex(index);
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedAlbumItemIds(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
      setLastAlbumItemIndex(index);
    } else {
      setSelectedAlbumItemIds(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
      setLastAlbumItemIndex(index);
    }
  };

  const handleRemoveSelectedAlbumItems = () => {
    if (selectedAlbumItemIds.length === 0) return;
    const toRemove = new Set(selectedAlbumItemIds);
    setAlbumFiles(prev => prev.filter(x => !toRemove.has(x.id)));
    setSelectedAlbumItemIds([]);
  };

  const handleSelectAllAlbumItems = () => {
    setSelectedAlbumItemIds(albumFiles.map(x => x.id));
  };

  const handleDeselectAllAlbumItems = () => {
    setSelectedAlbumItemIds([]);
  };

  const handleRunAIAutoTag = async (overridePreviewUrl?: string) => {
    setIsAnalyzingAI(true);
    setAiApplied(false);
    setAiProgress(12);
    setAiStep(1);
    setAiStepStatusText('Step 1/3: Scanning visual features & facial landmarks...');

    const timer1 = setTimeout(() => {
      setAiProgress(48);
      setAiStep(2);
      setAiStepStatusText('Step 2/3: Detecting location landmarks, spatial surroundings & geodata...');
    }, 450);

    const timer2 = setTimeout(() => {
      setAiProgress(82);
      setAiStep(3);
      setAiStepStatusText('Step 3/3: Extracting categorical metadata, sentiment & deep tags...');
    }, 900);

    try {
      const previewData = overridePreviewUrl || filePreviewUrl || singleImageUrl || (albumFiles.length > 0 ? albumFiles[0].previewUrl : undefined);
      
      const res = await fetch('/api/ai/auto-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: previewData && previewData.startsWith('data:') ? previewData : undefined,
          imageUrl: previewData && !previewData.startsWith('data:') ? previewData : undefined,
          title: title || 'Family Memory Photo',
          description: description,
          category: category
        })
      });

      if (res.ok) {
        const data = await res.json();
        clearTimeout(timer1);
        clearTimeout(timer2);
        setAiProgress(100);
        setAiStep(3);
        setAiStepStatusText('Auto-Tagging Analysis Complete!');
        setAiSuggestions(data);
      }
    } catch (err) {
      console.error('Error running AI auto-tagging:', err);
    } finally {
      setTimeout(() => {
        setIsAnalyzingAI(false);
      }, 500);
    }
  };

  const handleApplyAISuggestions = () => {
    if (!aiSuggestions) return;

    if (aiSuggestions.category && (['Personal', 'Family', 'Legal', 'Memorial', 'Time Capsule'].includes(aiSuggestions.category))) {
      setCategory(aiSuggestions.category as any);
    }

    if (aiSuggestions.people && aiSuggestions.people.length > 0) {
      setPeople(aiSuggestions.people.join(', '));
    }

    if (aiSuggestions.location) {
      setLocation(aiSuggestions.location);
    }

    if (aiSuggestions.tags && aiSuggestions.tags.length > 0) {
      const currentTags = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const newTags = Array.from(new Set([...currentTags, ...aiSuggestions.tags]));
      setTags(newTags.join(', '));
    }

    if (aiSuggestions.description) {
      setDescription(prev => prev ? `${prev}\n\n[AI Caption]: ${aiSuggestions.description}` : aiSuggestions.description!);
    }

    setAiApplied(true);
  };

  const handleStartArchiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (archivalPassphrase.length < 12) {
      setSecurityError('Enter your Vault Security passphrase to encrypt every file for permanent Arweave storage.');
      securityInputRef.current?.focus();
      return;
    }
    setSecurityError('');
    if (uploadMode === 'single' && !selectedFile) {
      setSecurityError('Choose a local file so Aeterna can encrypt and store the original permanently.');
      return;
    }
    if (uploadMode === 'album' && !albumFiles.length) {
      setSecurityError('Choose or import at least one file before saving the album permanently.');
      return;
    }
    if (uploadMode === 'album') {
      const activityResponse = await fetch('/api/import-jobs');
      if (activityResponse.ok) {
        const activityBody = await activityResponse.json();
        const transferring = (activityBody.jobs || []).filter((job: any) => ['queued', 'transferring', 'cancel_requested'].includes(job.status)).length;
        if (transferring > 0) { setCloudActivity(previous => ({ ...previous, transferring })); return; }
      }
    }
    if (!title) return;
    setArchiveMasterPassphrase(archivalPassphrase);

    setIsArchiving(true);
    setArchiveProgress(5);
    setArchiveStep(1);
    setArchiveQueueResult({ queued: 0, failed: 0, privateOnly: 0 });

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

    try {
      if (uploadMode === 'single') {
        let storedMediaUrl: string | null = null;
        let storedMediaId: string | undefined;
        let archiveJobId: string | undefined;
        let archiveStatus: MemoryItem["archiveStatus"] = "r2_only";
        let archiveError: string | undefined;
        if (selectedFile) {
          setArchiveStatusText('Uploading original media to private Cloudflare R2 storage...');
          const stored = await uploadMediaFile(selectedFile, progress => setArchiveProgress(5 + Math.round(progress * 0.25)));
          storedMediaUrl = stored?.mediaUrl || null;
          storedMediaId = stored?.mediaId;
        }
        if (!storedMediaId) throw new Error('The operational upload could not be verified, so permanent storage was not started.');
        setArchiveStatusText('Encrypting single memory payload...');
        const contentType = selectedFile ? selectedFile.type : 'image/jpeg';

        setArchiveProgress(35);

        if (selectedFile && storedMediaId) {
          setArchiveStatusText('Encrypting and queueing permanent archive...');
          try {
            const archive = await queuePermanentArchive(selectedFile, archivalPassphrase, value => setArchiveProgress(35 + Math.round(value * 0.55)), storedMediaId);
            archiveJobId = archive.jobId;
            archiveStatus = 'queued';
          } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Permanent archive queueing failed.');
          }
        }
        setArchiveProgress(90);
        setArchiveStep(3);
        setArchiveQueueResult({
          queued: archiveStatus === 'queued' ? 1 : 0,
          failed: 0,
          privateOnly: archiveStatus === 'r2_only' ? 1 : 0,
        });

        setTimeout(() => {
          setArchiveProgress(100);
          const fallbackImg = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800';
          const finalImg = selectedFile?.type.startsWith('image/') ? (storedMediaUrl || filePreviewUrl || fallbackImg) : (singleImageUrl || fallbackImg);

          const peopleArr = people.split(',').map(p => p.trim()).filter(Boolean);

          const newMem: MemoryItem = {
            id: `mem-${Date.now()}`,
            title,
            category,
            date: formattedDateString,
            time: time || undefined,
            location: location || 'Sovereign Archive Node',
            imageUrl: finalImg,
            videoUrl: selectedFile?.type.startsWith('video/') ? (storedMediaUrl || undefined) : undefined,
            mediaType: selectedFile?.type.startsWith('video/') ? 'video' : selectedFile?.type === 'application/pdf' ? 'document' : 'photo',
            description: description || 'Memory stored privately in Aeterna Vault.',
            encryptionLevel,
            mediaId: storedMediaId,
            archiveJobId,
            archiveStatus,
            archiveError,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean),
            people: peopleArr.length > 0 ? peopleArr : undefined,
            autoTags: aiSuggestions ? {
              category: aiSuggestions.category,
              people: aiSuggestions.people,
              location: aiSuggestions.location,
              tags: aiSuggestions.tags
            } : undefined
          };

          onAddMemory(newMem);
        }, 800);

      } else {
        // ALBUM BATCH MODE
        setArchiveStatusText(`Packaging album items for "${title}"...`);
        const itemsToProcess = albumFiles;

        const createdMemories: MemoryItem[] = [];
        const totalItems = itemsToProcess.length;

        for (let idx = 0; idx < itemsToProcess.length; idx++) {
          const item = itemsToProcess[idx];
          const currentProgress = Math.round(((idx + 1) / totalItems) * 85);
          setArchiveProgress(currentProgress);
          setArchiveStatusText(`Encrypting album item ${idx + 1} of ${totalItems}: ${item.name}...`);

          const contentType = item.file ? item.file.type : (item.mimeType || 'image/jpeg');
          let storedMediaUrl = item.storedMediaUrl || item.previewUrl;
          let storedMediaId = item.mediaId;
          let archiveJobId: string | undefined;
          let archiveStatus: MemoryItem["archiveStatus"] = "r2_only";
          let archiveError: string | undefined;
          if (item.file) {
            setArchiveStatusText(`Uploading album item ${idx + 1} of ${totalItems} to private Cloudflare R2 storage...`);
            const stored = await uploadMediaFile(item.file, progress => setArchiveProgress(Math.round(((idx + progress / 100) / totalItems) * 80)), title);
            storedMediaUrl = stored?.mediaUrl || item.previewUrl;
            storedMediaId = stored?.mediaId;
          }


          const itemTitle = totalItems === 1
            ? title
            : `${title} (${idx + 1}/${totalItems}) - ${item.name.replace(/\.[^/.]+$/, "")}`;

          if (storedMediaId) {
            setArchiveStatusText(`Preparing permanent archive ${idx + 1} of ${totalItems}...`);
            try {
              let archiveFile=item.file;
              if (!archiveFile) {
                const response=await fetch(`/api/media/${encodeURIComponent(storedMediaId)}`,{cache:"no-store"});
                if(!response.ok)throw new Error("Private media could not be loaded for permanent archiving.");
                const blob=await response.blob();
                archiveFile=new File([blob],item.name,{type:contentType||blob.type||"application/octet-stream"});
              }
              const archive=await queuePermanentArchive(archiveFile,archivalPassphrase,value=>setArchiveProgress(Math.round(((idx+value/100)/totalItems)*90)),storedMediaId,title);
              archiveJobId=archive.jobId;
              archiveStatus="queued";
            } catch (error) {
              throw new Error(error instanceof Error?error.message:"Permanent archive queueing failed.");
            }
          }
          const peopleArr = people.split(',').map(p => p.trim()).filter(Boolean);

          createdMemories.push({
            id: `mem-${Date.now()}-${idx}`,
            title: itemTitle,
            category,
            date: formattedDateString,
            time: time || undefined,
            location: location || 'Sovereign Album Node',
            imageUrl: contentType.startsWith("image/") ? storedMediaUrl : (item.thumbnailUrl || "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800"),
            thumbnailUrl: item.thumbnailUrl,
            fileSizeBytes: item.size,
            width: item.width || undefined,
            height: item.height || undefined,
            durationMs: item.durationMs || undefined,
            sourceProvider: item.sourceProvider,
            sourceCreatedAt: item.createdTime || undefined,
            mediaId: storedMediaId,
            processingStatus: (item.processingStatus || undefined) as MemoryItem['processingStatus'],
            videoUrl: contentType.startsWith('video/') ? storedMediaUrl : undefined,
            mediaType: contentType.startsWith('video/') ? 'video' : contentType === 'application/pdf' ? 'document' : 'photo',
            description: description || `Preserved in Album "${title}" with ${totalItems} total files.`,
            encryptionLevel,
            archiveJobId,
            archiveStatus,
            archiveError,
            tags: [...tags.split(',').map(t => t.trim()).filter(Boolean), 'Album'],
            albumName: title,
            people: peopleArr.length > 0 ? peopleArr : undefined,
            autoTags: aiSuggestions ? {
              category: aiSuggestions.category,
              people: aiSuggestions.people,
              location: aiSuggestions.location,
              tags: aiSuggestions.tags
            } : undefined
          });
        }

        const queuedCount=createdMemories.filter(item=>item.archiveStatus==="queued").length;
        const failedCount=createdMemories.filter(item=>item.archiveStatus==="failed").length;
        const privateOnlyCount=createdMemories.length-queuedCount-failedCount;
        setArchiveQueueResult({queued:queuedCount,failed:failedCount,privateOnly:privateOnlyCount});
        setArchiveStep(3);
        setArchiveProgress(95);
        if (queuedCount !== createdMemories.length) throw new Error('Permanent storage could not be queued for every album item.');
        setArchiveStatusText(`All ${queuedCount} ${queuedCount===1?'item is':'items are'} encrypted and queued for permanent Arweave storage.`);

        setTimeout(() => {
          setArchiveProgress(100);
          onAddMemory(createdMemories);
        }, 1000);
      }

    } catch (err: any) {
      console.error('Error archiving to Arweave:', err);
      setArchiveProgress(100);
      triggerGlobalArweaveAlert({
        type: 'timeout',
        itemTitle: title || 'Memory Asset',
        errorMsg: err?.message || 'Arweave permaweb upload request timed out or connection was disrupted.'
      });
    }
  };

  const handleFinishModal = () => {
    setIsArchiving(false);
    setArchiveProgress(0);
    setTitle('');
    setDescription('');
    setSingleImageUrl('');
    setSelectedFile(null);
    setFilePreviewUrl('');
    setAlbumFiles([]);
    setPastedUrlInput("");
    onClose();
  };

  const handleViewSavedFiles = () => {
    const albumName = uploadMode === 'album' ? title : undefined;
    handleFinishModal();
    onViewFiles?.(albumName);
  };

  const totalAlbumSizeBytes = albumFiles.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const totalAlbumSizeMb = (totalAlbumSizeBytes / 1024 / 1024).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto text-[#E8DDF5]">
      
      {!isArchiving ? (
        /* Form View */
        <div className="cosmic-card-gold max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-[#DFB260] max-h-[92vh] overflow-y-auto no-scrollbar">
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] text-sm font-semibold p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1 pr-10">
            <div className="inline-flex items-center space-x-2 text-[#F5D77F] text-xs font-mono font-semibold uppercase tracking-wider">
              <Upload className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>New memory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
              {uploadMode === 'album' ? 'Create an album' : 'Add a memory'}
            </h2>
            <p className="text-xs text-[#C8B1E4]/80 font-medium">
              {uploadMode === 'album'
                ? 'Choose a group of photos or files, then add the details you want to remember.'
                : 'Choose a photo, video, or document and tell the story behind it.'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-[#120B21] p-1.5 rounded-2xl border border-[#DFB260]/40 flex items-center justify-between text-xs font-semibold gap-1.5 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => setUploadMode('single')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                uploadMode === 'single'
                  ? 'bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] font-bold shadow-md'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Single memory</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode('album')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                uploadMode === 'album'
                  ? 'bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] font-bold shadow-md'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>Create an album</span>
            </button>

            <button type="button" onClick={() => setCloudImportOpen(true)} className="flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 text-[#F5D77F] hover:text-[#FFF2A8] hover:bg-white/5 border border-[#DFB260]/30 transition-all cursor-pointer">
              <Cloud className="w-4 h-4" /><span>Import</span>
            </button>

            {onOpenVideoRecorder && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenVideoRecorder();
                }}
                className="flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold transition-all cursor-pointer shadow-md border border-amber-400/40"
              >
                <Camera className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>Record video</span>
              </button>
            )}
          </div>

          <BackgroundImportProgress onImported={handleCloudImported} onStatusChange={setCloudActivity} />

          <div className="grid grid-cols-3 gap-2 text-[11px]" aria-label="Three steps to save a memory">
            {['1  Choose', '2  Describe', '3  Save privately'].map((step, index) => (
              <div key={step} className={`rounded-xl border px-3 py-2 text-center font-semibold ${index === 0 ? 'border-[#F5D77F] bg-[#DFB260]/15 text-[#FFF2A8]' : 'border-[#DFB260]/20 bg-[#120B21]/60 text-[#C8B1E4]'}`}>
                {step}
              </div>
            ))}
          </div>

          <form onSubmit={handleStartArchiving} className="space-y-4 text-xs font-sans">
            
            {/* Title / Album Title */}
            <div>
              <label className="block text-[#FFF2A8] font-semibold mb-1">
                {uploadMode === 'album' ? 'Album name' : 'What would you like to call this memory?'}
                <span className="ml-1 text-[#C8B1E4]/60 font-normal">Required</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={uploadMode === 'album' ? "e.g., Cape Cod family reunion" : "e.g., Sunday afternoon with Grandma"}
                className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                required
              />
            </div>

            {/* Category, Date, Time, Location */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Type</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                >
                  <option value="Family" className="bg-[#120B21]">Family</option>
                  <option value="Personal" className="bg-[#120B21]">Personal</option>
                  <option value="Memorial" className="bg-[#120B21]">Memorial</option>
                  <option value="Legal" className="bg-[#120B21]">Legal</option>
                  <option value="Time Capsule" className="bg-[#120B21]">Time Capsule</option>
                </select>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">When was this?</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Time <span className="text-[#C8B1E4]/60 font-normal">Optional</span></label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  />
                  <Clock className="w-3.5 h-3.5 text-[#F5D77F] absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Where? <span className="text-[#C8B1E4]/60 font-normal">Optional</span></label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Cape Cod, MA"
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                />
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              ref={fileInputRef}
              type="file" 
              onChange={handleFileInputChange}
              className="hidden" 
              multiple={uploadMode === 'album'}
              accept="image/*,video/*,application/pdf"
            />

            {/* FILE SELECTION AREA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[#FFF2A8] font-semibold">
                  {uploadMode === 'album' ? 'Choose photos or files' : 'Choose a photo, video, or document'}
                </label>
                {uploadMode === 'album' && albumFiles.length > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#F5D77F] bg-[#DFB260]/20 px-2.5 py-0.5 rounded-full border border-[#DFB260]/40">
                    📁 {albumFiles.length} {albumFiles.length === 1 ? 'file' : 'files'} selected ({totalAlbumSizeMb} MB)
                  </span>
                )}
              </div>

              {uploadMode === 'single' ? (
                /* SINGLE FILE DROPZONE */
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#120B21]/60 border-2 border-dashed border-[#DFB260]/40 hover:border-[#DFB260] rounded-3xl p-5 text-center space-y-3 cursor-pointer transition-colors relative overflow-hidden"
                >
                  {filePreviewUrl ? (
                    <div className="flex flex-col items-center space-y-2">
                      <img 
                        src={filePreviewUrl} 
                        alt="Upload Preview" 
                        className="w-24 h-24 object-cover rounded-2xl border-2 border-[#DFB260] shadow-md"
                      />
                      <div className="flex items-center space-x-1.5 text-xs text-[#F5D77F] font-semibold">
                        <FileCheck className="w-4 h-4" />
                        <span>{selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <span className="text-[10px] text-[#C8B1E4]/70">Click or drag another file to replace</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#F5D77F] mx-auto" />
                      <div>
                        <p className="text-[#FFF2A8] font-semibold text-base">Drop a file here, or click to choose</p>
                        <p className="text-[11px] text-[#C8B1E4]/80 mt-1">Photos, videos, and PDFs up to 100 MB · permanent Arweave storage included</p>
                      </div>
                    </>
                  )}

                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={singleImageUrl}
                      onChange={(e) => setSingleImageUrl(e.target.value)}
                      placeholder="Or paste a link to an image"
                      className="w-full max-w-md bg-[#1e1035] border border-[#DFB260]/30 rounded-xl p-2.5 text-center text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] mx-auto font-medium shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                /* BATCH ALBUM DROPZONE & GALLERY */
                <div className="space-y-3">
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#120B21]/60 border-2 border-dashed border-[#DFB260]/50 hover:border-[#DFB260] rounded-3xl p-5 text-center space-y-2 cursor-pointer transition-colors relative"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#F5D77F] flex items-center justify-center mx-auto">
                      <Images className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[#FFF2A8] font-semibold font-cinzel text-base">Drag & drop multiple files to create album batch</p>
                      <p className="text-[11px] text-[#C8B1E4]/80 font-mono">Select multiple high-res photos or files at once</p>
                    </div>
                    <button
                      type="button"
                      className="gold-filled-btn text-[11px] px-4 py-1.5 uppercase tracking-wider inline-flex items-center space-x-1.5 cursor-pointer mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Select Files for Album</span>
                    </button>
                  </div>

                  {/* External URL adder for Album */}
                  <div className="flex items-center space-x-2 bg-[#1e1035] p-2 rounded-2xl border border-[#DFB260]/30">
                    <input
                      type="text"
                      value={pastedUrlInput}
                      onChange={(e) => setPastedUrlInput(e.target.value)}
                      placeholder="Paste external image URL to include in this album..."
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPastedUrlToAlbum}
                      className="gold-beveled-btn px-3 py-1.5 text-[11px] font-semibold text-[#FFF2A8] whitespace-nowrap cursor-pointer"
                    >
                      + Add URL
                    </button>
                  </div>

                  {/* ALBUM FILE GRID GALLERY */}
                  {albumFiles.length > 0 && (
                    <div className="bg-[#120B21] p-3.5 rounded-2xl border border-[#DFB260]/30 space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5D77F] block">
                            Selected Album Contents ({albumFiles.length})
                          </span>
                          <span className="text-[10px] text-[#C8B1E4]/70 font-mono">
                            💡 Hold Shift + Click to multi-select range
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px]">
                          {selectedAlbumItemIds.length > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={handleRemoveSelectedAlbumItems}
                                className="bg-red-950/90 hover:bg-red-800 text-red-200 border border-red-500/50 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove ({selectedAlbumItemIds.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllAlbumItems}
                                className="text-[#C8B1E4] hover:text-[#FFF2A8] underline text-[10px] cursor-pointer"
                              >
                                Clear
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSelectAllAlbumItems}
                              className="text-[#F5D77F] hover:text-[#FFF2A8] underline text-[10px] cursor-pointer"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {albumFiles.map((item, idx) => {
                          const isSelected = selectedAlbumItemIds.includes(item.id);
                          return (
                            <div 
                              key={item.id}
                              onClick={(e) => handleAlbumItemClick(item, idx, e)}
                              className={`p-2 rounded-xl border flex items-center justify-between space-x-2 relative group cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#DFB260]/20 border-[#DFB260] ring-2 ring-[#DFB260]/50 scale-[1.01]'
                                  : 'bg-[#1a0d36] border-[#DFB260]/30 hover:border-[#DFB260]/60'
                              }`}
                            >
                              <div className="flex items-center space-x-2 overflow-hidden">
                                {item.mimeType?.startsWith("video/") ? (
                                  <video src={item.previewUrl} aria-label={item.name} muted preload="metadata" className="w-9 h-9 object-cover rounded-lg border border-[#DFB260]/40 flex-shrink-0" />
                                ) : (
                                  <img src={item.previewUrl} alt={item.name} className="w-9 h-9 object-cover rounded-lg border border-[#DFB260]/40 flex-shrink-0" />
                                )}
                                <div className="overflow-hidden text-left">
                                  <p className="text-[11px] font-semibold text-[#FFF2A8] truncate">{item.name}</p>
                                  <p className="text-[9px] font-mono text-[#C8B1E4]/70">#{idx + 1} • {(item.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAlbumFile(item.id);
                                }}
                                className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                                title="Remove from album"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Optional organization assistance */}
            <div className="bg-[#120B21]/70 p-4 rounded-2xl border border-[#DFB260]/25 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40">
                    <Wand2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-semibold text-[#FFF2A8] text-sm block">Want help filling in the details?</span>
                    <span className="text-[10px] text-[#C8B1E4]/80 block">Aeterna can suggest people, places, and topics. You review everything before it is added.</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRunAIAutoTag()}
                  disabled={isAnalyzingAI}
                  className="gold-filled-btn text-xs px-4 py-2 font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isAnalyzingAI ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#120B21]" />
                      <span>Auto-Tagging...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#120B21]" />
                      <span>Suggest details</span>
                    </>
                  )}
                </button>
              </div>

              {/* REAL-TIME AI AUTO-TAGGING VISUAL STATUS INDICATOR */}
              {isAnalyzingAI && (
                <div className="bg-[#0A0514] p-4 rounded-xl border border-[#DFB260] space-y-3 shadow-2xl animate-fade-in relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs relative z-10">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 text-[#F5D77F] animate-spin" />
                      <span className="font-cinzel font-bold text-[#FFF2A8] text-xs uppercase tracking-wider">
                        Gemini AI Media Auto-Tagging
                      </span>
                    </div>
                    <span className="font-mono text-[#F5D77F] font-bold text-xs bg-[#DFB260]/20 px-2.5 py-0.5 rounded-full border border-[#DFB260]/40">
                      {aiProgress}%
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 bg-[#120B21] rounded-full overflow-hidden border border-[#DFB260]/30 relative z-10">
                    <div
                      className="h-full bg-gradient-to-r from-[#DFB260] via-[#F5D77F] to-[#FFF2A8] transition-all duration-300 ease-out shadow-[0_0_12px_rgba(223,178,96,0.8)]"
                      style={{ width: `${aiProgress}%` }}
                    />
                  </div>

                  {/* 3 Step Badges */}
                  <div className="grid grid-cols-3 gap-2 pt-1 relative z-10 text-[10px]">
                    <div className={`p-2 rounded-xl border flex flex-col items-center text-center space-y-1 transition-all ${
                      aiStep >= 1 ? 'bg-[#DFB260]/20 border-[#DFB260] text-[#FFF2A8]' : 'bg-[#120B21]/50 border-gray-800 text-gray-500'
                    }`}>
                      <Users className={`w-3.5 h-3.5 ${aiStep === 1 ? 'text-[#F5D77F] animate-bounce' : 'text-[#DFB260]'}`} />
                      <span className="font-bold leading-tight">1. Faces &amp; People</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex flex-col items-center text-center space-y-1 transition-all ${
                      aiStep >= 2 ? 'bg-[#DFB260]/20 border-[#DFB260] text-[#FFF2A8]' : 'bg-[#120B21]/50 border-gray-800 text-gray-500'
                    }`}>
                      <MapPin className={`w-3.5 h-3.5 ${aiStep === 2 ? 'text-[#F5D77F] animate-bounce' : 'text-[#DFB260]'}`} />
                      <span className="font-bold leading-tight">2. Location &amp; Geodata</span>
                    </div>

                    <div className={`p-2 rounded-xl border flex flex-col items-center text-center space-y-1 transition-all ${
                      aiStep >= 3 ? 'bg-[#DFB260]/20 border-[#DFB260] text-[#FFF2A8]' : 'bg-[#120B21]/50 border-gray-800 text-gray-500'
                    }`}>
                      <Tag className={`w-3.5 h-3.5 ${aiStep === 3 ? 'text-[#F5D77F] animate-bounce' : 'text-[#DFB260]'}`} />
                      <span className="font-bold leading-tight">3. Categorical Tags</span>
                    </div>
                  </div>

                  {/* Status Log */}
                  <div className="bg-[#120B21] p-2 rounded-lg border border-[#DFB260]/30 text-[10px] font-mono text-[#F5D77F] flex items-center justify-between relative z-10">
                    <span className="truncate">{aiStepStatusText}</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0 ml-2"></span>
                  </div>
                </div>
              )}

              {/* AI SUGGESTIONS DISPLAY */}
              {aiSuggestions && !isAnalyzingAI && (
                <div className="bg-[#1A0C33] p-3.5 rounded-xl border border-[#DFB260]/50 space-y-2.5 animate-fade-in text-xs">
                  <div className="flex items-center justify-between border-b border-[#DFB260]/20 pb-2">
                    <span className="font-mono text-[10px] uppercase font-bold text-[#F5D77F] flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span>Gemini AI Memory Insights</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleApplyAISuggestions}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] uppercase tracking-wider cursor-pointer flex items-center space-x-1 transition-all ${
                        aiApplied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-[#DFB260] text-[#120B21] hover:bg-[#F5D77F] shadow'
                      }`}
                    >
                      {aiApplied ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>AI Tags Applied</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-3 h-3" />
                          <span>Apply AI Tags to Form</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <span className="text-[#C8B1E4]/70 font-mono block">Category:</span>
                      <span className="text-[#FFF2A8] font-bold">{aiSuggestions.category || category}</span>
                    </div>
                    <div>
                      <span className="text-[#C8B1E4]/70 font-mono block">Location:</span>
                      <span className="text-[#FFF2A8] font-bold">📍 {aiSuggestions.location || location || 'Detected'}</span>
                    </div>
                  </div>

                  {aiSuggestions.people && aiSuggestions.people.length > 0 && (
                    <div>
                      <span className="text-[#C8B1E4]/70 font-mono block mb-1">Detected / Suggested People:</span>
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        {aiSuggestions.people.map(p => (
                          <span key={p} className="px-2 py-0.5 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 font-semibold flex items-center gap-1 text-[10px]">
                            <Users className="w-2.5 h-2.5 text-[#F5D77F]" />
                            <span>{p}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSuggestions.tags && aiSuggestions.tags.length > 0 && (
                    <div>
                      <span className="text-[#C8B1E4]/70 font-mono block mb-1">Suggested Memory Tags:</span>
                      <div className="flex items-center space-x-1 flex-wrap gap-y-1">
                        {aiSuggestions.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 rounded bg-[#120B21] text-[#F5D77F] border border-[#DFB260]/30 font-mono text-[10px]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiSuggestions.description && (
                    <div className="pt-1 text-[11px] text-[#C8B1E4] italic border-t border-[#DFB260]/20">
                      "{aiSuggestions.description}"
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* People Featured Input */}
            <div>
              <label className="block text-[#FFF2A8] font-semibold mb-1 flex items-center space-x-1.5">
                <Users className="w-3.5 h-3.5 text-[#F5D77F]" />
                <span>Who is in this memory?</span>
                <span className="text-[#C8B1E4]/60 font-normal">Optional</span>
              </label>
              <input
                type="text"
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                placeholder="Add names separated by commas"
                className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
              />
            </div>

            {/* SPOKEN VOICE RECORDING & AI TRANSCRIPTION FOR TIME CAPSULES & MEMORIES */}
            <div className="bg-[#120B21]/90 p-4 rounded-2xl border border-[#DFB260]/40 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <Mic className="w-4 h-4 text-amber-300" />
                  </div>
                  <div>
                    <span className="font-cinzel font-bold text-[#FFF2A8] text-xs block">
                      Tell the story out loud
                    </span>
                    <span className="text-[10px] text-[#C8B1E4]/80 font-mono block">
                      Record a voice note and turn it into a written story.
                    </span>
                  </div>
                </div>

                {!isRecordingAudio && !audioDataUrl && (
                  <button
                    type="button"
                    onClick={startAudioRecording}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow"
                  >
                    <Mic className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                    <span>Record story</span>
                  </button>
                )}
              </div>

              {/* Active Recording State */}
              {isRecordingAudio && (
                <div className="bg-[#0A0514] p-3 rounded-xl border border-rose-500/50 flex items-center justify-between gap-3 animate-pulse">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                    <span className="font-mono text-rose-300 font-bold text-xs uppercase">
                      Recording Voice Story... {Math.floor(audioRecordingTime / 60)}:{String(audioRecordingTime % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={stopAudioRecording}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
                  >
                    <Square className="w-3 h-3" />
                    <span>Stop Recording</span>
                  </button>
                </div>
              )}

              {/* Recorded Audio Controls & Transcribe Action */}
              {audioDataUrl && !isRecordingAudio && (
                <div className="bg-[#0A0514] p-3 rounded-xl border border-[#DFB260]/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-[#F5D77F] font-semibold">
                      <Volume2 className="w-4 h-4 text-[#F5D77F]" />
                      <span>Spoken Voice Recording Captured ({audioRecordingTime}s)</span>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={togglePlayAudio}
                        className="px-2.5 py-1 rounded-lg bg-[#DFB260]/20 hover:bg-[#DFB260]/30 text-[#FFF2A8] border border-[#DFB260]/30 text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        {isPlayingRecordedAudio ? <Pause className="w-3 h-3 text-[#F5D77F]" /> : <Play className="w-3 h-3 text-[#F5D77F]" />}
                        <span>{isPlayingRecordedAudio ? 'Pause' : 'Play Audio'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={resetAudioRecording}
                        className="p-1 rounded-lg text-rose-300 hover:bg-rose-950/50 cursor-pointer"
                        title="Re-record Audio"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={handleTranscribeAudio}
                      disabled={isTranscribingAudio}
                      className="gold-filled-btn text-xs px-4 py-2 font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isTranscribingAudio ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#120B21]" />
                          <span>AI Transcribing Voice Story...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#120B21]" />
                          <span>⚡ AI Transcribe to Story</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Story / Description */}
            <div>
              <label className="block text-[#FFF2A8] font-semibold mb-1">
                {uploadMode === 'album' ? 'What is the story of this album?' : 'What happened in this memory?'}
                <span className="ml-1 text-[#C8B1E4]/60 font-normal">Optional</span>
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={uploadMode === 'album' ? "Share the occasion, people, and moments you want your family to remember..." : "Share what happened, who was there, and why this moment matters..."}
                className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
              ></textarea>
            </div>

            <details open className="group rounded-2xl border border-[#DFB260]/25 bg-[#120B21]/55 p-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-3 text-[#FFF2A8] font-semibold">
                <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-300" /> Permanent storage security</span>
                <span className="text-[10px] text-[#C8B1E4] font-normal">Required · Organization options are optional</span>
              </summary>
              <div className="mt-4 space-y-4 border-t border-[#DFB260]/15 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Topics</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Privacy level</label>
                <select
                  value={encryptionLevel}
                  onChange={(e: any) => setEncryptionLevel(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                >
                  <option value="Standard" className="bg-[#120B21]">Public</option>
                  <option value="Vault Level 3" className="bg-[#120B21]">Private</option>
                  <option value="Level 5 Protected" className="bg-[#120B21]">Private · Extra protection</option>
                  <option value="Quantum-Proof" className="bg-[#120B21]">Private · Maximum protection</option>
                </select>
              </div>
            </div>

            <div className="rounded-2xl border border-[#F5D77F]/45 bg-[#DFB260]/10 p-3">
              <label className="block text-[#FFF2A8] font-semibold mb-1">Vault Security passphrase <span className="text-amber-200">Required</span></label>
              <input ref={securityInputRef} type="password" value={archivalPassphrase} onChange={event=>{setArchivalPassphrase(event.target.value);setSecurityError('');}} placeholder="Unlock permanent encryption (12+ characters)" minLength={12} required aria-describedby="permanent-storage-help" className="w-full bg-[#090512] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]" />
              <p id="permanent-storage-help" className="mt-2 text-[10px] text-[#C8B1E4]">Every upload is encrypted in this browser, staged privately in R2, and automatically queued for permanent storage on Arweave. A save is not complete until every item is queued.</p>
              {securityError && <p role="alert" className="mt-2 text-xs text-rose-300">{securityError}</p>}
            </div>
              </div>
            </details>

            {cloudActivity.transferring > 0 && (
              <div className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-amber-100 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Waiting for {cloudActivity.transferring} Google {cloudActivity.transferring === 1 ? 'item' : 'items'} to finish transferring. Every original must arrive before this album can be archived.</span>
              </div>
            )}
            {cloudActivity.processing > 0 && cloudActivity.transferring === 0 && (
              <div className="rounded-xl border border-[#DFB260]/35 bg-[#DFB260]/10 px-3 py-2 text-[#FFF2A8]">
                {cloudActivity.processing} {cloudActivity.processing === 1 ? 'video is' : 'videos are'} safely stored and still optimizing thumbnails and playback. You may archive now.
              </div>
            )}

            {/* Submit Action Bar */}
            <div className="pt-3 flex items-center justify-end space-x-3 font-semibold">
              <button
                type="button"
                onClick={onClose}
                className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cloudActivity.transferring > 0 || archivalPassphrase.length < 12}
                className="gold-filled-btn px-6 py-2.5 text-xs cursor-pointer flex items-center space-x-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadMode === 'album' 
                    ? `Save album (${albumFiles.length || 1} ${albumFiles.length === 1 ? 'item' : 'items'})`
                    : 'Save permanently'}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* SCREEN: Overlay "Saving Memory" Modal */
        <div id="modal-archiving-permaweb" className="cosmic-card-gold max-w-lg w-full p-8 text-center space-y-6 shadow-2xl relative animate-fade-in border border-[#DFB260]">
          
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center mx-auto">
            <HardDrive className="w-8 h-8 animate-bounce text-[#F5D77F]" />
          </div>

          <div>
            <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border text-[10px] font-semibold uppercase mb-2 ${archiveProgress === 100 ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/35' : 'bg-[#DFB260]/20 text-[#FFF2A8] border-[#DFB260]/40'}`}>
              {archiveProgress === 100 ? <CheckCircle2 className="w-3 h-3" /> : <Loader2 className="w-3 h-3 animate-spin text-[#F5D77F]" />}
              <span>{archiveProgress === 100 ? 'Queued for permanent storage' : 'Permanent storage in progress'}</span>
            </div>
            <h3 className="font-cinzel font-bold text-3xl text-[#FFF2A8]">
              {archiveProgress === 100
                ? (uploadMode === 'album' ? `${albumFiles.length || 1} files are ready` : 'Your memory is ready')
                : (uploadMode === 'album' ? 'Saving Album Collection' : 'Saving Memory')}
            </h3>
            <p className="text-xs text-[#C8B1E4]/80 mt-1 font-medium">
              {archiveProgress === 100
                ? (uploadMode === 'album' ? `Find them in Memories → Albums → ${title}.` : 'Find it at the top of Memories under All memories.')
                : (archiveStatusText || 'Uploading the operational copy, encrypting it, and queueing permanent Arweave storage.')}
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="text-[#C8B1E4]/80 uppercase">Storage progress</span>
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
              <span>Private R2 operational upload prepared</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 2 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <HardDrive className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep >= 2 ? '✓' : '•'} Encrypting the permanent archive in this browser</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 3 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <ShieldCheck className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep < 3 ? "⊙ Waiting for archive queue result" : archiveQueueResult.queued > 0 ? `✓ ${archiveQueueResult.queued} Arweave ${archiveQueueResult.queued === 1 ? "job" : "jobs"} queued; confirmation will appear in Immortal Gateway` : "No Arweave archive jobs were queued"}</span>
            </div>
          </div>

          {archiveProgress === 100 ? <div className="rounded-2xl border border-[#DFB260]/25 bg-[#120B21] p-4 text-left text-xs"><p className="font-bold text-[#FFF2A8]">What happens next?</p><p className="mt-2 leading-5 text-[#C8B1E4]">{archiveQueueResult.queued} {archiveQueueResult.queued === 1 ? 'file is' : 'files are'} encrypted and queued for Arweave. You can use the files from Memories now; confirmation progress appears automatically in Vault Security.</p></div> : <div className="text-[11px] text-[#FFF2A8] bg-[#120B21] p-2.5 rounded-xl border border-[#DFB260]/30">Keep this window open until every file has been encrypted and queued. Arweave confirmation continues automatically afterward.</div>}

          {archiveProgress < 100 ? (
            <button
              onClick={handleFinishModal}
              className="gold-beveled-btn w-full py-3 text-xs text-[#FFF2A8] font-semibold cursor-pointer"
            >
              Run in Background
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button onClick={handleViewSavedFiles} className="gold-filled-btn w-full py-3 text-xs cursor-pointer font-bold">
                {uploadMode === 'album' ? `View “${title}” album` : 'View my memory'}
              </button>
              <button onClick={handleFinishModal} className="gold-beveled-btn px-5 py-3 text-xs text-[#FFF2A8] font-semibold cursor-pointer">Done</button>
            </div>
          )}

        </div>
      )}

      <CloudImportModal
        isOpen={cloudImportOpen}
        onClose={() => setCloudImportOpen(false)}
        onImported={handleCloudImported}
        albumName={title || "Imported Google Photos Album"}
        onGooglePhotosQueued={() => {
          setUploadMode("album");
          if (!title) setTitle("Imported Google Photos Album");
          setCloudImportOpen(false);
        }}
      />
    </div>
  );
};
