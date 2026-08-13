import React, { useState, useEffect } from 'react';
import { ViewMode, UserProfile } from '../types';
import { AeternaLogo } from './AeternaLogo';
import { 
  ShieldCheck, 
  Bot, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Database,
  Clock,
  Film,
  Image as ImageIcon,
  LogIn,
  UserPlus,
  ChevronRight,
  Upload,
  FileText,
  Radio,
  Layers,
  Shield,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkle
} from 'lucide-react';

interface LandingViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onSignInAsDemo: () => void;
  currentUser: UserProfile | null;
}

interface VideoScene {
  id: string;
  title: string;
  badge: string;
  icon: React.ReactNode;
  videoPoster: string;
  videoUrl?: string;
  videoOverlayText: string;
  aiExplanation: string;
  permawebDetails: {
    txHash: string;
    block: number;
    lifespan: string;
  };
}

const HERO_BG_IMAGE = '/aeterna-vault-hero-export.jpg';

const VIDEO_SCENES: VideoScene[] = [
  {
    id: 'photos',
    title: 'Photos Permanently Stored',
    badge: 'ARWEAVE PERMAWEB WEAVE',
    icon: <ImageIcon className="w-4 h-4 text-[#F5D77F]" />,
    videoPoster: HERO_BG_IMAGE,
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    videoOverlayText: 'Weaving high-resolution family ocean retreat photos onto Arweave Block #1,482,931...',
    aiExplanation: "I am Gemini AI. When you upload a photo, I create zero-loss cryptographic proofs, tag family members, and seal it on-chain forever.",
    permawebDetails: {
      txHash: '0x892a_arweave_weave_4092_f91a',
      block: 1482931,
      lifespan: '200+ Years Paid Upfront'
    }
  },
  {
    id: 'video',
    title: 'Cinematic Videos & Audio',
    badge: 'ZERO COMPRESSION LOSS',
    icon: <Film className="w-4 h-4 text-[#C8B1E4]" />,
    videoPoster: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    videoOverlayText: 'Preserving 4K family wedding & audio spoken memories without cloud compression or expiration...',
    aiExplanation: "Cloud services delete inactive videos after years of missed payments. Aeterna's Arweave storage model guarantees video playback forever.",
    permawebDetails: {
      txHash: '0x334f_video_4k_hdr_vault',
      block: 1482932,
      lifespan: 'Immortal Permaweb Storage'
    }
  },
  {
    id: 'timecapsules',
    title: 'Time Capsules Written for Heirs',
    badge: 'RELEASE DATE: OCT 12, 2045',
    icon: <Clock className="w-4 h-4 text-[#F5D77F]" />,
    videoPoster: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    videoOverlayText: 'Writing time capsule letter to daughter Clara for her 30th Birthday in 2045...',
    aiExplanation: "I lock your written letters and spoken advice inside smart time-capsules. They remain mathematically sealed until the exact milestone date.",
    permawebDetails: {
      txHash: '0x7711_time_capsule_locked',
      block: 1482933,
      lifespan: 'Locked Until 2045-10-12'
    }
  },
  {
    id: 'generations',
    title: 'Storage for Generations Over Time',
    badge: 'YEAR 2026 ➔ 2126 Preserved',
    icon: <Layers className="w-4 h-4 text-[#DFB260]" />,
    videoPoster: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=1200',
    videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyflights.mp4',
    videoOverlayText: 'Spanning 4 generations: 2026, 2056, 2096, 2126 — pristine family history passed forward...',
    aiExplanation: "Generational storage means your great-grandchildren can interact with your voice, read your memoirs, and understand your family origin.",
    permawebDetails: {
      txHash: '0x9920_generational_heir_chain',
      block: 1482934,
      lifespan: 'Multi-Generational Multi-Sig'
    }
  }
];

// Memory gallery photos with rich Unsplash images
const MEMORY_GALLERY = [
  {
    title: 'family beach day',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    position: { top: '2%', right: '8%', rotate: '3deg', delay: '0s' }
  },
  {
    title: 'hands across time',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=600',
    position: { top: '18%', left: '4%', rotate: '-5deg', delay: '-3s' }
  },
  {
    title: 'the day they said yes',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=600',
    position: { top: '32%', right: '2%', rotate: '6deg', delay: '-6s' }
  },
  {
    title: 'birthday wishes',
    type: 'video',
    url: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&q=80&w=600',
    position: { top: '48%', left: '16%', rotate: '4deg', delay: '-9s' }
  },
  {
    title: 'letters for later',
    type: 'photo',
    url: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=600',
    position: { top: '66%', left: '2%', rotate: '-4deg', delay: '-12s' }
  },
  {
    title: 'home video night',
    type: 'video',
    url: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=600',
    position: { top: '70%', right: '10%', rotate: '5deg', delay: '-15s' }
  }
];

export const LandingView: React.FC<LandingViewProps> = ({
  onSelectView,
  onOpenUpload,
  onOpenAuth,
  onSignInAsDemo,
  currentUser
}) => {
  // Active Timeline Step state (01 Upload, 02 Guide, 03 Seal, 04 Inherit)
  const [activeStep, setActiveStep] = useState(0);

  // Video reel state
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [showAiWalkthrough, setShowAiWalkthrough] = useState(true);
  const [timelineYear, setTimelineYear] = useState(2026);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => setInteractive(true), []);

  const currentScene = VIDEO_SCENES[activeSceneIndex];

  // Auto-cycle timeline journey steps every 3.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep(prev => (prev + 1) % 4);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  // Auto-play video scenes carousel
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveSceneIndex(prev => (prev + 1) % VIDEO_SCENES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div id="landing-view" className="w-full space-y-12 pb-24 text-[#E8DDF5]">
      
      {/* CINEMATIC HERO INTRODUCTION SECTION */}
      <section className="cinema w-full min-h-screen overflow-hidden border-b border-[#DFB260]/40 shadow-[0_0_80px_rgba(115,54,180,0.4)] bg-[#0c0617] relative">
        
        {/* Full Image Background Layer */}
        <div className="hero-image-bg pointer-events-none overflow-hidden">
          <img 
            src={HERO_BG_IMAGE} 
            alt="Aeterna Sovereign Vault" 
            className="w-full h-full object-cover object-center scale-100 opacity-95 transition-all duration-700"
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/aeterna-vault-hero-export.jpg';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#080312]/70 via-[#080312]/20 to-[#080312]/40 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F081D] via-transparent to-[#080312]/25 pointer-events-none"></div>
        </div>

        <div className="film-grain"></div>
        <div className="light-ribbons">
          <span></span>
          <span></span>
          <span></span>
        </div>

        {/* Floating Memory Gallery */}
        <div className="memory-gallery hidden lg:block" aria-hidden="true">
          {MEMORY_GALLERY.map((item, idx) => (
            <span
              key={idx}
              className={`memory-photo ${item.type === 'video' ? 'video-memory' : ''}`}
              style={{
                top: item.position.top,
                right: item.position.right,
                left: item.position.left,
                transform: `rotate(${item.position.rotate})`,
                animationDelay: item.position.delay
              }}
            >
              <img 
                src={item.url} 
                alt={item.title} 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/aeterna-vault-hero-export.jpg';
                }}
                className="w-full h-full object-cover rounded-xl"
              />
              <span className="memory-photo-caption font-sans uppercase">
                {item.title}
              </span>
            </span>
          ))}
        </div>

        {/* Top welcome brand bar */}
        <div className="col-span-3 pt-6 px-6 sm:px-12 flex flex-wrap items-center justify-between gap-4 z-10">
          <div className="flex items-center space-x-4">
            <AeternaLogo size="md" showSubtitle={false} onClick={() => onSelectView('landing')} />
            <div className="hidden sm:flex items-center space-x-2 bg-[#120B21]/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-[#DFB260]/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#F5D77F]">
                PRIVATE BY DEFAULT
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {currentUser ? (
              <button
                onClick={() => onSelectView('dashboard')}
                className="gold-filled-btn text-xs px-5 py-2.5 flex items-center space-x-2 cursor-pointer"
              >
                <span>Go to My Vault</span>
                <ArrowRight className="w-4 h-4 text-[#120B21]" />
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenAuth('signin')}
                  disabled={!interactive}
                  className="ghost-button text-xs px-4 py-2.5 text-[#FFF2A8] font-semibold flex items-center space-x-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F5D77F]" />
                  <span>Sign in</span>
                </button>
                <button
                  id="landing-create-vault"
                  onClick={() => onOpenAuth('signup')}
                  disabled={!interactive}
                  className="solid-button text-xs px-5 py-2.5 font-bold cursor-pointer"
                >
                  <span>Create your vault</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Hero Copy */}
        <div className="col-start-2 row-start-2 my-auto max-w-2xl py-8 sm:py-12 z-10 space-y-6">
          <p className="eyebrow text-[#E2BC7B] font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <Sparkle className="w-3.5 h-3.5 text-[#F5D77F]" />
            A private home for your family's stories
          </p>

          <h1 className="font-serif font-bold text-4xl sm:text-6xl md:text-7xl leading-[0.95] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF8D0] via-[#F5D77F] to-[#B88E4C] drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            Keep the moments your family should never lose.
          </h1>

          <p className="lede text-base sm:text-xl text-[#C8B1E4]/90 font-sans leading-relaxed max-w-xl">
            Save photos, videos, letters, and the stories behind them. Organize everything privately, invite trusted family, and choose what to preserve permanently.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onOpenAuth('signup')}
              disabled={!interactive}
              className="min-h-12 rounded-xl bg-[#F5D77F] px-6 text-sm font-bold text-[#120B21] shadow-xl hover:bg-[#FFF2A8]"
            >
              <span>Create your vault</span>
            </button>

            <button
              onClick={() => onOpenAuth('signin')}
              disabled={!interactive}
              className="min-h-12 rounded-xl px-5 text-sm font-semibold text-[#FFF2A8] underline-offset-4 hover:underline"
            >
              <span>Sign in</span>
            </button>

            <button
              onClick={onSignInAsDemo}
              disabled={!interactive}
              className="flex min-h-12 items-center gap-2 rounded-xl border border-[#DFB260]/45 bg-[#28134D]/80 px-5 text-sm font-semibold text-[#FFF2A8] transition hover:bg-[#381B68]"
              title="Explore interactive demo mode"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Explore Demo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Timeline Memory Journey Steps */}
        <div className="col-start-2 row-start-3 grid grid-cols-2 md:grid-cols-4 gap-3 z-10 pb-4">
          {[
            { step: '01', title: 'Upload', desc: 'Photos, videos, letters' },
            { step: '02', title: 'Guide', desc: 'AI helps capture the story' },
            { step: '03', title: 'Seal', desc: 'Permanent family context' },
            { step: '04', title: 'Inherit', desc: 'Generations receive it' }
          ].map((item, idx) => (
            <div
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl border backdrop-blur-md cursor-pointer transition-all duration-300 ${
                activeStep === idx 
                  ? 'bg-[#7353A0]/30 border-[#DFB260] -translate-y-1 shadow-[0_0_20px_rgba(223,178,96,0.3)]' 
                  : 'bg-black/30 border-white/10 hover:bg-black/50'
              }`}
            >
              <span className="block text-xs font-mono font-bold text-[#F5D77F] mb-1">
                {item.step}
              </span>
              <strong className="block text-sm font-cinzel text-[#FFF2A8]">
                {item.title}
              </strong>
              <p className="text-xs text-[#C8B1E4]/80 mt-0.5 font-sans">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </section>

      {/* LOWER SECTIONS CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* GLIMPSE BAND SECTION */}
        <section className="cosmic-card p-8 sm:p-12 space-y-8 shadow-2xl" aria-label="App use glimpses">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 border-b border-[#DFB260]/30 pb-6">
          <div className="space-y-2">
            <p className="eyebrow text-[#E2BC7B] font-mono text-xs font-bold uppercase tracking-widest">
              AI-guided memory storage
            </p>
            <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#FFF2A8] max-w-2xl leading-snug">
              Photos, videos, and time capsules become a living archive for generations.
            </h2>
          </div>
          <button
            onClick={() => onOpenAuth('signup')}
            disabled={!interactive}
            className="gold-beveled-btn text-xs px-5 py-2.5 text-[#FFF2A8] font-bold flex items-center space-x-2 shrink-0 cursor-pointer"
          >
            <span>Create Your Living Archive</span>
            <ArrowRight className="w-4 h-4 text-[#F5D77F]" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="bg-[#1A0C33]/90 border border-[#DFB260]/40 rounded-2xl overflow-hidden p-6 space-y-4 hover:border-[#F5D77F] transition-all shadow-[0_0_20px_rgba(115,54,180,0.15)] group">
            <div className="h-40 -mx-6 -mt-6 relative overflow-hidden bg-black/40">
              <img 
                src="https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&q=80&w=800" 
                alt="Photos stay meaningful"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/aeterna-vault-hero-export.jpg';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A0C33] via-transparent to-transparent"></div>
            </div>
            <div className="space-y-2">
              <h3 className="font-cinzel font-bold text-xl text-[#FFF2A8] flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-[#F5D77F]" />
                <span>Photos stay meaningful</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#C8B1E4]/80 leading-relaxed font-sans">
                Names, places, dates, and the feeling of the day travel with each image so future family members know who everyone was.
              </p>
            </div>
          </article>

          <article className="bg-[#1A0C33]/90 border border-[#DFB260]/40 rounded-2xl overflow-hidden p-6 space-y-4 hover:border-[#F5D77F] transition-all shadow-[0_0_20px_rgba(115,54,180,0.15)] group">
            <div className="h-40 -mx-6 -mt-6 relative overflow-hidden bg-black/40">
              <img 
                src="https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=800" 
                alt="Videos become searchable"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/aeterna-vault-hero-export.jpg';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A0C33] via-transparent to-transparent"></div>
            </div>
            <div className="space-y-2">
              <h3 className="font-cinzel font-bold text-xl text-[#FFF2A8] flex items-center space-x-2">
                <Film className="w-5 h-5 text-[#C8B1E4]" />
                <span>Videos become searchable</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#C8B1E4]/80 leading-relaxed font-sans">
                Clips are organized into a living family archive, ready for future discovery and optional permanent preservation.
              </p>
            </div>
          </article>

          <article className="bg-[#1A0C33]/90 border border-[#DFB260]/40 rounded-2xl overflow-hidden p-6 space-y-4 hover:border-[#F5D77F] transition-all shadow-[0_0_20px_rgba(115,54,180,0.15)] group">
            <div className="h-40 -mx-6 -mt-6 relative overflow-hidden bg-black/40">
              <img 
                src="https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=800" 
                alt="Time capsules wait"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/aeterna-vault-hero-export.jpg';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-85"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A0C33] via-transparent to-transparent"></div>
            </div>
            <div className="space-y-2">
              <h3 className="font-cinzel font-bold text-xl text-[#FFF2A8] flex items-center space-x-2">
                <Clock className="w-5 h-5 text-[#F5D77F]" />
                <span>Time capsules wait</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#C8B1E4]/80 leading-relaxed font-sans">
                Letters and recordings can be prepared now and opened later by loved ones on specified future milestone dates.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Retired prototype showcases removed; the live product tour now carries this story. */}
      {/* FINAL CALL TO ACTION */}
      <div className="cosmic-card-gold rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden">
        
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <AeternaLogo size="lg" showSubtitle={false} />
          <h2 className="text-3xl sm:text-4xl font-cinzel font-bold text-[#FFF2A8] leading-tight">
            Start your family vault today
          </h2>
          <p className="text-sm text-[#C8B1E4]">
            Begin with an empty private vault, then add memories and invite family when you are ready.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onOpenAuth('signup')}
              disabled={!interactive}
              className="min-h-12 rounded-xl bg-[#F5D77F] px-8 text-sm font-bold text-[#120B21]"
            >
              <UserPlus className="w-4 h-4 text-[#120B21] inline mr-1.5" />
              <span>Create your vault</span>
            </button>

            <button
              onClick={() => onOpenAuth('signin')}
              disabled={!interactive}
              className="min-h-12 rounded-xl border border-[#DFB260]/45 px-8 text-sm font-bold text-[#FFF2A8]"
            >
              <LogIn className="w-4 h-4 text-[#F5D77F] inline mr-1.5" />
              <span>Sign in</span>
            </button>
          </div>
        </div>
      </div>

      </div>

    </div>
  );
};
