import React, { useState } from 'react';
import { ViewMode, MemoryItem, UserProfile, MemorialShrine, Heir } from '../types';
import { StorageUsageDashboard } from './StorageUsageDashboard';
import { 
  Plus, 
  Database, 
  ShieldCheck, 
  Sparkles, 
  Heart, 
  Lock, 
  ArrowRight, 
  Clock, 
  Bot, 
  MessageSquare, 
  CheckCircle2, 
  Activity, 
  HardDrive,
  Users,
  Key,
  FolderLock,
  Globe,
  Award,
  Shield,
  Trash2,
  RotateCcw,
  FileText,
  Video,
  Camera
} from 'lucide-react';

interface DashboardViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
  onOpenVideoRecorder?: () => void;
  onOpenConcierge: () => void;
  memories: MemoryItem[];
  memorials?: MemorialShrine[];
  heirs?: Heir[];
  currentUser: UserProfile | null;
  onClearDemoContent?: () => void;
  onRestoreDemoContent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onSelectView,
  onOpenUpload,
  onOpenVideoRecorder,
  onOpenConcierge,
  memories,
  memorials = [],
  heirs = [],
  currentUser,
  onClearDemoContent,
  onRestoreDemoContent
}) => {
  const [aiDismissed, setAiDismissed] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [clearSuccessNotice, setClearSuccessNotice] = useState<string | null>(null);

  const userName = currentUser ? currentUser.name : 'Arthur';
  const firstName = currentUser ? currentUser.name.split(' ')[0] : 'Arthur';

  const handleConfirmClear = () => {
    if (onClearDemoContent) {
      onClearDemoContent();
      setClearSuccessNotice('All demo memories and sample items have been cleared. Your vault is now clean!');
      setShowConfirmClear(false);
      setTimeout(() => setClearSuccessNotice(null), 6000);
    }
  };

  const handleConfirmRestore = () => {
    if (onRestoreDemoContent) {
      onRestoreDemoContent();
      setClearSuccessNotice('Sample demo content has been restored to your vault.');
      setTimeout(() => setClearSuccessNotice(null), 6000);
    }
  };

  return (
    <div id="dashboard-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* Clear Success Notice Toast */}
      {clearSuccessNotice && (
        <div className="bg-emerald-950/90 border border-emerald-500/50 p-4 rounded-2xl flex items-center justify-between text-xs font-semibold text-emerald-200 animate-fade-in shadow-xl">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{clearSuccessNotice}</span>
          </div>
          <button 
            onClick={() => setClearSuccessNotice(null)}
            className="text-emerald-400 hover:text-white text-xs underline font-mono cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Greeting & Main Action Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 cosmic-card-gold p-8 sm:p-10 rounded-3xl relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-widest text-[#F5D77F] mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SOVEREIGN VAULT #4092 // VOL. 04</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-cinzel font-bold text-[#FFF2A8] tracking-tight">
            Good Morning, {firstName}
          </h1>
          <p className="text-sm text-[#C8B1E4] mt-2 max-w-xl font-medium leading-relaxed">
            Your legacy is secure, <strong className="text-[#FFF2A8] font-semibold">{userName}</strong>. Everything is permanently woven onto the Arweave permaweb with 256-bit AES encryption.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          {onOpenVideoRecorder && (
            <button
              id="btn-dashboard-record-video"
              onClick={onOpenVideoRecorder}
              className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs px-5 py-3.5 rounded-2xl flex items-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.35)] transition-transform active:scale-95 border border-amber-300/40"
            >
              <Video className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>Live Record</span>
            </button>
          )}

          <button
            id="btn-dashboard-new-entry"
            onClick={onOpenUpload}
            className="gold-filled-btn text-xs px-5 py-3.5 flex items-center space-x-2 cursor-pointer shadow-[0_0_20px_rgba(245,215,127,0.3)]"
          >
            <Plus className="w-4 h-4 text-[#120B21]" />
            <span>+ New Memory Entry</span>
          </button>

          {memories.length > 0 ? (
            <button
              onClick={() => setShowConfirmClear(true)}
              className="bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 text-xs px-4 py-3.5 rounded-2xl font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Clear sample demo memories from your vault"
            >
              <Trash2 className="w-4 h-4 text-red-300" />
              <span className="hidden sm:inline">Clear Demo Content</span>
            </button>
          ) : (
            <button
              onClick={handleConfirmRestore}
              className="bg-[#28134D] hover:bg-[#381B68] text-[#F5D77F] border border-[#DFB260]/40 text-xs px-4 py-3.5 rounded-2xl font-semibold flex items-center space-x-1.5 transition-all cursor-pointer"
              title="Reload sample demo content into vault"
            >
              <RotateCcw className="w-4 h-4 text-[#F5D77F]" />
              <span>Restore Demo Data</span>
            </button>
          )}
        </div>

        {/* Background Radial Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#DFB260]/10 via-[#7353A0]/20 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      </div>

      {/* Confirmation Modal for Clearing Demo Content */}
      {showConfirmClear && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card max-w-md w-full p-6 space-y-4 border border-red-500/50 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-300">
              <Trash2 className="w-6 h-6 text-red-400" />
              <h3 className="text-xl font-cinzel font-bold text-[#FFF2A8]">Clear Demo Content?</h3>
            </div>
            <p className="text-xs text-[#C8B1E4] leading-relaxed">
              This will remove all sample demo memories, letters, and shrines from your view, leaving you with a clean, pristine vault ready for your authentic family archives.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                onClick={() => setShowConfirmClear(false)}
                className="px-4 py-2 text-xs font-semibold text-[#C8B1E4] hover:text-white bg-white/5 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClear}
                className="px-5 py-2 text-xs font-bold text-white bg-red-800 hover:bg-red-700 rounded-xl cursor-pointer shadow-md"
              >
                Yes, Clear Demo Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Vault State Banner (When Memories count is 0) */}
      {memories.length === 0 && (
        <div className="cosmic-card p-8 text-center space-y-4 border-2 border-dashed border-[#DFB260]/40">
          <div className="w-12 h-12 bg-[#DFB260]/20 text-[#F5D77F] rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6 text-[#F5D77F]" />
          </div>
          <div className="space-y-1 max-w-lg mx-auto">
            <h2 className="text-2xl font-cinzel font-bold text-[#FFF2A8]">Your Sovereign Vault is Ready</h2>
            <p className="text-xs text-[#C8B1E4] leading-relaxed">
              Demo content has been cleared. Your vault is completely empty and ready for your real family photos, video recordings, and time capsule letters.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-3 pt-2">
            <button
              onClick={onOpenUpload}
              className="gold-filled-btn text-xs px-6 py-3 cursor-pointer flex items-center space-x-2"
            >
              <Plus className="w-4 h-4 text-[#120B21]" />
              <span>Upload First Memory</span>
            </button>
            <button
              onClick={handleConfirmRestore}
              className="ghost-button text-xs px-5 py-3 text-[#FFF2A8] cursor-pointer flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Restore Sample Demo Content</span>
            </button>
          </div>
        </div>
      )}

      {/* RECENTLY ACCESSED MODULES SECTION */}
      <div id="recently-accessed-modules" className="space-y-4">
        <div className="flex items-center justify-between pb-1">
          <h2 className="text-2xl font-cinzel font-bold text-[#FFF2A8]">Recently Accessed Modules</h2>
          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F]">5 Sovereign Zones</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          
          {/* Zone 01: Personal Memories */}
          <div 
            id="zone-01-memories"
            onClick={() => onSelectView('search')}
            className="group cursor-pointer cosmic-card p-5 hover:border-[#F5D77F] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8]">
                  Zone 01
                </span>
                <Clock className="w-4 h-4 text-[#F5D77F]" />
              </div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                Personal Memories
              </h3>
              <p className="text-xs text-[#C8B1E4]/80 mt-2 leading-relaxed">
                Vibrant snapshots, family videos, and personal journal logs woven into block history.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs font-semibold text-[#C8B1E4] group-hover:text-[#FFF2A8]">
              <span>Today, 10:45 AM</span>
              <ArrowRight className="w-4 h-4 text-[#F5D77F] transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Zone 02: Memorials */}
          <div 
            id="zone-02-memorials"
            onClick={() => onSelectView('memorials')}
            className="group cursor-pointer cosmic-card p-5 hover:border-[#F5D77F] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8]">
                  Zone 02
                </span>
                <Sparkles className="w-4 h-4 text-[#F5D77F]" />
              </div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                Memorial Shrines
              </h3>
              <p className="text-xs text-[#C8B1E4]/80 mt-2 leading-relaxed">
                Honoring ancestors with digital shrines, permanent video archives, and eternal tribute flames.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs font-semibold text-[#C8B1E4] group-hover:text-[#FFF2A8]">
              <span className="flex items-center gap-1.5 text-[#F5D77F]">
                <Users className="w-3.5 h-3.5" /> {memorials && memorials.length > 0 ? `${memorials.length} Active Shrines` : '0 Active Shrines'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#F5D77F] transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Zone 03: Legacy Locker */}
          <div 
            id="zone-03-locker"
            onClick={() => onSelectView('locker')}
            className="group cursor-pointer cosmic-card p-5 hover:border-[#F5D77F] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8]">
                  Zone 03
                </span>
                <Lock className="w-4 h-4 text-[#F5D77F]" />
              </div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                Legacy Locker
              </h3>
              <p className="text-xs text-[#C8B1E4]/80 mt-2 leading-relaxed">
                Deeds, titles, secret keys, and binding digital contracts with automated inheritance triggers.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs font-semibold text-[#C8B1E4] group-hover:text-[#FFF2A8]">
              <span className="text-[#FFF2A8] uppercase">Level 5 Protected</span>
              <ArrowRight className="w-4 h-4 text-[#F5D77F] transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Zone 04: Inheritance Protocol */}
          <div 
            id="zone-04-inheritance"
            onClick={() => onSelectView('inheritance')}
            className="group cursor-pointer cosmic-card p-5 hover:border-[#F5D77F] transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300">
                  Zone 04
                </span>
                <Users className="w-4 h-4 text-emerald-400" />
              </div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                Inheritance Protocol
              </h3>
              <p className="text-xs text-[#C8B1E4]/80 mt-2 leading-relaxed">
                Invite family heirs, configure dead man's switch timer, multi-sig consensus, and claim access.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs font-semibold text-[#C8B1E4] group-hover:text-[#FFF2A8]">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {heirs && heirs.length > 0 ? `${heirs.length} Active Heirs` : '0 Active Heirs'}
              </span>
              <ArrowRight className="w-4 h-4 text-[#F5D77F] transition-transform group-hover:translate-x-1" />
            </div>
          </div>

          {/* Zone 05: Immortal Gateway */}
          <div 
            id="zone-05-immortal"
            onClick={() => onSelectView('immortal')}
            className="group cursor-pointer cosmic-card p-5 hover:border-[#F5D77F] transition-all duration-300 flex flex-col justify-between sm:col-span-2 lg:col-span-1"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8]">
                  Zone 05
                </span>
                <Globe className="w-4 h-4 text-[#F5D77F]" />
              </div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors">
                Immortal Gateway & Viewer
              </h3>
              <p className="text-xs text-[#C8B1E4]/80 mt-2 leading-relaxed">
                Zero-dependency standalone HTML applet & Arweave gateway viewer. Guarantees file access offline forever.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs font-semibold text-[#C8B1E4] group-hover:text-[#FFF2A8]">
              <span className="text-[#FFF2A8] font-bold flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-[#F5D77F]" /> Offline Exporter
              </span>
              <ArrowRight className="w-4 h-4 text-[#F5D77F] transition-transform group-hover:translate-x-1" />
            </div>
          </div>

        </div>
      </div>


      {/* D3 Storage Usage Dashboard Component */}
      <StorageUsageDashboard memories={memories} />

      {/* Main Content Grid: AI Concierge & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Zone Summary & Quick Paths */}
        <div className="lg:col-span-2 space-y-6">
          <div className="cosmic-card p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#DFB260]/20 pb-3">
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">Permaweb Replication Status</h3>
              <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/40">
                100% HEALTHY
              </span>
            </div>
            <p className="text-xs text-[#C8B1E4] leading-relaxed">
              All media items, spoken audio transcripts, legal deeds, and time capsule letters are encrypted client-side using AES-256 and pinned across Arweave permaweb nodes.
            </p>
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs font-mono text-center">
              <div className="p-3 bg-[#0A0514] rounded-xl border border-[#DFB260]/20">
                <span className="text-[#C8B1E4] block text-[10px]">CONSENSUS</span>
                <span className="text-[#FFF2A8] font-bold">24 NODES</span>
              </div>
              <div className="p-3 bg-[#0A0514] rounded-xl border border-[#DFB260]/20">
                <span className="text-[#C8B1E4] block text-[10px]">ENCRYPTION</span>
                <span className="text-[#FFF2A8] font-bold">AES-256-GCM</span>
              </div>
              <div className="p-3 bg-[#0A0514] rounded-xl border border-[#DFB260]/20">
                <span className="text-[#C8B1E4] block text-[10px]">LIFESPAN</span>
                <span className="text-emerald-400 font-bold">PERPETUAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Concierge Assistant Card */}
        <div className="space-y-6">
          <div id="ai-concierge-card" className="cosmic-card-gold p-6 space-y-5 relative shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#DFB260] text-[#120B21] rounded-2xl flex items-center justify-center font-bold shadow-md">
                  <Bot className="w-5 h-5 text-[#120B21]" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">AI Concierge</h3>
                  <span className="text-[10px] text-[#F5D77F] font-mono uppercase font-bold tracking-wider">Gemini 3.6 Flash Active</span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            {/* AI Speech Box */}
            <div className="bg-[#120B21]/90 border border-[#DFB260]/30 rounded-2xl p-4 text-xs text-[#E8DDF5] space-y-3 font-sans">
              <p className="leading-relaxed italic font-serif text-sm text-[#FFF2A8]">
                "Good morning, {firstName}. I'm monitoring your vault storage. How can I help you curate your memories today?"
              </p>

              {!aiDismissed && (
                <div className="bg-[#28134D]/80 border-l-2 border-[#F5D77F] p-3 rounded-r-xl space-y-2">
                  <p className="text-[11px] text-[#C8B1E4] leading-normal">
                    💡 <strong className="text-[#FFF2A8]">
                      {memories.length > 0 ? 'Smart Curation Suggestion:' : 'Clean Vault Ready:'}
                    </strong>{' '}
                    {memories.length > 0
                      ? "I noticed new family retreat photos. Would you like me to auto-tag and group them into 'Summer Coast 2024'?"
                      : "Your vault is clean and unencumbered. Upload your authentic family memories, letters, or digital assets anytime."}
                  </p>
                  <div className="flex items-center space-x-2 pt-1">
                    <button
                      onClick={() => memories.length > 0 ? onSelectView('search') : onOpenUpload()}
                      className="gold-filled-btn text-[10px] px-3 py-1 uppercase tracking-wider cursor-pointer"
                    >
                      {memories.length > 0 ? 'Yes, please' : '+ Upload Memory'}
                    </button>
                    <button
                      onClick={() => setAiDismissed(true)}
                      className="text-[#C8B1E4] hover:text-white px-2 py-1 text-[10px] uppercase font-medium cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions Interactive Click Paths */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-[#F5D77F] block">
                ⚡ Interactive Action Paths
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenUpload}
                  className="p-2.5 bg-[#120B21]/80 hover:bg-[#DFB260] hover:text-[#120B21] rounded-xl border border-[#DFB260]/30 text-[11px] text-[#FFF2A8] transition-all duration-200 font-semibold cursor-pointer flex items-center justify-between group"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#F5D77F] group-hover:text-[#120B21]" />
                    <span>Upload Memory</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => onSelectView('legacy')}
                  className="p-2.5 bg-[#120B21]/80 hover:bg-[#DFB260] hover:text-[#120B21] rounded-xl border border-[#DFB260]/30 text-[11px] text-[#FFF2A8] transition-all duration-200 font-semibold cursor-pointer flex items-center justify-between group"
                >
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#F5D77F] group-hover:text-[#120B21]" />
                    <span>Draft Letter</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => onSelectView('inheritance')}
                  className="p-2.5 bg-[#120B21]/80 hover:bg-[#DFB260] hover:text-[#120B21] rounded-xl border border-[#DFB260]/30 text-[11px] text-[#FFF2A8] transition-all duration-200 font-semibold cursor-pointer flex items-center justify-between group"
                >
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#F5D77F] group-hover:text-[#120B21]" />
                    <span>Inheritance Switch</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>

                <button
                  onClick={() => onSelectView('memorials')}
                  className="p-2.5 bg-[#120B21]/80 hover:bg-[#DFB260] hover:text-[#120B21] rounded-xl border border-[#DFB260]/30 text-[11px] text-[#FFF2A8] transition-all duration-200 font-semibold cursor-pointer flex items-center justify-between group"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#F5D77F] group-hover:text-[#120B21]" />
                    <span>View Shrines</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-70 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              <button
                id="btn-open-ai-concierge-chat"
                onClick={onOpenConcierge}
                className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-[#DFB260]/20 via-[#F5D77F]/30 to-[#DFB260]/20 hover:from-[#DFB260] hover:to-[#F5D77F] rounded-xl border border-[#DFB260] text-xs text-[#FFF2A8] hover:text-[#120B21] transition-all duration-200 font-bold cursor-pointer group mt-2"
              >
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#F5D77F] group-hover:text-[#120B21]" />
                  <span>Launch Interactive AI Concierge Chat</span>
                </span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Bottom Status Bar */}
      <div id="status-bar-bottom" className="fixed bottom-0 left-0 right-0 z-30 bg-[#120B21]/95 backdrop-blur-md text-[#C8B1E4] border-t border-[#DFB260]/30 px-4 py-2.5 font-mono text-[11px]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 uppercase tracking-widest">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-2 text-[#FFF2A8] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ARWEAVE_NODE // ONLINE
            </span>
            <span className="hidden md:inline text-[#DFB260]/40">|</span>
            <span className="hidden md:inline text-[#C8B1E4]">
              AES-256 CLIENT ENCRYPTION VERIFIED
            </span>
          </div>

          <div className="flex items-center space-x-4 text-[#C8B1E4] font-bold">
            <span>LATENCY: <strong className="text-emerald-400">14MS</strong></span>
            <span>TX_SYNC: <strong className="text-[#FFF2A8]">100%</strong></span>
          </div>
        </div>
      </div>

    </div>
  );
};

