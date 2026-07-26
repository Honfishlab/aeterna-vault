import React, { useState, useRef } from 'react';
import { ViewMode, LegacyLetter } from '../types';
import { 
  BookOpen, 
  PenTool, 
  Video, 
  Key, 
  Sparkles, 
  Bot, 
  Clock, 
  Users, 
  ShieldCheck, 
  Plus, 
  Send, 
  CheckCircle2, 
  Lock,
  ArrowRight,
  Trash2,
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

interface LegacyViewProps {
  onSelectView: (view: ViewMode) => void;
  letters: LegacyLetter[];
  onAddLetter: (letter: LegacyLetter) => void;
  onDeleteLetter?: (id: string) => void;
  onOpenConcierge: () => void;
  onOpenVideoRecorder?: () => void;
}

export const LegacyView: React.FC<LegacyViewProps> = ({
  onSelectView,
  letters,
  onAddLetter,
  onDeleteLetter,
  onOpenConcierge,
  onOpenVideoRecorder,
}) => {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [recipient, setRecipient] = useState('Great-Grandchildren');
  const [title, setTitle] = useState('A Message for the Future');
  const [releaseDate, setReleaseDate] = useState('2074-12-24');
  const [content, setContent] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  // Audio-to-Text Recording state for Time Capsule
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
      alert('Microphone access denied or unavailable. Please verify browser microphone permissions.');
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
          shrineName: `Time Capsule for ${recipient}`,
          authorName: 'Family Patriarch / Matriarch'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcription) {
          setContent(prev => prev ? `${prev}\n\n[Spoken Story Transcription]: ${data.transcription}` : data.transcription);
        }
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
    } finally {
      setIsTranscribingAudio(false);
    }
  };

  const handleAiStoryAssist = async () => {
    setIsGeneratingStory(true);
    try {
      const res = await fetch('/api/ai/story-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: title || 'Family values and life wisdom',
          recipient,
          tone: 'Warm, sovereign, inspiring'
        })
      });
      const data = await res.json();
      if (data.story) {
        setContent(data.story);
      }
    } catch (e) {
      setContent(`Dearest ${recipient},\n\nAs I reflect upon life, I leave you these truths: value kindness, honor craftsmanship, and cherish every sunrise. The world moves fast, but character endures.`);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleSaveLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newLetter: LegacyLetter = {
      id: `let-${Date.now()}`,
      title,
      recipient,
      releaseDate: new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Permanent',
      content,
      attachmentsCount: 1,
      heirsCount: 2,
      arweaveId: `ar_L3tt3r_${Math.random().toString(36).substring(2, 8)}`,
      audioUrl: audioDataUrl || undefined,
      isAudioRecording: !!audioDataUrl
    };

    onAddLetter(newLetter);
    setShowComposeModal(false);
    setContent('');
    setTitle('A Message for the Future');
    resetAudioRecording();
  };

  return (
    <div id="legacy-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cosmic-card-gold p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-widest text-[#F5D77F] mb-2">
            <BookOpen className="w-4 h-4 text-[#F5D77F]" />
            <span>Time Capsule Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-cinzel font-bold text-[#FFF2A8] tracking-tight">
            Your Eternal Narrative
          </h1>
          <p className="text-sm text-[#C8B1E4] mt-2 max-w-xl font-medium leading-relaxed">
            A place to curate memories, wisdom, and gifts for the generations that follow. Sealed on Arweave permaweb.
          </p>
        </div>

        <button
          id="btn-compose-letter"
          onClick={() => setShowComposeModal(true)}
          className="gold-filled-btn text-xs px-6 py-3.5 flex items-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(245,215,127,0.3)] relative z-10"
        >
          <PenTool className="w-4 h-4 text-[#120B21]" />
          <span>+ Compose Legacy Letter</span>
        </button>

        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#DFB260]/10 via-[#7353A0]/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* Main Grid: Primary Action Cards & Timeline list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Action Cards & Active Capsules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Cards Grid: Written, Video/Photo, Audio Spoken Story */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Action 1: Write a Letter */}
            <div 
              onClick={() => {
                resetAudioRecording();
                setShowComposeModal(true);
              }}
              className="cosmic-card p-5 sm:p-6 rounded-3xl hover:border-[#F5D77F] transition-all duration-300 space-y-3 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/30 rounded-2xl flex items-center justify-center">
                <PenTool className="w-5 h-5 text-[#F5D77F]" />
              </div>
              <h3 className="font-cinzel font-bold text-[#FFF2A8] text-lg group-hover:text-[#F5D77F] transition-colors">
                Written Letter
              </h3>
              <p className="text-xs text-[#C8B1E4]/90 leading-relaxed font-medium">
                Seal your wisdom, personal reflections, and values in written time capsules.
              </p>
              <div className="flex items-center space-x-1 text-xs font-semibold text-[#F5D77F] uppercase tracking-wider pt-1">
                <span>Compose Text</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Action 2: Record or Upload Video/Photo */}
            <div 
              id="btn-timecapsule-record-video"
              onClick={() => {
                if (onOpenVideoRecorder) {
                  onOpenVideoRecorder();
                } else {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'video/*,image/*';
                  input.onchange = (e: any) => {
                    if (e.target.files && e.target.files[0]) {
                      alert(`Video/Photo media file "${e.target.files[0].name}" selected for Arweave permaweb encryption.`);
                    }
                  };
                  input.click();
                }
              }}
              className="cosmic-card p-5 sm:p-6 rounded-3xl hover:border-[#F5D77F] transition-all duration-300 space-y-3 group cursor-pointer"
            >
              <div className="w-10 h-10 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-2xl flex items-center justify-center">
                <Video className="w-5 h-5 text-emerald-400" />
              </div>
              <h3 className="font-cinzel font-bold text-[#FFF2A8] text-lg group-hover:text-[#F5D77F] transition-colors">
                Video &amp; Photo Studio
              </h3>
              <p className="text-xs text-[#C8B1E4]/90 leading-relaxed font-medium">
                Record live video memories or attach photo snapshots with facial warmth for heirs.
              </p>
              <div className="flex items-center space-x-1 text-xs font-semibold text-[#F5D77F] uppercase tracking-wider pt-1">
                <span>Launch Video/Photo</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Action 3: Audio Spoken Story (Voice AI) */}
            <div 
              onClick={() => {
                setShowComposeModal(true);
                setTimeout(() => {
                  startAudioRecording();
                }, 200);
              }}
              className="cosmic-card p-5 sm:p-6 rounded-3xl hover:border-[#F5D77F] transition-all duration-300 space-y-3 group cursor-pointer bg-gradient-to-b from-[#120B21] to-[#1F0C3B]"
            >
              <div className="w-10 h-10 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-2xl flex items-center justify-center">
                <Mic className="w-5 h-5 text-amber-300 animate-pulse" />
              </div>
              <h3 className="font-cinzel font-bold text-[#FFF2A8] text-lg group-hover:text-[#F5D77F] transition-colors flex items-center gap-1.5">
                <span>Spoken Voice Story</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#DFB260]/30 text-[#FFF2A8]">AI</span>
              </h3>
              <p className="text-xs text-[#C8B1E4]/90 leading-relaxed font-medium">
                Record spoken memories directly into the capsule. Gemini AI transcribes audio to text automatically.
              </p>
              <div className="flex items-center space-x-1 text-xs font-semibold text-amber-300 uppercase tracking-wider pt-1">
                <span>Record Voice Story</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

          </div>

          {/* Active Capsules Timeline */}
          <div className="cosmic-card rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-4">
              <h3 className="font-cinzel font-bold text-[#FFF2A8] text-2xl">Active Time Capsules</h3>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F]">{letters.length} Sealed Entries</span>
            </div>

            <div className="space-y-4">
              {letters.map((letter) => (
                <div 
                  key={letter.id}
                  className="bg-[#120B21]/90 border border-[#DFB260]/30 rounded-2xl p-5 space-y-3 transition-all hover:border-[#DFB260]/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8]">
                          {letter.status}
                        </span>
                        <span className="text-xs text-[#C8B1E4]">To: <strong className="text-[#FFF2A8]">{letter.recipient}</strong></span>
                      </div>
                      <h4 className="text-lg font-cinzel font-bold text-[#FFF2A8] mt-1.5">{letter.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#F5D77F] font-mono font-semibold bg-[#0A0514] px-3 py-1 rounded-xl border border-[#DFB260]/30 flex items-center gap-1 shadow-xs">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        {letter.releaseDate}
                      </span>
                      {onDeleteLetter && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the letter "${letter.title}"?`)) {
                              onDeleteLetter(letter.id);
                            }
                          }}
                          className="p-1.5 rounded-xl bg-[#0A0514] hover:bg-red-950/80 text-red-300 hover:text-red-200 border border-red-500/30 transition-colors cursor-pointer"
                          title="Delete Letter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {letter.isAudioRecording && letter.audioUrl && (
                    <div className="flex items-center justify-between bg-[#0A0514] p-2.5 rounded-xl border border-amber-500/40 text-xs my-2">
                      <span className="font-mono text-amber-300 flex items-center gap-1.5 font-bold">
                        <Volume2 className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span>Spoken Voice Story Recording</span>
                      </span>
                      <audio controls src={letter.audioUrl} className="h-7 max-w-[210px]" />
                    </div>
                  )}

                  <p className="text-xs text-[#C8B1E4] italic line-clamp-2 bg-[#0A0514]/80 p-3 rounded-xl border border-[#DFB260]/20 font-medium">
                    "{letter.content}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#C8B1E4]/80 font-mono pt-2 border-t border-[#DFB260]/20">
                    <span className="text-emerald-400 font-bold">TX: {letter.arweaveId}</span>
                    <div className="flex items-center space-x-3 font-semibold">
                      <span>📎 {letter.attachmentsCount} Attachments</span>
                      <span>👥 {letter.heirsCount} Designated Heirs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Storytelling Assistant */}
        <div className="space-y-6">
          <div className="cosmic-card p-6 sm:p-8 rounded-3xl space-y-5 border border-[#DFB260]/40 shadow-2xl">
            <div className="flex items-center space-x-3 border-b border-[#DFB260]/30 pb-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#DFB260] to-[#b88e4c] text-[#0f081d] rounded-2xl flex items-center justify-center font-bold shadow-md">
                <Bot className="w-5 h-5 text-[#0f081d]" />
              </div>
              <div>
                <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">AI Storytelling Assistant</h3>
                <span className="text-[11px] text-[#F5D77F] font-mono font-semibold tracking-wide">Autobiography Assistant</span>
              </div>
            </div>

            <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 text-xs text-[#E8DDF5] space-y-3 font-sans">
              <p className="leading-relaxed italic font-serif text-sm text-[#FFF2A8]">
                "I've noticed you shared many memories from your garden this summer. Would you like me to draft a story outline titled 'The Harvest of 2024'?"
              </p>
              <div className="space-y-2 pt-1 font-semibold text-xs">
                <button
                  onClick={onOpenConcierge}
                  className="w-full gold-filled-btn text-xs py-2.5 rounded-2xl cursor-pointer shadow-[0_0_15px_rgba(245,215,127,0.2)]"
                >
                  Yes, help me write that
                </button>
                <button
                  onClick={onOpenConcierge}
                  className="w-full bg-[#1a0f30] hover:bg-[#28174a] text-[#F5D77F] py-2.5 rounded-2xl border border-[#DFB260]/40 transition-colors cursor-pointer"
                >
                  Show me more suggestions
                </button>
              </div>
            </div>

            {/* Archival Progress Meter */}
            <div className="pt-4 border-t border-[#DFB260]/30 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#C8B1E4] font-semibold uppercase">Archival Progress</span>
                <span className="text-emerald-400 font-bold">75% Preserved</span>
              </div>
              <div className="w-full bg-[#0A0514] rounded-full h-2.5 p-0.5 border border-[#DFB260]/30 overflow-hidden">
                <div className="bg-gradient-to-r from-[#DFB260] to-emerald-400 rounded-full h-full w-[75%]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Compose Letter Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card-gold max-w-xl w-full p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl border border-[#DFB260]/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-3">
              <div className="flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-[#F5D77F]" />
                <h3 className="font-cinzel font-bold text-[#FFF2A8] text-xl">Compose Time Capsule Letter</h3>
              </div>
              <button 
                onClick={() => setShowComposeModal(false)}
                className="text-[#C8B1E4] hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLetter} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#F5D77F] font-mono text-xs font-semibold uppercase tracking-wider mb-1">Letter Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Reflections on Family & Crafts"
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#F5D77F] font-mono text-xs font-semibold uppercase tracking-wider mb-1">Recipient(s)</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g. Great-Grandchildren"
                    className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#F5D77F] font-mono text-xs font-semibold uppercase tracking-wider mb-1">Target Release Date</label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                    required
                  />
                </div>
              </div>

              {/* AUDIO-TO-TEXT SPOKEN STORY RECORDING WIDGET IN TIME CAPSULE */}
              <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/40 space-y-3 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40">
                      <Mic className="w-4 h-4 text-[#F5D77F]" />
                    </div>
                    <div>
                      <span className="font-cinzel font-bold text-[#FFF2A8] text-xs block">
                        Record Spoken Time Capsule Audio &amp; AI Transcribe
                      </span>
                      <span className="text-[10px] text-[#C8B1E4]/70 font-mono block">
                        Speak directly into the capsule — transcribed into written text by Gemini AI
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
                      <span>Record Voice</span>
                    </button>
                  )}
                </div>

                {/* Active Recording Indicator */}
                {isRecordingAudio && (
                  <div className="bg-[#120B21] p-3 rounded-xl border border-rose-500/50 flex items-center justify-between gap-3 animate-pulse">
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

                {/* Recorded Audio Controls & AI Transcribe */}
                {audioDataUrl && !isRecordingAudio && (
                  <div className="bg-[#120B21] p-3 rounded-xl border border-[#DFB260]/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2 text-[#F5D77F] font-semibold">
                        <Volume2 className="w-4 h-4 text-[#F5D77F]" />
                        <span>Spoken Audio Captured ({audioRecordingTime}s)</span>
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
                            <span>AI Transcribing Spoken Story...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 text-[#120B21]" />
                            <span>⚡ AI Transcribe Audio to Letter</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#F5D77F] font-mono text-xs font-semibold uppercase tracking-wider">Letter Content / Transcribed Story</label>
                  <button
                    type="button"
                    onClick={handleAiStoryAssist}
                    disabled={isGeneratingStory}
                    className="flex items-center gap-1 text-[#F5D77F] hover:text-[#FFF2A8] font-semibold text-xs cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#F5D77F]" />
                    <span>{isGeneratingStory ? "Generating with Gemini..." : "AI Auto-Draft Letter"}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your story, advice, and thoughts for the future, or record spoken audio above..."
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] leading-relaxed font-medium transition-all"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 text-[#C8B1E4] hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-filled-btn px-6 py-2.5 text-xs cursor-pointer"
                >
                  Seal on Arweave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
