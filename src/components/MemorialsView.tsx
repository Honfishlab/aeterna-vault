import React, { useState, useRef } from 'react';
import { ViewMode, MemorialShrine, MemoryItem, TributeNote, LifeMilestone } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import { LifeTimeline } from './LifeTimeline';
import { triggerGlobalArweaveAlert } from './NotificationSystem';
import { 
  Sparkles, 
  Flame, 
  Heart, 
  Plus, 
  Share2, 
  BookOpen, 
  CheckCircle2, 
  Users,
  Trash2,
  Edit3,
  Flower2,
  Search,
  Calendar,
  MapPin,
  Quote,
  Clock,
  Send,
  Image as ImageIcon,
  X,
  Award,
  ShieldCheck,
  MessageSquare,
  Compass,
  FolderPlus,
  Upload,
  Camera,
  Images,
  Link,
  Check,
  Video,
  Mic,
  MicOff,
  Square,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Loader2,
  Wand2
} from 'lucide-react';

interface MemorialsViewProps {
  onSelectView: (view: ViewMode) => void;
  memorials: MemorialShrine[];
  memories?: MemoryItem[];
  onToggleCandle: (id: string) => void;
  onOfferFlowers?: (id: string) => void;
  onAddTribute?: (shrineId: string, tribute: TributeNote) => void;
  onAddMemorial?: (newShrine: MemorialShrine) => void;
  onEditMemorial?: (updatedShrine: MemorialShrine) => void;
  onDeleteMemorial?: (id: string) => void;
}

// Preset portrait photos for easy shrine creation
const SAMPLE_PORTRAITS = [
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=600',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=600'
];

// Preset cover banners
const SAMPLE_COVERS = [
  'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1200'
];

export const MemorialsView: React.FC<MemorialsViewProps> = ({
  onSelectView,
  memorials,
  memories,
  onToggleCandle,
  onOfferFlowers,
  onAddTribute,
  onAddMemorial,
  onEditMemorial,
  onDeleteMemorial,
}) => {
  // Main view filtering & selection states
  const [selectedShrine, setSelectedShrine] = useState<MemorialShrine | null>(null);
  const [selectedViewerImage, setSelectedViewerImage] = useState<MemoryItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'lit' | 'ancestors'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Shrine Detail Modal Active Tab
  const [detailTab, setDetailTab] = useState<'story' | 'tributes' | 'milestones'>('story');

  // Tribute Form state inside Shrine Detail Modal
  const [tribAuthor, setTribAuthor] = useState('');
  const [tribRelationship, setTribRelationship] = useState('');
  const [tribMessage, setTribMessage] = useState('');
  const [tribType, setTribType] = useState<TributeNote['tributeType']>('Family Memory');
  const [showTributeForm, setShowTributeForm] = useState(false);

  // Audio-to-Text Recording state inside Memorial Shrine View
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const [isPlayingRecordedAudio, setIsPlayingRecordedAudio] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

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
      alert('Microphone access denied or unavailable. Please check your browser microphone permissions.');
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
          shrineName: selectedShrine?.name || 'Beloved Ancestor',
          authorName: tribAuthor || 'Family Member'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription) {
          setTribMessage(data.transcription);
          setTribType('Spoken Story (Audio AI)');
          triggerGlobalArweaveAlert({
            type: 'failure',
            itemTitle: 'Spoken Memory Transcribed',
            errorMsg: 'Gemini AI successfully transcribed your audio recording into a tribute story!'
          });
        }
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  // Create Memorial Wizard Form state
  const [newName, setNewName] = useState('');
  const [newBornDate, setNewBornDate] = useState('1940');
  const [newPassedDate, setNewPassedDate] = useState('2022');
  const [newRelationship, setNewRelationship] = useState('Beloved Ancestor');
  const [newRestingPlace, setNewRestingPlace] = useState('Memorial Gardens');
  const [newMotto, setNewMotto] = useState('Live with purpose and kindness.');
  const [newBiography, setNewBiography] = useState('');
  const [newImageUrl, setNewImageUrl] = useState(SAMPLE_PORTRAITS[0]);
  const [newCoverUrl, setNewCoverUrl] = useState(SAMPLE_COVERS[0]);
  const [newKeyValues, setNewKeyValues] = useState('Kindness, Integrity, Legacy');
  const [newQuotes, setNewQuotes] = useState('Family is the anchor that holds in every storm.');

  // Interactive Media Builder state
  const [activeMediaTarget, setActiveMediaTarget] = useState<'portrait' | 'cover'>('portrait');
  const [activeMediaSource, setActiveMediaSource] = useState<'upload' | 'camera' | 'vault' | 'presets' | 'url'>('upload');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaFileInputRef = useRef<HTMLInputElement | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      alert("Camera access denied or unavailable. You can upload an image file instead.");
    }
  };

  const captureCameraSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      if (activeMediaTarget === 'portrait') {
        setNewImageUrl(dataUrl);
      } else {
        setNewCoverUrl(dataUrl);
      }
      triggerGlobalArweaveAlert({ type: 'failure', itemTitle: 'Camera Snapshot', errorMsg: 'Captured camera snapshot for memorial shrine' });
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const handleMediaFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const result = event.target.result as string;
        if (activeMediaTarget === 'portrait') {
          setNewImageUrl(result);
        } else {
          setNewCoverUrl(result);
        }
        triggerGlobalArweaveAlert({ type: 'failure', itemTitle: file.name, errorMsg: `Loaded image file: ${file.name}` });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMediaFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const result = event.target.result as string;
        if (activeMediaTarget === 'portrait') {
          setNewImageUrl(result);
        } else {
          setNewCoverUrl(result);
        }
        triggerGlobalArweaveAlert({ type: 'failure', itemTitle: file.name, errorMsg: `Loaded image file: ${file.name}` });
      }
    };
    reader.readAsDataURL(file);
  };

  // Custom milestone creation inside wizard
  const [milestoneList, setMilestoneList] = useState<LifeMilestone[]>([
    { year: '1940', title: 'Birth', description: 'Welcomed into the world surrounded by family.' },
    { year: '1965', title: 'Established Heritage', description: 'Built family foundation and lifelong achievements.' }
  ]);
  const [msYear, setMsYear] = useState('');
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');

  // Helper to convert shrine to viewer memory item
  const convertShrineToMemoryItem = (shrine: MemorialShrine): MemoryItem => ({
    id: shrine.id,
    title: shrine.name,
    category: 'Memorial',
    description: `${shrine.relationship} (${shrine.years}). "${shrine.motto}"`,
    date: shrine.years,
    time: 'Immortal Preserved',
    location: shrine.restingPlace || 'Digital Ancestral Shrine',
    imageUrl: shrine.imageUrl,
    encryptionLevel: 'Level 5 Protected',
    archiveStatus: 'r2_only',
    albumName: 'Digital Ancestral Shrines',
    tags: ['shrine', 'ancestor', 'memorial']
  });

  const shrineMemoryItems = memorials.map(convertShrineToMemoryItem);

  // Filtered Shrines
  const filteredShrines = memorials.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.relationship.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.motto.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterTab === 'lit') return s.candleLitToday;
    if (filterTab === 'ancestors') return s.relationship.toLowerCase().includes('grand') || s.relationship.toLowerCase().includes('ancestor');
    return true;
  });

  // Editing memorial state
  const [editingShrine, setEditingShrine] = useState<MemorialShrine | null>(null);

  const openCreateModal = () => {
    setEditingShrine(null);
    setNewName('');
    setNewBornDate('1940');
    setNewPassedDate('2022');
    setNewRelationship('Beloved Ancestor');
    setNewRestingPlace('Memorial Gardens');
    setNewMotto('Live with purpose and kindness.');
    setNewBiography('');
    setNewImageUrl(SAMPLE_PORTRAITS[0]);
    setNewCoverUrl(SAMPLE_COVERS[0]);
    setNewKeyValues('Kindness, Integrity, Legacy');
    setNewQuotes('Family is the anchor that holds in every storm.');
    setMilestoneList([
      { year: '1940', title: 'Birth', description: 'Welcomed into the world surrounded by family.' },
      { year: '1965', title: 'Family Establishment', description: 'Built a loving home and raised children.' },
      { year: '2022', title: 'Eternal Legacy', description: 'Passed peacefully, leaving an indelible imprint on our hearts.' }
    ]);
    setIsCreateModalOpen(true);
  };

  const openEditModal = (shrine: MemorialShrine) => {
    setEditingShrine(shrine);
    setNewName(shrine.name);
    setNewBornDate(shrine.bornDate || (shrine.years ? shrine.years.split('–')[0]?.trim() : '1940'));
    setNewPassedDate(shrine.passedDate || (shrine.years ? shrine.years.split('–')[1]?.trim() : '2022'));
    setNewRelationship(shrine.relationship || '');
    setNewRestingPlace(shrine.restingPlace || '');
    setNewMotto(shrine.motto || '');
    setNewBiography(shrine.biography || '');
    setNewImageUrl(shrine.imageUrl || SAMPLE_PORTRAITS[0]);
    setNewCoverUrl(shrine.coverImageUrl || SAMPLE_COVERS[0]);
    setNewKeyValues(shrine.keyValues ? shrine.keyValues.join(', ') : '');
    setNewQuotes(shrine.favoriteQuotes ? shrine.favoriteQuotes.join('\n') : '');
    setMilestoneList(shrine.lifeMilestones || []);
    setIsCreateModalOpen(true);
  };

  // Handle adding a milestone in creation wizard
  const handleAddMilestone = () => {
    if (!msYear || !msTitle) return;
    setMilestoneList(prev => [...prev, { year: msYear, title: msTitle, description: msDesc || msTitle }]);
    setMsYear('');
    setMsTitle('');
    setMsDesc('');
  };

  const handleRemoveMilestone = (index: number) => {
    setMilestoneList(prev => prev.filter((_, i) => i !== index));
  };

  // Submit New or Edited Memorial
  const handleCreateMemorialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const formattedYears = `${newBornDate || '1900'} – ${newPassedDate || '2025'}`;
    const keyVals = newKeyValues.split(',').map(v => v.trim()).filter(Boolean);
    const quotes = newQuotes.split('\n').map(q => q.trim()).filter(Boolean);

    if (editingShrine) {
      const updatedShrine: MemorialShrine = {
        ...editingShrine,
        name: newName.trim(),
        bornDate: newBornDate,
        passedDate: newPassedDate,
        years: formattedYears,
        relationship: newRelationship || 'Beloved Family Member',
        imageUrl: newImageUrl || SAMPLE_PORTRAITS[0],
        coverImageUrl: newCoverUrl || SAMPLE_COVERS[0],
        restingPlace: newRestingPlace || 'Family Sanctuary',
        motto: newMotto || 'Eternally cherished in our hearts.',
        biography: newBiography || `${newName} was a cherished light in our family, leaving behind enduring memories, wisdom, and love across generations.`,
        keyValues: keyVals.length > 0 ? keyVals : ['Kindness', 'Wisdom', 'Heritage'],
        favoriteQuotes: quotes.length > 0 ? quotes : ['The love we give remains forever.'],
        lifeMilestones: milestoneList,
      };

      if (onEditMemorial) {
        onEditMemorial(updatedShrine);
      }
      if (selectedShrine && selectedShrine.id === editingShrine.id) {
        setSelectedShrine(updatedShrine);
      }
      triggerGlobalArweaveAlert({ type: 'failure', itemTitle: updatedShrine.name, errorMsg: `Updated memorial shrine details for ${updatedShrine.name}` });
    } else {
      const newShrine: MemorialShrine = {
        id: `shrine-${Date.now()}`,
        name: newName.trim(),
        bornDate: newBornDate,
        passedDate: newPassedDate,
        years: formattedYears,
        relationship: newRelationship || 'Beloved Family Member',
        imageUrl: newImageUrl || SAMPLE_PORTRAITS[0],
        coverImageUrl: newCoverUrl || SAMPLE_COVERS[0],
        restingPlace: newRestingPlace || 'Family Sanctuary',
        tributesCount: 1,
        candlesLitCount: 1,
        flowersOfferedCount: 1,
        candleLitToday: true,
        motto: newMotto || 'Eternally cherished in our hearts.',
        biography: newBiography || `${newName} was a cherished light in our family, leaving behind enduring memories, wisdom, and love across generations.`,
        keyValues: keyVals.length > 0 ? keyVals : ['Kindness', 'Wisdom', 'Heritage'],
        favoriteQuotes: quotes.length > 0 ? quotes : ['The love we give remains forever.'],
        lifeMilestones: milestoneList,
        tributes: [
          {
            id: `trib-initial-${Date.now()}`,
            author: 'Vault Keeper',
            relationship: 'Family Member',
            message: 'Established this perpetual digital shrine to honor and remember forever on the Arweave permaweb.',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            tributeType: 'Honor & Gratitude'
          }
        ]
      };

      if (onAddMemorial) {
        onAddMemorial(newShrine);
      }
      triggerGlobalArweaveAlert({ type: 'failure', itemTitle: newShrine.name, errorMsg: `Established memorial shrine for ${newShrine.name}` });
    }

    setIsCreateModalOpen(false);
    setEditingShrine(null);
  };

  // Submit Tribute inside Shrine Detail
  const handleTributeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShrine || !tribMessage.trim()) return;

    const newTribute: TributeNote = {
      id: `trib-${Date.now()}`,
      author: tribAuthor.trim() || 'Anonymous Family Member',
      relationship: tribRelationship.trim() || 'Loved One',
      message: tribMessage.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      tributeType: tribType || 'Family Memory',
      audioUrl: audioDataUrl || undefined,
      isAudioTribute: !!audioDataUrl,
      transcription: tribMessage.trim()
    };

    if (onAddTribute) {
      onAddTribute(selectedShrine.id, newTribute);
    }

    // Update locally displayed selected shrine
    setSelectedShrine(prev => {
      if (!prev) return null;
      const currentTributes = prev.tributes || [];
      return {
        ...prev,
        tributes: [newTribute, ...currentTributes],
        tributesCount: prev.tributesCount + 1
      };
    });

    setTribMessage('');
    resetAudioRecording();
    setShowTributeForm(false);
  };

  // Copy share link
  const handleShareShrine = (shrine: MemorialShrine) => {
    const url = `${window.location.origin}/#memorial-${shrine.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    alert(`Permaweb Memorial Shrine link for "${shrine.name}" copied to clipboard:\n${url}`);
  };

  // Calculate totals across shrines
  const totalCandles = memorials.reduce((acc, m) => acc + (m.candlesLitCount || 100), 0);
  const totalFlowers = memorials.reduce((acc, m) => acc + (m.flowersOfferedCount || 50), 0);
  const totalTributes = memorials.reduce((acc, m) => acc + m.tributesCount, 0);

  return (
    <div id="memorials-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cosmic-card-gold p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl border border-[#DFB260]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-widest text-[#F5D77F] mb-2">
            <Sparkles className="w-4 h-4 text-[#F5D77F]" />
            <span>Zone 02 • Digital Ancestral Shrines</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-cinzel font-bold text-[#FFF2A8] tracking-tight">
            Perpetual Memorial Shrines
          </h1>
          <p className="text-sm text-[#C8B1E4] mt-2 font-medium leading-relaxed">
            Honoring ancestors and loved ones with gold-trimmed digital shrines, eternal flame candles, floral tributes, life stories, milestone timelines, and permanent memory walls sealed on the permaweb.
          </p>
          
          {/* Quick Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 mt-5 text-xs font-mono font-semibold text-[#F5D77F]">
            <span className="flex items-center space-x-1.5 bg-[#120B21]/80 px-3 py-1.5 rounded-xl border border-[#DFB260]/40">
              <Flame className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>{totalCandles} Flames Lit</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-[#120B21]/80 px-3 py-1.5 rounded-xl border border-[#DFB260]/40">
              <Flower2 className="w-4 h-4 text-amber-300" />
              <span>{totalFlowers} Flowers Offered</span>
            </span>
            <span className="flex items-center space-x-1.5 bg-[#120B21]/80 px-3 py-1.5 rounded-xl border border-[#DFB260]/40">
              <MessageSquare className="w-4 h-4 text-[#FFF2A8]" />
              <span>{totalTributes} Tributes Logged</span>
            </span>
          </div>
        </div>

        <button
          onClick={openCreateModal}
          className="gold-filled-btn text-xs px-6 py-4 flex items-center space-x-2 cursor-pointer shadow-[0_0_25px_rgba(245,215,127,0.35)] relative z-10 shrink-0 self-start md:self-center font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4 text-[#120B21]" />
          <span>+ Create New Shrine</span>
        </button>

        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#DFB260]/10 via-[#7353A0]/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 shadow-lg">
        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F5D77F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shrines by name or relationship..."
            className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl pl-10 pr-4 py-2 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F]"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center space-x-2 text-xs font-semibold w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
            }`}
          >
            All ({memorials.length})
          </button>
          <button
            onClick={() => setFilterTab('lit')}
            className={`px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-all cursor-pointer ${
              filterTab === 'lit'
                ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-emerald-400" />
            <span>Flames Lit Today</span>
          </button>
          <button
            onClick={() => setFilterTab('ancestors')}
            className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
              filterTab === 'ancestors'
                ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
            }`}
          >
            Ancestors
          </button>
        </div>
      </div>

      {/* SHRINES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredShrines.map((shrine) => (
          <div
            key={shrine.id}
            className="cosmic-card p-6 rounded-3xl hover:border-[#F5D77F] transition-all duration-300 space-y-5 relative group shadow-2xl flex flex-col justify-between"
          >
            <div className="absolute top-4 right-4 flex items-center space-x-1.5 z-10">
              <button
                onClick={() => openEditModal(shrine)}
                className="p-2 rounded-xl bg-[#0A0514] hover:bg-[#1a0f30] text-[#F5D77F] hover:text-[#FFF2A8] border border-[#DFB260]/30 transition-colors cursor-pointer"
                title="Edit Memorial Shrine"
              >
                <Edit3 className="w-4 h-4" />
              </button>

              {onDeleteMemorial && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the memorial shrine for "${shrine.name}"?`)) {
                      onDeleteMemorial(shrine.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-[#0A0514] hover:bg-red-950/80 text-red-300 hover:text-red-200 border border-red-500/30 transition-colors cursor-pointer"
                  title="Delete Shrine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Cover Banner Image Preview */}
              {shrine.coverImageUrl && (
                <div className="w-full h-24 rounded-2xl overflow-hidden relative border border-[#DFB260]/30 -mt-1">
                  <img
                    src={shrine.coverImageUrl}
                    alt={shrine.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0514] via-transparent to-transparent"></div>
                </div>
              )}

              {/* Avatar Portrait Photo */}
              <div 
                onClick={() => setSelectedViewerImage(convertShrineToMemoryItem(shrine))}
                className={`relative w-28 h-28 mx-auto p-1 bg-[#0A0514] rounded-2xl border-2 border-[#DFB260]/60 overflow-hidden cursor-pointer group-hover:scale-105 transition-transform shadow-xl ${shrine.coverImageUrl ? '-mt-14 z-10' : ''}`}
                title="Click to view full portrait lightbox"
              >
                <img
                  src={shrine.imageUrl}
                  alt={shrine.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-xl"
                />
                
                {/* Candle Flame Badge */}
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCandle(shrine.id);
                  }}
                  className="absolute -bottom-2 -right-2 bg-[#120B21] p-2 rounded-xl border border-[#DFB260]/50 shadow-md hover:scale-110 transition-transform cursor-pointer"
                  title={shrine.candleLitToday ? "Eternal Flame Lit Today" : "Click to Light Flame"}
                >
                  <Flame className={`w-5 h-5 ${shrine.candleLitToday ? 'text-emerald-400 animate-pulse' : 'text-[#F5D77F]'}`} />
                </div>
              </div>

              {/* Name & Dates */}
              <div className="text-center space-y-1">
                <h3 
                  onClick={() => {
                    setSelectedShrine(shrine);
                    setDetailTab('story');
                  }}
                  className="font-cinzel font-bold text-2xl text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors cursor-pointer hover:underline"
                >
                  {shrine.name}
                </h3>
                <p className="text-xs font-mono font-bold text-[#F5D77F] uppercase tracking-wider">{shrine.years}</p>
                <p className="text-xs text-[#C8B1E4] font-medium">{shrine.relationship}</p>
                {shrine.restingPlace && (
                  <p className="text-[11px] text-[#C8B1E4]/70 flex items-center justify-center space-x-1 pt-0.5">
                    <MapPin className="w-3 h-3 text-[#F5D77F]" />
                    <span>{shrine.restingPlace}</span>
                  </p>
                )}
              </div>

              {/* Quote / Epitaph */}
              <div className="bg-[#0A0514]/90 p-3.5 rounded-2xl border border-[#DFB260]/30 text-xs text-[#FFF2A8] italic text-center font-serif leading-relaxed">
                "{shrine.motto}"
              </div>

              {/* Counters Row */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono font-semibold bg-[#120B21]/60 p-2 rounded-xl border border-[#DFB260]/20">
                <div>
                  <div className="text-[#F5D77F] flex items-center justify-center space-x-1">
                    <Flame className="w-3 h-3 text-emerald-400" />
                    <span>{shrine.candlesLitCount || 100}</span>
                  </div>
                  <div className="text-[9px] text-[#C8B1E4]/70 uppercase">Flames</div>
                </div>
                <div>
                  <div className="text-[#F5D77F] flex items-center justify-center space-x-1">
                    <Flower2 className="w-3 h-3 text-amber-300" />
                    <span>{shrine.flowersOfferedCount || 50}</span>
                  </div>
                  <div className="text-[9px] text-[#C8B1E4]/70 uppercase">Flowers</div>
                </div>
                <div>
                  <div className="text-[#F5D77F] flex items-center justify-center space-x-1">
                    <MessageSquare className="w-3 h-3 text-[#FFF2A8]" />
                    <span>{shrine.tributesCount}</span>
                  </div>
                  <div className="text-[9px] text-[#C8B1E4]/70 uppercase">Tributes</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-4 border-t border-[#DFB260]/20 space-y-2 text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleCandle(shrine.id)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                    shrine.candleLitToday
                      ? 'bg-emerald-500 text-[#0f081d] font-bold shadow-md'
                      : 'bg-[#DFB260]/20 hover:bg-[#DFB260]/30 text-[#FFF2A8] border border-[#DFB260]/40'
                  }`}
                >
                  <Flame className={`w-4 h-4 ${shrine.candleLitToday ? 'text-[#0f081d]' : 'text-[#F5D77F]'}`} />
                  <span>{shrine.candleLitToday ? 'Flame Lit' : 'Light Flame'}</span>
                </button>

                {onOfferFlowers && (
                  <button
                    onClick={() => {
                      onOfferFlowers(shrine.id);
                      alert(`Offered fresh memorial flowers for ${shrine.name}!`);
                    }}
                    className="p-2.5 bg-[#120B21] hover:bg-[#1f1238] text-amber-300 border border-[#DFB260]/40 rounded-2xl transition-colors cursor-pointer"
                    title="Offer Virtual Flowers"
                  >
                    <Flower2 className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => handleShareShrine(shrine)}
                  className="p-2.5 bg-[#120B21] hover:bg-[#1f1238] text-[#C8B1E4] hover:text-[#FFF2A8] border border-[#DFB260]/40 rounded-2xl transition-colors cursor-pointer"
                  title="Share Memorial Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedShrine(shrine);
                  setDetailTab('story');
                }}
                className="w-full py-2.5 bg-[#1a0f30] hover:bg-[#28174a] text-[#F5D77F] border border-[#DFB260]/40 rounded-2xl transition-colors cursor-pointer flex items-center justify-center space-x-2 font-cinzel uppercase tracking-wider text-[11px] font-bold"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>View Full Shrine &amp; Story</span>
              </button>
            </div>
          </div>
        ))}

        {filteredShrines.length === 0 && (
          <div className="col-span-full cosmic-card p-12 text-center space-y-4 rounded-3xl border border-[#DFB260]/30">
            <Compass className="w-12 h-12 text-[#F5D77F] mx-auto animate-spin" />
            <h3 className="font-cinzel font-bold text-xl text-[#FFF2A8]">No Memorial Shrines Found</h3>
            <p className="text-xs text-[#C8B1E4] max-w-md mx-auto">
              No shrines matched your search filter. Create a new memorial shrine to honor your departed ancestors and loved ones.
            </p>
            <button
              onClick={openCreateModal}
              className="gold-filled-btn text-xs px-6 py-3 cursor-pointer"
            >
              + Create First Memorial Shrine
            </button>
          </div>
        )}
      </div>

      {/* FULL IMMERSIVE SHRINE DETAIL MODAL */}
      {selectedShrine && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto text-[#E8DDF5]">
          <div className="cosmic-card-gold max-w-3xl w-full p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl relative border-2 border-[#DFB260] max-h-[92vh] overflow-y-auto no-scrollbar">
            
            {/* Close Button */}
            <button
              onClick={() => setSelectedShrine(null)}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* HERO COVER HEADER */}
            <div className="relative rounded-2xl overflow-hidden border border-[#DFB260]/50 bg-[#0A0514]">
              {selectedShrine.coverImageUrl ? (
                <div className="h-44 sm:h-52 w-full relative">
                  <img
                    src={selectedShrine.coverImageUrl}
                    alt={selectedShrine.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A0514] via-[#0A0514]/60 to-transparent"></div>
                </div>
              ) : (
                <div className="h-32 w-full bg-gradient-to-r from-[#1E1035] via-[#2A1548] to-[#1E1035]"></div>
              )}

              {/* Portrait & Title Overlay */}
              <div className="p-6 relative -mt-16 sm:-mt-20 flex flex-col sm:flex-row items-center sm:items-end gap-5">
                <img
                  src={selectedShrine.imageUrl}
                  alt={selectedShrine.name}
                  onClick={() => setSelectedViewerImage(convertShrineToMemoryItem(selectedShrine))}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-2xl border-2 border-[#DFB260] shadow-2xl cursor-pointer hover:scale-105 transition-transform"
                  title="Click to expand portrait"
                />

                <div className="text-center sm:text-left space-y-1 flex-1">
                  <div className="inline-flex items-center space-x-2 text-[10px] font-mono font-semibold uppercase text-emerald-300 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/40">
                    <Flame className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Eternal Flame Preserved on Permaweb</span>
                  </div>
                  <h2 className="font-cinzel font-bold text-2xl sm:text-3xl text-[#FFF2A8]">
                    {selectedShrine.name}
                  </h2>
                  <p className="text-xs font-mono font-bold text-[#F5D77F] uppercase tracking-wider">{selectedShrine.years}</p>
                  <p className="text-xs text-[#C8B1E4] font-medium">{selectedShrine.relationship}</p>
                  {selectedShrine.restingPlace && (
                    <p className="text-xs text-[#C8B1E4]/80 flex items-center justify-center sm:justify-start space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span>{selectedShrine.restingPlace}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* REMEMBRANCE INTERACTION TOOLBAR */}
            <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/40 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onToggleCandle(selectedShrine.id)}
                  className={`px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-all cursor-pointer ${
                    selectedShrine.candleLitToday
                      ? 'bg-emerald-500 text-[#0f081d] font-bold shadow-md'
                      : 'bg-[#DFB260]/20 hover:bg-[#DFB260]/30 text-[#FFF2A8] border border-[#DFB260]/40'
                  }`}
                >
                  <Flame className="w-4 h-4 text-[#F5D77F]" />
                  <span>{selectedShrine.candleLitToday ? 'Flame Lit Today' : 'Light Flame'}</span>
                  <span className="text-[10px] opacity-80">({selectedShrine.candlesLitCount || 100})</span>
                </button>

                {onOfferFlowers && (
                  <button
                    onClick={() => {
                      onOfferFlowers(selectedShrine.id);
                      setSelectedShrine(prev => prev ? ({ ...prev, flowersOfferedCount: (prev.flowersOfferedCount || 0) + 1 }) : null);
                      alert(`Offered fresh virtual flowers for ${selectedShrine.name}!`);
                    }}
                    className="px-4 py-2.5 bg-[#1a0f30] hover:bg-[#28174a] text-amber-300 border border-[#DFB260]/40 rounded-xl flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Flower2 className="w-4 h-4 text-amber-300" />
                    <span>Offer Flowers</span>
                    <span className="text-[10px] opacity-80">({selectedShrine.flowersOfferedCount || 50})</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => openEditModal(selectedShrine)}
                  className="px-3.5 py-2.5 bg-[#1a0f30] hover:bg-[#28174a] text-[#F5D77F] border border-[#DFB260]/40 rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer font-semibold text-xs"
                  title="Edit Shrine Details"
                >
                  <Edit3 className="w-4 h-4 text-[#F5D77F]" />
                  <span>Edit Shrine</span>
                </button>

                <button
                  onClick={() => {
                    setDetailTab('tributes');
                    setShowTributeForm(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-[#120B21] font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>+ Share Tribute Story</span>
                </button>

                <button
                  onClick={() => handleShareShrine(selectedShrine)}
                  className="p-2.5 bg-[#1a0f30] hover:bg-[#28174a] text-[#C8B1E4] border border-[#DFB260]/40 rounded-xl cursor-pointer"
                  title="Share Memorial Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* TAB NAVIGATION */}
            <div className="flex border-b border-[#DFB260]/30 text-xs font-semibold gap-6">
              <button
                onClick={() => setDetailTab('story')}
                className={`pb-3 transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
                  detailTab === 'story'
                    ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
                    : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <BookOpen className="w-4 h-4 text-[#F5D77F]" />
                <span>Life Story &amp; Biography</span>
              </button>

              <button
                onClick={() => setDetailTab('milestones')}
                className={`pb-3 transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
                  detailTab === 'milestones'
                    ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
                    : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <Clock className="w-4 h-4 text-[#F5D77F]" />
                <span>Life Milestones ({selectedShrine.lifeMilestones?.length || 0})</span>
              </button>

              <button
                onClick={() => setDetailTab('tributes')}
                className={`pb-3 transition-all cursor-pointer flex items-center space-x-2 border-b-2 ${
                  detailTab === 'tributes'
                    ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
                    : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-[#F5D77F]" />
                <span>Tributes &amp; Memory Wall ({selectedShrine.tributes?.length || selectedShrine.tributesCount})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: LIFE STORY */}
            {detailTab === 'story' && (
              <div className="space-y-6 text-xs text-[#E8DDF5] leading-relaxed animate-fade-in">
                {/* Motto Box */}
                <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/40 text-center space-y-1">
                  <Quote className="w-5 h-5 text-[#F5D77F] mx-auto opacity-70" />
                  <p className="font-serif italic text-sm sm:text-base text-[#FFF2A8]">"{selectedShrine.motto}"</p>
                </div>

                {/* Biography Narrative */}
                <div className="space-y-2">
                  <h4 className="font-cinzel font-bold text-sm text-[#F5D77F] uppercase tracking-wider">
                    Life Story &amp; Memory Narrative
                  </h4>
                  <div className="bg-[#120B21] p-5 rounded-2xl border border-[#DFB260]/30 text-xs sm:text-sm font-sans space-y-3 whitespace-pre-line text-[#E8DDF5]/90">
                    {selectedShrine.biography || `${selectedShrine.name} lived a remarkable life dedicated to family, community, and enduring values.`}
                  </div>
                </div>

                {/* Key Character Values */}
                {selectedShrine.keyValues && selectedShrine.keyValues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-cinzel font-bold text-xs text-[#F5D77F] uppercase tracking-wider">
                      Guiding Principles &amp; Character Attributes
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedShrine.keyValues.map((val, idx) => (
                        <span key={idx} className="bg-[#1A0F30] border border-[#DFB260]/40 text-[#FFF2A8] px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center space-x-1.5">
                          <Award className="w-3.5 h-3.5 text-[#F5D77F]" />
                          <span>{val}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Favorite Quotes */}
                {selectedShrine.favoriteQuotes && selectedShrine.favoriteQuotes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-cinzel font-bold text-xs text-[#F5D77F] uppercase tracking-wider">
                      Words of Wisdom &amp; Favorite Quotes
                    </h4>
                    <div className="space-y-2">
                      {selectedShrine.favoriteQuotes.map((q, idx) => (
                        <div key={idx} className="bg-[#0A0514] p-3 rounded-xl border border-[#DFB260]/30 italic font-serif text-xs text-[#FFF2A8]">
                          "{q}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: LIFE MILESTONES */}
            {detailTab === 'milestones' && (
              <div className="space-y-5 animate-fade-in">
                <LifeTimeline 
                  shrine={selectedShrine} 
                  onUpdateMilestones={(updatedMs) => {
                    setSelectedShrine(prev => prev ? ({ ...prev, lifeMilestones: updatedMs }) : null);
                    if (onEditMemorial && selectedShrine) {
                      onEditMemorial({ ...selectedShrine, lifeMilestones: updatedMs });
                    }
                  }}
                />
              </div>
            )}

            {/* TAB CONTENT 3: TRIBUTES & MEMORY WALL */}
            {detailTab === 'tributes' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-cinzel font-bold text-sm text-[#F5D77F] uppercase tracking-wider">
                    Remembrance &amp; Family Tribute Wall
                  </h4>
                  <button
                    onClick={() => setShowTributeForm(!showTributeForm)}
                    className="gold-filled-btn text-xs px-4 py-2 cursor-pointer flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{showTributeForm ? 'Cancel Form' : 'Add Tribute'}</span>
                  </button>
                </div>

                {/* Share Tribute Form */}
                {showTributeForm && (
                  <form onSubmit={handleTributeSubmit} className="bg-[#0A0514] p-5 rounded-2xl border border-[#DFB260] space-y-4 text-xs">
                    <h5 className="font-cinzel font-bold text-xs text-[#FFF2A8]">Share a Family Memory or Prayer</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#FFF2A8] font-semibold mb-1">Your Name</label>
                        <input
                          type="text"
                          value={tribAuthor}
                          onChange={(e) => setTribAuthor(e.target.value)}
                          placeholder="e.g. Clara Pendelton"
                          className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-2.5 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[#FFF2A8] font-semibold mb-1">Relationship</label>
                        <input
                          type="text"
                          value={tribRelationship}
                          onChange={(e) => setTribRelationship(e.target.value)}
                          placeholder="e.g. Granddaughter, Niece, Friend"
                          className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-2.5 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">Tribute Type</label>
                      <select
                        value={tribType}
                        onChange={(e: any) => setTribType(e.target.value)}
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-2.5 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                      >
                        <option value="Family Memory">Family Memory &amp; Story</option>
                        <option value="Spoken Story (Audio AI)">Spoken Story (Audio AI Transcribed)</option>
                        <option value="Candle & Prayer">Candle &amp; Prayer</option>
                        <option value="Flower Tribute">Flower Offering</option>
                        <option value="Honor & Gratitude">Honor &amp; Gratitude</option>
                      </select>
                    </div>

                    {/* AUDIO-TO-TEXT SPOKEN STORY RECORDING WIDGET */}
                    <div className="bg-[#120B21] p-4 rounded-xl border border-[#DFB260]/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="p-1.5 rounded-lg bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40">
                            <Mic className="w-4 h-4 text-[#F5D77F]" />
                          </div>
                          <div>
                            <span className="font-cinzel font-bold text-[#FFF2A8] text-xs block">
                              Record Spoken Audio Memory &amp; AI Transcribe
                            </span>
                            <span className="text-[10px] text-[#C8B1E4]/70 font-mono block">
                              Speak your story directly into the shrine — transcribed automatically by Gemini AI
                            </span>
                          </div>
                        </div>

                        {!isRecordingAudio && !audioDataUrl && (
                          <button
                            type="button"
                            onClick={startAudioRecording}
                            className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow"
                          >
                            <Mic className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            <span>Record Voice</span>
                          </button>
                        )}
                      </div>

                      {/* Active Recording State */}
                      {isRecordingAudio && (
                        <div className="bg-[#0A0514] p-3 rounded-xl border border-rose-500/50 flex items-center justify-between gap-3 animate-pulse">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-ping"></div>
                            <span className="font-mono text-rose-300 font-bold text-xs uppercase">
                              Recording Spoken Memory... {Math.floor(audioRecordingTime / 60)}:{String(audioRecordingTime % 60).padStart(2, '0')}
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

                      {/* Audio Recorded Preview & AI Transcribe Action */}
                      {audioDataUrl && !isRecordingAudio && (
                        <div className="bg-[#0A0514] p-3 rounded-xl border border-[#DFB260]/40 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center space-x-2 text-[#F5D77F] font-semibold">
                              <Volume2 className="w-4 h-4 text-[#F5D77F]" />
                              <span>Spoken Audio Memory Captured ({audioRecordingTime}s)</span>
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
                                  <span>Transcribing Spoken Story...</span>
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

                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">Tribute Message / Transcribed Story</label>
                      <textarea
                        rows={3}
                        value={tribMessage}
                        onChange={(e) => setTribMessage(e.target.value)}
                        placeholder="Write your heartful memory or prayer, or use the voice recording button above..."
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-2.5 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                        required
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      className="w-full gold-filled-btn py-2.5 text-xs font-bold uppercase cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Post Tribute to Memory Wall</span>
                    </button>
                  </form>
                )}

                {/* List of Tributes */}
                <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar">
                  {selectedShrine.tributes && selectedShrine.tributes.length > 0 ? (
                    selectedShrine.tributes.map((trib) => (
                      <div key={trib.id} className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-[#DFB260]/20 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-[#FFF2A8] uppercase text-xs">{trib.author}</span>
                            <span className="text-[11px] text-[#F5D77F]">({trib.relationship})</span>
                            {trib.tributeType && (
                              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/30">
                                {trib.tributeType}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#C8B1E4]/70 font-mono">{trib.date}</span>
                        </div>

                        {trib.isAudioTribute && trib.audioUrl && (
                          <div className="flex items-center justify-between bg-[#0A0514] p-2 rounded-xl border border-[#DFB260]/30 text-[11px]">
                            <span className="font-mono text-[#F5D77F] flex items-center gap-1 font-semibold">
                              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Spoken Voice Story Recording</span>
                            </span>
                            <audio controls src={trib.audioUrl} className="h-7 max-w-[200px]" />
                          </div>
                        )}

                        <p className="text-[#E8DDF5] italic font-serif leading-relaxed">"{trib.message}"</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-8 bg-[#120B21] rounded-2xl border border-[#DFB260]/30 text-xs text-[#C8B1E4]">
                      No tributes posted yet. Be the first family member to share a tribute story above!
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CREATE NEW MEMORIAL SHRINE WIZARD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto text-[#E8DDF5]">
          <div className="cosmic-card-gold max-w-2xl w-full p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl relative border-2 border-[#DFB260] max-h-[92vh] overflow-y-auto no-scrollbar">
            
            <button
              onClick={() => {
                setIsCreateModalOpen(false);
                setEditingShrine(null);
                if (isCameraActive) stopCamera();
              }}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F]">
                {editingShrine ? <Edit3 className="w-3.5 h-3.5 text-[#F5D77F]" /> : <Plus className="w-3.5 h-3.5 text-[#F5D77F]" />}
                <span>{editingShrine ? 'Ancestral Shrine Editor' : 'Ancestral Shrine Creation Wizard'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
                {editingShrine ? `Edit Memorial Shrine: ${editingShrine.name}` : 'Create Perpetual Memorial Shrine'}
              </h2>
              <p className="text-xs text-[#C8B1E4]/80 font-medium">
                {editingShrine 
                  ? 'Update portrait avatar, cover banner, life biography, milestones, epitaph quote, and memorial details.' 
                  : 'Honor a departed loved one by establishing a gold-trimmed digital shrine with biography, milestones, quotes, and a permanent tribute memory wall.'}
              </p>
            </div>

            <form onSubmit={handleCreateMemorialSubmit} className="space-y-4 text-xs font-sans pt-2">
              
              {/* Full Name & Relationship */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Full Name of Deceased</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g., Margaret Vance Pendelton"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Relationship / Role</label>
                  <input
                    type="text"
                    value={newRelationship}
                    onChange={(e) => setNewRelationship(e.target.value)}
                    placeholder="e.g. Grandmother & Educator"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    required
                  />
                </div>
              </div>

              {/* Dates & Resting Place */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Born Date / Year</label>
                  <input
                    type="text"
                    value={newBornDate}
                    onChange={(e) => setNewBornDate(e.target.value)}
                    placeholder="e.g. May 14, 1932"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Passed Date / Year</label>
                  <input
                    type="text"
                    value={newPassedDate}
                    onChange={(e) => setNewPassedDate(e.target.value)}
                    placeholder="e.g. October 22, 2018"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Resting Place / Location</label>
                  <input
                    type="text"
                    value={newRestingPlace}
                    onChange={(e) => setNewRestingPlace(e.target.value)}
                    placeholder="e.g. Oakridge Gardens, Boston"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>
              </div>

              {/* Motto / Epitaph */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Motto / Epitaph Quote</label>
                <input
                  type="text"
                  value={newMotto}
                  onChange={(e) => setNewMotto(e.target.value)}
                  placeholder="e.g. Strength in gentleness, wisdom in silence."
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  required
                />
              </div>

              {/* PORTRAIT & COVER MEDIA STUDIO */}
              <div className="bg-[#0A0514] p-4 sm:p-5 rounded-2xl border border-[#DFB260]/50 space-y-4">
                
                {/* Header & Live Preview Control */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#DFB260]/20 pb-3">
                  <div>
                    <div className="flex items-center space-x-2 text-xs font-cinzel font-bold text-[#FFF2A8] uppercase tracking-wider">
                      <Sparkles className="w-4 h-4 text-[#F5D77F]" />
                      <span>Memorial Portrait &amp; Cover Studio</span>
                    </div>
                    <p className="text-[11px] text-[#C8B1E4]/80">
                      Build portrait &amp; banner cover by uploading a photo file, taking a live camera snapshot, or picking from Vault albums.
                    </p>
                  </div>

                  {/* Target Switcher: Portrait vs Cover */}
                  <div className="flex items-center space-x-1.5 bg-[#120B21] p-1 rounded-xl border border-[#DFB260]/30 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMediaTarget('portrait');
                        if (isCameraActive) stopCamera();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                        activeMediaTarget === 'portrait'
                          ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                          : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Portrait Avatar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveMediaTarget('cover');
                        if (isCameraActive) stopCamera();
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1 ${
                        activeMediaTarget === 'cover'
                          ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                          : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                      }`}
                    >
                      <Images className="w-3.5 h-3.5" />
                      <span>Cover Banner</span>
                    </button>
                  </div>
                </div>

                {/* LIVE SHRINE CARD PREVIEW */}
                <div className="relative rounded-2xl overflow-hidden border border-[#DFB260]/60 bg-[#120B21] p-3">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5D77F] mb-2 flex items-center justify-between">
                    <span>Live Shrine Preview</span>
                    <span className="text-[#C8B1E4]/70">Editing: {activeMediaTarget === 'portrait' ? 'Portrait Photo' : 'Cover Banner'}</span>
                  </div>

                  {/* Banner Preview */}
                  <div className="relative h-28 w-full rounded-xl overflow-hidden bg-[#0A0514] border border-[#DFB260]/30">
                    {newCoverUrl ? (
                      <img src={newCoverUrl} alt="Shrine cover preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-purple-900 to-indigo-900"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0514] via-transparent to-transparent"></div>
                  </div>

                  {/* Avatar & Title Preview Overlay */}
                  <div className="flex items-center space-x-4 -mt-8 px-3 relative z-10">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#DFB260] bg-[#0A0514] shadow-2xl shrink-0">
                      <img src={newImageUrl || SAMPLE_PORTRAITS[0]} alt="Portrait preview" className="w-full h-full object-cover" />
                    </div>

                    <div className="space-y-0.5 pt-6">
                      <h4 className="font-cinzel font-bold text-base text-[#FFF2A8]">
                        {newName || 'Ancestor Full Name'}
                      </h4>
                      <p className="text-[11px] font-mono text-[#F5D77F]">{newBornDate || '1940'} – {newPassedDate || '2022'}</p>
                      <p className="text-[11px] text-[#C8B1E4]">{newRelationship || 'Beloved Ancestor'}</p>
                    </div>
                  </div>
                </div>

                {/* SOURCE TABS: Upload, Camera, Vault, Presets, URL */}
                <div className="flex items-center space-x-1 overflow-x-auto border-b border-[#DFB260]/20 pb-2 text-xs font-semibold no-scrollbar">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaSource('upload');
                      if (isCameraActive) stopCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      activeMediaSource === 'upload'
                        ? 'bg-[#1a0f30] text-[#FFF2A8] border border-[#DFB260]'
                        : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Upload Local File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaSource('camera');
                      startCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      activeMediaSource === 'camera'
                        ? 'bg-[#1a0f30] text-[#FFF2A8] border border-[#DFB260]'
                        : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Take Camera Snapshot</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaSource('vault');
                      if (isCameraActive) stopCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      activeMediaSource === 'vault'
                        ? 'bg-[#1a0f30] text-[#FFF2A8] border border-[#DFB260]'
                        : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                    }`}
                  >
                    <Images className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Pick from Vault ({memories?.length || 0})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaSource('presets');
                      if (isCameraActive) stopCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      activeMediaSource === 'presets'
                        ? 'bg-[#1a0f30] text-[#FFF2A8] border border-[#DFB260]'
                        : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Presets</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveMediaSource('url');
                      if (isCameraActive) stopCamera();
                    }}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                      activeMediaSource === 'url'
                        ? 'bg-[#1a0f30] text-[#FFF2A8] border border-[#DFB260]'
                        : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>Pasted URL</span>
                  </button>
                </div>

                {/* TAB 1: LOCAL FILE UPLOAD (DRAG & DROP / FILE INPUT) */}
                {activeMediaSource === 'upload' && (
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleMediaFileDrop}
                    onClick={() => mediaFileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#DFB260]/50 hover:border-[#F5D77F] bg-[#120B21]/80 hover:bg-[#120B21] p-6 rounded-2xl text-center space-y-2 cursor-pointer transition-all"
                  >
                    <input
                      type="file"
                      ref={mediaFileInputRef}
                      accept="image/*"
                      onChange={handleMediaFileUpload}
                      className="hidden"
                    />
                    <Upload className="w-8 h-8 text-[#F5D77F] mx-auto animate-bounce" />
                    <div className="font-semibold text-xs text-[#FFF2A8]">
                      Click or drag &amp; drop photo file here
                    </div>
                    <p className="text-[10px] text-[#C8B1E4]/70">
                      Supports PNG, JPG, WEBP, GIF. Uploads directly into {activeMediaTarget === 'portrait' ? 'Portrait Avatar' : 'Cover Banner'}.
                    </p>
                  </div>
                )}

                {/* TAB 2: LIVE CAMERA SNAPSHOT */}
                {activeMediaSource === 'camera' && (
                  <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/40 space-y-3 text-center">
                    {isCameraActive ? (
                      <div className="space-y-3">
                        <div className="relative max-w-sm mx-auto h-48 rounded-2xl overflow-hidden border-2 border-[#DFB260] bg-black">
                          <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                        </div>
                        <div className="flex items-center justify-center space-x-3">
                          <button
                            type="button"
                            onClick={captureCameraSnapshot}
                            className="gold-filled-btn text-xs px-5 py-2 font-bold cursor-pointer flex items-center space-x-1.5"
                          >
                            <Camera className="w-3.5 h-3.5 text-[#120B21]" />
                            <span>Capture {activeMediaTarget === 'portrait' ? 'Portrait' : 'Cover'} Snapshot</span>
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs px-4 py-2 rounded-xl cursor-pointer"
                          >
                            Close Camera
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 py-4">
                        <Camera className="w-8 h-8 text-[#F5D77F] mx-auto" />
                        <p className="text-xs text-[#FFF2A8]">Take a direct webcam photo for the memorial portrait.</p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="gold-filled-btn text-xs px-5 py-2 cursor-pointer font-semibold"
                        >
                          Start Camera Device
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PICK FROM VAULT MEMORY ALBUMS */}
                {activeMediaSource === 'vault' && (
                  <div className="space-y-2">
                    <div className="text-[11px] text-[#C8B1E4] flex items-center justify-between font-semibold">
                      <span>Click any memory photo from your Vault collection:</span>
                      <span>{memories?.length || 0} total memories</span>
                    </div>

                    {memories && memories.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto p-1 no-scrollbar">
                        {memories.filter(m => m.imageUrl).map((m) => {
                          const isSelected = activeMediaTarget === 'portrait' ? newImageUrl === m.imageUrl : newCoverUrl === m.imageUrl;
                          return (
                            <div
                              key={m.id}
                              onClick={() => {
                                if (activeMediaTarget === 'portrait') setNewImageUrl(m.imageUrl);
                                else setNewCoverUrl(m.imageUrl);
                              }}
                              className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer hover:scale-105 transition-all relative ${
                                isSelected ? 'border-[#F5D77F] ring-2 ring-[#F5D77F]' : 'border-[#DFB260]/30 opacity-80 hover:opacity-100'
                              }`}
                              title={m.title}
                            >
                              <img src={m.imageUrl} alt={m.title} className="w-full h-full object-cover" />
                              {isSelected && (
                                <div className="absolute top-1 right-1 bg-[#F5D77F] text-[#120B21] p-0.5 rounded-full">
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-[#120B21] rounded-xl text-xs text-[#C8B1E4]">
                        No memories found in Vault. Upload a local file above or choose from presets.
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: HERITAGE PRESETS */}
                {activeMediaSource === 'presets' && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] text-[#F5D77F] font-semibold block mb-1">Select Preset Portrait Photos:</span>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
                        {SAMPLE_PORTRAITS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Preset portrait ${idx}`}
                            onClick={() => setNewImageUrl(url)}
                            className={`w-12 h-12 object-cover rounded-xl border-2 cursor-pointer hover:scale-110 transition-transform shrink-0 ${
                              newImageUrl === url ? 'border-[#F5D77F] ring-2 ring-[#F5D77F]/60' : 'border-[#DFB260]/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-[#F5D77F] font-semibold block mb-1">Select Preset Cover Banners:</span>
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
                        {SAMPLE_COVERS.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Preset cover ${idx}`}
                            onClick={() => setNewCoverUrl(url)}
                            className={`w-20 h-10 object-cover rounded-xl border-2 cursor-pointer hover:scale-110 transition-transform shrink-0 ${
                              newCoverUrl === url ? 'border-[#F5D77F] ring-2 ring-[#F5D77F]/60' : 'border-[#DFB260]/30'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 5: PASTED IMAGE URL */}
                {activeMediaSource === 'url' && (
                  <div className="space-y-2">
                    <label className="block text-[#FFF2A8] font-semibold text-xs">
                      {activeMediaTarget === 'portrait' ? 'Portrait Image Web URL' : 'Cover Banner Image Web URL'}
                    </label>
                    <input
                      type="url"
                      value={activeMediaTarget === 'portrait' ? newImageUrl : newCoverUrl}
                      onChange={(e) => {
                        if (activeMediaTarget === 'portrait') setNewImageUrl(e.target.value);
                        else setNewCoverUrl(e.target.value);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] text-xs"
                    />
                  </div>
                )}

              </div>

              {/* Biography Narrative */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Life Story &amp; Biography Narrative</label>
                <textarea
                  rows={3}
                  value={newBiography}
                  onChange={(e) => setNewBiography(e.target.value)}
                  placeholder="Write a detailed biography celebrating their life, upbringing, achievements, and enduring memories..."
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                ></textarea>
              </div>

              {/* Guiding Values & Favorite Quotes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Character Attributes (comma-separated)</label>
                  <input
                    type="text"
                    value={newKeyValues}
                    onChange={(e) => setNewKeyValues(e.target.value)}
                    placeholder="Patience, Classical Music, Generosity"
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Favorite Quotes (one per line)</label>
                  <input
                    type="text"
                    value={newQuotes}
                    onChange={(e) => setNewQuotes(e.target.value)}
                    placeholder="The love we give remains forever."
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>
              </div>

              {/* Milestones Builder */}
              <div className="bg-[#0A0514] p-3.5 rounded-2xl border border-[#DFB260]/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#F5D77F]">
                  <span>Life Milestones Chronology</span>
                  <span className="text-[10px] text-[#C8B1E4]/70 font-mono">{milestoneList.length} milestones</span>
                </div>

                {milestoneList.map((ms, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-[#120B21] p-2.5 rounded-xl border border-[#DFB260]/20 text-xs">
                    <div>
                      <span className="font-mono font-bold text-[#F5D77F] mr-2">{ms.year}:</span>
                      <span className="font-bold text-[#FFF2A8]">{ms.title}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMilestone(idx)}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={msYear}
                    onChange={(e) => setMsYear(e.target.value)}
                    placeholder="Year (e.g. 1960)"
                    className="w-1/4 bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-2 text-[#FFF2A8] text-xs focus:outline-none focus:border-[#F5D77F]"
                  />
                  <input
                    type="text"
                    value={msTitle}
                    onChange={(e) => setMsTitle(e.target.value)}
                    placeholder="Milestone Event Title"
                    className="w-2/4 bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-2 text-[#FFF2A8] text-xs focus:outline-none focus:border-[#F5D77F]"
                  />
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="w-1/4 bg-[#24133d] hover:bg-[#341b57] text-[#FFF2A8] border border-[#DFB260]/40 p-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingShrine(null);
                    if (isCameraActive) stopCamera();
                  }}
                  className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-filled-btn px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#120B21]" />
                  <span>{editingShrine ? 'Save Shrine Changes' : 'Publish Perpetual Shrine'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* LIGHTBOX / IMAGE VIEWER MODAL */}
      {selectedViewerImage && (
        <ImageViewerModal
          selectedImage={selectedViewerImage}
          onClose={() => setSelectedViewerImage(null)}
          onPrev={() => {
            const currentIndex = shrineMemoryItems.findIndex(m => m.id === selectedViewerImage.id);
            if (currentIndex > 0) {
              setSelectedViewerImage(shrineMemoryItems[currentIndex - 1]);
            } else {
              setSelectedViewerImage(shrineMemoryItems[shrineMemoryItems.length - 1]);
            }
          }}
          onNext={() => {
            const currentIndex = shrineMemoryItems.findIndex(m => m.id === selectedViewerImage.id);
            if (currentIndex < shrineMemoryItems.length - 1) {
              setSelectedViewerImage(shrineMemoryItems[currentIndex + 1]);
            } else {
              setSelectedViewerImage(shrineMemoryItems[0]);
            }
          }}
          hasPrev={shrineMemoryItems.length > 1}
          hasNext={shrineMemoryItems.length > 1}
          onSelectView={onSelectView}
        />
      )}

    </div>
  );
};
