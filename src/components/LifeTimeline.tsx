import React, { useState } from 'react';
import { LifeMilestone, MemorialShrine, MemoryItem } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import { 
  Calendar, 
  MapPin, 
  Tag, 
  Image as ImageIcon, 
  Video, 
  Mic, 
  Plus, 
  Filter, 
  ArrowUpDown, 
  Sparkles, 
  Heart, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Briefcase, 
  Compass, 
  Flame, 
  X, 
  Upload, 
  Volume2, 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Check, 
  Loader2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface LifeTimelineProps {
  shrine: MemorialShrine;
  onUpdateMilestones?: (updatedMilestones: LifeMilestone[]) => void;
}

export const LifeTimeline: React.FC<LifeTimelineProps> = ({
  shrine,
  onUpdateMilestones
}) => {
  const [milestones, setMilestones] = useState<LifeMilestone[]>(shrine.lifeMilestones || []);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedMediaType, setSelectedMediaType] = useState<'all' | 'photo' | 'video' | 'audio'>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Image for Lightbox Modal
  const [lightboxMemory, setLightboxMemory] = useState<MemoryItem | null>(null);

  // Add Milestone Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expandedMilestoneId, setExpandedMilestoneId] = useState<string | null>(null);

  // New Milestone Form State
  const [newYear, setNewYear] = useState('');
  const [newDateExact, setNewDateExact] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<LifeMilestone['category']>('Marriage & Family');
  const [newDescription, setNewDescription] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newTags, setNewTags] = useState('');

  // Audio Recording State for new milestone
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecordingTime, setAudioRecordingTime] = useState(0);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [isPlayingRecordedAudio, setIsPlayingRecordedAudio] = useState(false);

  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const timerIntervalRef = React.useRef<any>(null);
  const audioElementRef = React.useRef<HTMLAudioElement | null>(null);

  // Preset milestone photo options
  const PRESET_MILESTONE_PHOTOS = [
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=800',
    'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800'
  ];

  // Helper to open photo lightbox
  const handleOpenLightbox = (ms: LifeMilestone) => {
    if (!ms.imageUrl && !ms.videoUrl) return;
    const item: MemoryItem = {
      id: ms.id || `ms-${ms.year}`,
      title: ms.title,
      category: 'Memorial',
      date: ms.dateExact || ms.year,
      location: ms.location,
      imageUrl: ms.imageUrl,
      videoUrl: ms.videoUrl,
      mediaType: ms.videoUrl ? 'video' : 'photo',
      description: ms.description,
      encryptionLevel: 'Vault Level 3',
      archiveStatus: 'r2_only',
      tags: ms.tags || [ms.category || 'Milestone']
    };
    setLightboxMemory(item);
  };

  // Audio Recording Functions
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
      console.error('Error accessing mic:', err);
      alert('Microphone access denied or unavailable.');
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
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

  // Handle submit new milestone
  const handleAddMilestoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYear || !newTitle) {
      alert('Please fill in at least the Year and Title for the milestone.');
      return;
    }

    const created: LifeMilestone = {
      id: `ms-${Date.now()}`,
      year: newYear.trim(),
      dateExact: newDateExact.trim() || undefined,
      title: newTitle.trim(),
      category: newCategory,
      description: newDescription.trim() || 'A cherished milestone in the life journey.',
      location: newLocation.trim() || undefined,
      imageUrl: newImageUrl.trim() || undefined,
      videoUrl: newVideoUrl.trim() || undefined,
      audioUrl: audioDataUrl || undefined,
      mediaType: newVideoUrl ? 'video' : newImageUrl ? 'photo' : audioDataUrl ? 'audio' : 'story',
      tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [newCategory || 'Milestone']
    };

    const updated = [...milestones, created];
    setMilestones(updated);
    if (onUpdateMilestones) {
      onUpdateMilestones(updated);
    }

    // Reset Form
    setNewYear('');
    setNewDateExact('');
    setNewTitle('');
    setNewDescription('');
    setNewLocation('');
    setNewImageUrl('');
    setNewVideoUrl('');
    setNewTags('');
    setAudioDataUrl(null);
    setIsAddModalOpen(false);
  };

  // Filter & Sort Milestones
  const filteredMilestones = milestones.filter(ms => {
    // Category match
    if (selectedCategory !== 'All' && ms.category !== selectedCategory) {
      return false;
    }

    // Media type match
    if (selectedMediaType === 'photo' && !ms.imageUrl) return false;
    if (selectedMediaType === 'video' && !ms.videoUrl) return false;
    if (selectedMediaType === 'audio' && !ms.audioUrl) return false;

    // Search query match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = ms.title.toLowerCase().includes(q);
      const matchDesc = ms.description.toLowerCase().includes(q);
      const matchYear = ms.year.toLowerCase().includes(q);
      const matchLocation = ms.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchYear && !matchLocation) return false;
    }

    return true;
  }).sort((a, b) => {
    const yearA = parseInt(a.year.replace(/\D/g, ''), 10) || 0;
    const yearB = parseInt(b.year.replace(/\D/g, ''), 10) || 0;
    return sortOrder === 'asc' ? yearA - yearB : yearB - yearA;
  });

  // Get icon by category
  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'Birth':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'Education':
        return <GraduationCap className="w-4 h-4 text-blue-400" />;
      case 'Career':
        return <Briefcase className="w-4 h-4 text-emerald-400" />;
      case 'Marriage & Family':
        return <Heart className="w-4 h-4 text-amber-300" />;
      case 'Achievement':
        return <Award className="w-4 h-4 text-purple-400" />;
      case 'Travel & Adventure':
        return <Compass className="w-4 h-4 text-cyan-400" />;
      case 'Legacy & Memorial':
        return <Flame className="w-4 h-4 text-[#F5D77F]" />;
      default:
        return <BookOpen className="w-4 h-4 text-[#F5D77F]" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* TIMELINE CONTROL & FILTER BAR */}
      <div className="bg-[#120B21] p-5 rounded-2xl border border-[#DFB260]/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#F5D77F]" />
              <span>Life Chronology &amp; Media Timeline</span>
            </h3>
            <p className="text-xs text-[#C8B1E4] font-mono">
              Chronological narrative of {shrine.name} • {filteredMilestones.length} milestones
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-[#0A0514] hover:bg-[#1a0f30] text-[#F5D77F] border border-[#DFB260]/30 rounded-xl text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
              title="Toggle Sort Order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>{sortOrder === 'asc' ? 'Oldest First' : 'Newest First'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="gold-filled-btn text-xs px-4 py-2 font-bold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4 text-[#120B21]" />
              <span>+ Add Milestone</span>
            </button>
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#DFB260]/20 text-xs font-semibold">
          <span className="text-[#C8B1E4] text-[11px] font-mono uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-[#F5D77F]" />
            <span>Category:</span>
          </span>

          {['All', 'Birth', 'Education', 'Career', 'Marriage & Family', 'Achievement', 'Legacy & Memorial'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer text-xs ${
                selectedCategory === cat
                  ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                  : 'bg-[#0A0514] text-[#C8B1E4] hover:text-[#FFF2A8] border border-[#DFB260]/20'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* CHRONOLOGICAL TIMELINE TRACK */}
      {filteredMilestones.length > 0 ? (
        <div className="relative pl-6 sm:pl-10 space-y-8 before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-[#DFB260] before:via-[#F5D77F]/60 before:to-[#7353A0]/30">
          
          {filteredMilestones.map((ms, index) => {
            const isExpanded = expandedMilestoneId === (ms.id || `ms-${index}`);
            return (
              <div
                key={ms.id || `ms-${index}`}
                className="relative bg-[#120B21] rounded-3xl border border-[#DFB260]/40 p-5 sm:p-6 shadow-2xl space-y-4 transition-all duration-300 hover:border-[#F5D77F] group"
              >
                {/* Glowing Node Dot on Timeline */}
                <div className="absolute -left-6 sm:-left-10 top-6 w-5 h-5 rounded-full bg-[#DFB260] border-4 border-[#0A0514] shadow-[0_0_12px_rgba(223,178,96,0.8)] z-10 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#120B21]"></div>
                </div>

                {/* Milestone Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DFB260]/20 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="font-cinzel font-bold text-xl sm:text-2xl text-[#FFF2A8] tracking-tight bg-[#0A0514] px-3.5 py-1 rounded-2xl border border-[#DFB260]/40 shadow-inner">
                      {ms.year}
                    </span>

                    {ms.category && (
                      <span className="px-3 py-1 rounded-full bg-[#1A0C33] border border-[#DFB260]/30 text-[11px] font-semibold text-[#F5D77F] flex items-center space-x-1.5">
                        {getCategoryIcon(ms.category)}
                        <span>{ms.category}</span>
                      </span>
                    )}
                  </div>

                  {ms.dateExact && (
                    <span className="text-xs font-mono text-[#C8B1E4]/90 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span>{ms.dateExact}</span>
                    </span>
                  )}
                </div>

                {/* Title & Location */}
                <div>
                  <h4 className="font-cinzel font-bold text-lg sm:text-xl text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                    {ms.title}
                  </h4>

                  {ms.location && (
                    <p className="text-xs text-[#F5D77F]/90 font-mono mt-1 flex items-center space-x-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span>{ms.location}</span>
                    </p>
                  )}
                </div>

                {/* Media Showcase Section (Photos / Videos / Audio) */}
                {ms.imageUrl && (
                  <div 
                    onClick={() => handleOpenLightbox(ms)}
                    className="relative w-full max-h-80 rounded-2xl overflow-hidden border border-[#DFB260]/40 cursor-pointer group/img shadow-xl bg-[#0A0514]"
                  >
                    <img
                      src={ms.imageUrl}
                      alt={ms.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover max-h-80 group-hover/img:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0A0514] via-transparent to-transparent opacity-80"></div>
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-[#FFF2A8] font-mono">
                      <span className="bg-[#0A0514]/80 px-2.5 py-1 rounded-lg border border-[#DFB260]/30 flex items-center space-x-1">
                        <ImageIcon className="w-3.5 h-3.5 text-[#F5D77F]" />
                        <span>Expand High-Res Photo</span>
                      </span>
                      <span className="text-[10px] text-emerald-300 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-500/30">
                        Arweave Sealed
                      </span>
                    </div>
                  </div>
                )}

                {/* Attached Spoken Voice Audio Player */}
                {ms.audioUrl && (
                  <div className="bg-[#0A0514] p-3 rounded-2xl border border-amber-500/40 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2 text-amber-300 font-semibold font-mono">
                      <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Spoken Voice Memory Attachment</span>
                    </div>
                    <audio controls src={ms.audioUrl} className="h-7 max-w-[200px]" />
                  </div>
                )}

                {/* Description & Narrative */}
                <p className="text-xs sm:text-sm text-[#E8DDF5]/90 leading-relaxed font-sans bg-[#0A0514]/60 p-4 rounded-2xl border border-[#DFB260]/20">
                  {ms.description}
                </p>

                {/* Tags Footer */}
                {ms.tags && ms.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {ms.tags.map((tag, tIdx) => (
                      <span key={tIdx} className="text-[10px] font-mono bg-[#1A0F30] text-[#C8B1E4] px-2.5 py-1 rounded-lg border border-[#DFB260]/20">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center p-10 bg-[#120B21] rounded-3xl border border-[#DFB260]/30 space-y-3">
          <Calendar className="w-8 h-8 text-[#F5D77F] mx-auto opacity-70" />
          <h4 className="font-cinzel font-bold text-base text-[#FFF2A8]">No milestones match the selected filter</h4>
          <p className="text-xs text-[#C8B1E4]">Try selecting 'All' or click '+ Add Milestone' to record a new life event.</p>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR ENLARGING PHOTOS */}
      {lightboxMemory && (
        <ImageViewerModal
          item={lightboxMemory}
          onClose={() => setLightboxMemory(null)}
        />
      )}

      {/* ADD MILESTONE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A0514]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-[#120B21] border-2 border-[#DFB260] rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl relative">
            
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-[#DFB260]/20 rounded-2xl border border-[#DFB260]/40 text-[#F5D77F]">
                  <Calendar className="w-5 h-5 text-[#F5D77F]" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">Add Life Milestone</h3>
                  <p className="text-xs text-[#C8B1E4] font-mono">Record key event for {shrine.name}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddMilestoneSubmit} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Year *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1956 or 1965–2000"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Exact Date (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. June 12, 1956"
                    value={newDateExact}
                    onChange={(e) => setNewDateExact(e.target.value)}
                    className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Milestone Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Graduated Boston Conservatory with Honors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  >
                    <option value="Birth">Birth</option>
                    <option value="Education">Education</option>
                    <option value="Career">Career</option>
                    <option value="Marriage & Family">Marriage &amp; Family</option>
                    <option value="Achievement">Achievement</option>
                    <option value="Travel & Adventure">Travel &amp; Adventure</option>
                    <option value="Legacy & Memorial">Legacy &amp; Memorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="e.g. Boston, MA"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>
              </div>

              {/* Photo Selectors */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Milestone Image URL</label>
                <input
                  type="url"
                  placeholder="Paste photo URL or pick preset below..."
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-xl px-3 py-2 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] mb-2"
                />

                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {PRESET_MILESTONE_PHOTOS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="Preset"
                      onClick={() => setNewImageUrl(url)}
                      className={`w-12 h-12 object-cover rounded-xl cursor-pointer border-2 transition-transform ${
                        newImageUrl === url ? 'border-[#F5D77F] scale-105' : 'border-[#DFB260]/30 hover:border-[#DFB260]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Spoken Voice Recording Widget */}
              <div className="bg-[#0A0514] p-3 rounded-2xl border border-[#DFB260]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-[#F5D77F]" />
                    <span className="font-semibold text-[#FFF2A8]">Attach Spoken Audio Story</span>
                  </div>

                  {!isRecordingAudio && !audioDataUrl && (
                    <button
                      type="button"
                      onClick={startAudioRecording}
                      className="px-3 py-1 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-bold uppercase flex items-center space-x-1 cursor-pointer"
                    >
                      <Mic className="w-3 h-3 text-amber-300 animate-pulse" />
                      <span>Record Voice</span>
                    </button>
                  )}
                </div>

                {isRecordingAudio && (
                  <div className="flex items-center justify-between text-rose-300 font-mono text-xs animate-pulse">
                    <span>Recording Voice... {audioRecordingTime}s</span>
                    <button
                      type="button"
                      onClick={stopAudioRecording}
                      className="px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold cursor-pointer"
                    >
                      Stop
                    </button>
                  </div>
                )}

                {audioDataUrl && !isRecordingAudio && (
                  <div className="flex items-center justify-between text-xs text-[#F5D77F]">
                    <span>Voice Attached ({audioRecordingTime}s)</span>
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="px-2 py-1 bg-[#DFB260]/20 rounded text-[11px] font-bold cursor-pointer"
                    >
                      {isPlayingRecordedAudio ? 'Pause' : 'Play Audio'}
                    </button>
                  </div>
                )}
              </div>

              {/* Story Description */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Story &amp; Narrative</label>
                <textarea
                  rows={3}
                  placeholder="Describe the milestone, historical details, memories, and personal significance..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-[#0A0514] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                ></textarea>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#DFB260]/30">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#0A0514] text-[#C8B1E4] hover:bg-white/5 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-filled-btn px-5 py-2 font-bold uppercase tracking-wider cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
