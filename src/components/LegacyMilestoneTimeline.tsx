import React, { useState } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Users, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Lock, 
  Heart, 
  Hourglass,
  Edit3,
  Globe,
  Star,
  Info
} from 'lucide-react';
import { UserProfile, ViewMode } from '../types';

interface MilestoneItem {
  id: string;
  yearsFromOrigin: number;
  title: string;
  anniversaryType: string;
  generationalTag: string;
  description: string;
  status: 'achieved' | 'current' | 'upcoming';
  icon: 'award' | 'sparkles' | 'shield' | 'users' | 'heart' | 'hourglass' | 'star';
  heirAccessLevel: string;
  permawebProofTx?: string;
  customNote?: string;
}

interface LegacyMilestoneTimelineProps {
  currentUser: UserProfile | null;
  memoriesCount: number;
  heirsCount?: number;
  onOpenUpload?: () => void;
  onSelectView?: (view: ViewMode) => void;
}

export const LegacyMilestoneTimeline: React.FC<LegacyMilestoneTimelineProps> = ({
  currentUser,
  memoriesCount,
  heirsCount = 2,
  onOpenUpload,
  onSelectView
}) => {
  const currentYear = new Date().getFullYear();
  const [originYear, setOriginYear] = useState<number>(1924); // Default family legacy origin year
  const [isEditingOrigin, setIsEditingOrigin] = useState<boolean>(false);
  const [tempOriginInput, setTempOriginInput] = useState<string>('1924');
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneItem | null>(null);
  const [filterEra, setFilterEra] = useState<'all' | 'achieved' | 'upcoming'>('all');
  
  // Custom user added milestones state
  const [customMilestones, setCustomMilestones] = useState<MilestoneItem[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState('');
  const [newYear, setNewYear] = useState('2026');
  const [newGenTag, setNewGenTag] = useState('Gen II (Children)');
  const [newDesc, setNewDesc] = useState('');

  const totalPreservedYears = Math.max(0, currentYear - originYear);

  // Pre-defined Generational Anniversaries
  const defaultMilestones: MilestoneItem[] = [
    {
      id: 'm-genesis',
      yearsFromOrigin: 0,
      title: 'Family Foundation & First Archives',
      anniversaryType: 'Genesis Anchor',
      generationalTag: 'Gen I (Founders)',
      description: 'The inception of the family heritage record. Earliest digitized photos, handwritten letters, and marriage certificates secured in AES-256 vault.',
      status: 'achieved',
      icon: 'star',
      heirAccessLevel: 'Owner & Full Admins',
      permawebProofTx: 'ar_0x8f9a2b7c4d3e1'
    },
    {
      id: 'm-25',
      yearsFromOrigin: 25,
      title: 'Quarter-Century Silver Heritage',
      anniversaryType: '25-Year Anniversary',
      generationalTag: 'Gen I (Founders)',
      description: 'First major generational milestone. 25 years of family milestone logs, home videos, and oral history recordings sealed onto Arweave.',
      status: 'achieved',
      icon: 'award',
      heirAccessLevel: 'Primary Heirs Unlocked',
      permawebProofTx: 'ar_0x12d3e4f5a6b7'
    },
    {
      id: 'm-50',
      yearsFromOrigin: 50,
      title: 'Golden Jubilee Half-Century Node',
      anniversaryType: '50-Year Jubilee',
      generationalTag: 'Gen II (Children)',
      description: 'Golden Jubilee celebration. AI Ancestral Voice Synthesis vectors trained and sealed for future generations to converse with family history.',
      status: 'achieved',
      icon: 'sparkles',
      heirAccessLevel: 'All Heirs & Trustees',
      permawebProofTx: 'ar_0x99a8b7c6d5e4'
    },
    {
      id: 'm-75',
      yearsFromOrigin: 75,
      title: 'Diamond Epoch & Multi-Sig Legacy',
      anniversaryType: '75-Year Epoch',
      generationalTag: 'Gen II (Children)',
      description: '75 years of continuous family history preservation. Automated Dead Man Switch multi-sig consensus trigger activated.',
      status: totalPreservedYears >= 75 ? 'achieved' : 'current',
      icon: 'shield',
      heirAccessLevel: 'Multi-Sig Consensus',
      permawebProofTx: 'ar_0x77c6b5a4d3e2'
    },
    {
      id: 'm-100',
      yearsFromOrigin: 100,
      title: 'Centennial Eternal Vault Guarantee',
      anniversaryType: '100-Year Centennial',
      generationalTag: 'Gen III (Grandchildren)',
      description: 'One full century of family preservation. Perpetual block endowment auto-renews lifetime Arweave storage for 1,000+ years.',
      status: totalPreservedYears >= 100 ? 'achieved' : (totalPreservedYears >= 75 ? 'current' : 'upcoming'),
      icon: 'hourglass',
      heirAccessLevel: 'Universal Lineage Access',
      permawebProofTx: 'ar_0x100centennial_proof'
    },
    {
      id: 'm-150',
      yearsFromOrigin: 150,
      title: 'Sesquicentennial Ancestral Shrine',
      anniversaryType: '150-Year Sesquicentennial',
      generationalTag: 'Gen III (Grandchildren)',
      description: '150 years of uninterrupted heritage records. Automated holographic digital shrine deployment across global Arweave nodes.',
      status: 'upcoming',
      icon: 'heart',
      heirAccessLevel: 'Public Ancestral Tribute Option'
    },
    {
      id: 'm-250',
      yearsFromOrigin: 250,
      title: 'Sovereign Quarter-Millennium Epoch',
      anniversaryType: '250-Year Sovereign Node',
      generationalTag: 'Gen IV+ (Future Generations)',
      description: '250 years of family immortality. Sovereign AI historian auto-curates a multi-volume digital encyclopedia of family achievements.',
      status: 'upcoming',
      icon: 'star',
      heirAccessLevel: 'Eternal Lineage Trust'
    }
  ];

  const allMilestones = [...defaultMilestones, ...customMilestones].sort((a, b) => a.yearsFromOrigin - b.yearsFromOrigin);

  const filteredMilestones = allMilestones.filter(m => {
    if (filterEra === 'achieved') return m.status === 'achieved';
    if (filterEra === 'upcoming') return m.status === 'upcoming' || m.status === 'current';
    return true;
  });

  const handleSaveOrigin = () => {
    const yr = parseInt(tempOriginInput, 10);
    if (!isNaN(yr) && yr >= 1800 && yr <= currentYear) {
      setOriginYear(yr);
      setIsEditingOrigin(false);
    }
  };

  const handleAddCustomMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    const eventYr = parseInt(newYear, 10) || currentYear;
    const calcYearsFromOrigin = Math.max(0, eventYr - originYear);

    const newItem: MilestoneItem = {
      id: `custom-${Date.now()}`,
      yearsFromOrigin: calcYearsFromOrigin,
      title: newTitle || 'Custom Family Milestone',
      anniversaryType: `${eventYr} Custom Record`,
      generationalTag: newGenTag,
      description: newDesc || 'Recorded into the sovereign family timeline.',
      status: eventYr <= currentYear ? 'achieved' : 'upcoming',
      icon: 'sparkles',
      heirAccessLevel: 'All Vault Family Members',
      permawebProofTx: `ar_0x${Math.random().toString(16).slice(2, 12)}`
    };

    setCustomMilestones(prev => [...prev, newItem]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const getIcon = (type: MilestoneItem['icon']) => {
    switch (type) {
      case 'award': return <Award className="w-5 h-5 text-[#F5D77F]" />;
      case 'sparkles': return <Sparkles className="w-5 h-5 text-[#F5D77F]" />;
      case 'shield': return <ShieldCheck className="w-5 h-5 text-emerald-400" />;
      case 'users': return <Users className="w-5 h-5 text-[#C8B1E4]" />;
      case 'heart': return <Heart className="w-5 h-5 text-rose-400" />;
      case 'hourglass': return <Hourglass className="w-5 h-5 text-[#FFF2A8]" />;
      case 'star': default: return <Star className="w-5 h-5 text-[#F5D77F]" />;
    }
  };

  return (
    <div id="legacy-milestone-timeline" className="cosmic-card p-6 sm:p-8 space-y-8 relative overflow-hidden shadow-2xl border border-[#DFB260]/40">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#DFB260]/30 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-[11px] font-mono font-bold uppercase tracking-widest text-[#F5D77F] mb-1.5">
            <Clock className="w-3.5 h-3.5 text-[#F5D77F]" />
            <span>Generational Timeline Engine</span>
            <span className="text-[#DFB260]/40">•</span>
            <span className="text-emerald-400">{totalPreservedYears} Years Active Preservation</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8] tracking-tight">
            Family Legacy Milestone Tracker
          </h2>
          <p className="text-xs text-[#C8B1E4] mt-1 max-w-xl leading-relaxed">
            Tracking major generational anniversaries and multi-century preservation milestones across the Arweave permaweb.
          </p>
        </div>

        {/* Origin Year Counter Control */}
        <div className="bg-[#120B21] border border-[#DFB260]/40 p-4 rounded-2xl flex items-center space-x-4 shrink-0 shadow-inner">
          <div className="text-center pr-3 border-r border-[#DFB260]/20">
            <span className="text-[10px] font-mono uppercase text-[#C8B1E4]/70 block font-semibold">Origin Era</span>
            {isEditingOrigin ? (
              <div className="flex items-center space-x-1 mt-1">
                <input
                  type="number"
                  value={tempOriginInput}
                  onChange={(e) => setTempOriginInput(e.target.value)}
                  className="w-16 bg-[#1F103A] border border-[#F5D77F] text-[#FFF2A8] text-xs font-mono px-1.5 py-0.5 rounded focus:outline-none"
                  min="1800"
                  max={currentYear}
                />
                <button
                  onClick={handleSaveOrigin}
                  className="bg-[#DFB260] text-[#120B21] text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1 mt-0.5">
                <span className="text-lg font-cinzel font-bold text-[#FFF2A8]">{originYear}</span>
                <button
                  onClick={() => {
                    setTempOriginInput(originYear.toString());
                    setIsEditingOrigin(true);
                  }}
                  className="text-[#DFB260] hover:text-white transition-colors cursor-pointer p-0.5"
                  title="Change family origin year"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <div className="text-center">
            <span className="text-[10px] font-mono uppercase text-[#C8B1E4]/70 block font-semibold">Years Preserved</span>
            <span className="text-xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FFF2A8] via-[#F5D77F] to-[#DFB260]">
              {totalPreservedYears} Yrs
            </span>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="gold-filled-btn text-[11px] px-3.5 py-2 flex items-center space-x-1.5 cursor-pointer shadow-md ml-2"
            title="Add custom family anniversary milestone"
          >
            <Plus className="w-3.5 h-3.5 text-[#120B21]" />
            <span className="hidden sm:inline">Add Milestone</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Era Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#120B21]/70 p-3 rounded-2xl border border-[#DFB260]/20 text-xs">
        <div className="flex items-center space-x-1 bg-[#1A0C33] p-1 rounded-xl border border-[#DFB260]/20">
          <button
            onClick={() => setFilterEra('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterEra === 'all' 
                ? 'bg-[#DFB260] text-[#120B21] shadow-sm' 
                : 'text-[#C8B1E4] hover:text-white'
            }`}
          >
            All Anniversaries ({allMilestones.length})
          </button>
          <button
            onClick={() => setFilterEra('achieved')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterEra === 'achieved' 
                ? 'bg-emerald-500 text-slate-950 shadow-sm' 
                : 'text-[#C8B1E4] hover:text-white'
            }`}
          >
            Achieved ({allMilestones.filter(m => m.status === 'achieved').length})
          </button>
          <button
            onClick={() => setFilterEra('upcoming')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
              filterEra === 'upcoming' 
                ? 'bg-[#7336b4] text-white shadow-sm' 
                : 'text-[#C8B1E4] hover:text-white'
            }`}
          >
            Future Horizons ({allMilestones.filter(m => m.status !== 'achieved').length})
          </button>
        </div>

        <div className="flex items-center space-x-4 text-[11px] text-[#C8B1E4]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span>Achieved</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F5D77F] animate-ping"></span>
            <span>Active Target</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600"></span>
            <span>Future Epoch</span>
          </span>
        </div>
      </div>

      {/* HORIZONTAL TIMELINE PREVIEW BAR */}
      <div className="relative py-6 px-2 overflow-x-auto scrollbar-thin">
        {/* Continuous Golden Track Line */}
        <div className="absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-emerald-500 via-[#DFB260] to-[#381B68] rounded-full -translate-y-1/2 z-0"></div>

        <div className="flex items-center justify-between min-w-[700px] relative z-10 space-x-6 px-4">
          {allMilestones.map((m) => {
            const milestoneYear = originYear + m.yearsFromOrigin;
            const isAchieved = m.status === 'achieved';
            const isCurrent = m.status === 'current';

            return (
              <div
                key={m.id}
                onClick={() => setSelectedMilestone(m)}
                className="flex flex-col items-center group cursor-pointer"
              >
                {/* Year Label Above */}
                <span className={`text-[11px] font-mono font-bold mb-2 transition-transform group-hover:scale-110 ${
                  isAchieved ? 'text-emerald-300' : isCurrent ? 'text-[#FFF2A8]' : 'text-[#C8B1E4]/60'
                }`}>
                  {milestoneYear}
                </span>

                {/* Node Circle */}
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border-2 shadow-lg ${
                  isAchieved 
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 group-hover:bg-emerald-800' 
                    : isCurrent 
                    ? 'bg-[#2A184A] border-[#F5D77F] text-[#FFF2A8] animate-bounce shadow-[0_0_20px_rgba(245,215,127,0.5)]' 
                    : 'bg-[#120B21] border-[#DFB260]/30 text-slate-500 group-hover:border-[#DFB260]'
                }`}>
                  {getIcon(m.icon)}
                </div>

                {/* Milestone Badge Below */}
                <div className="mt-2 text-center max-w-[90px]">
                  <span className={`text-[10px] font-semibold block truncate ${
                    isAchieved ? 'text-emerald-200' : 'text-[#C8B1E4]'
                  }`}>
                    {m.anniversaryType}
                  </span>
                  <span className="text-[9px] font-mono text-[#F5D77F]/70 block">
                    +{m.yearsFromOrigin} Yrs
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED MILESTONE CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMilestones.map((milestone) => {
          const milestoneYear = originYear + milestone.yearsFromOrigin;
          const isAchieved = milestone.status === 'achieved';
          const isCurrent = milestone.status === 'current';

          return (
            <div
              key={milestone.id}
              onClick={() => setSelectedMilestone(milestone)}
              className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between group relative overflow-hidden ${
                isAchieved 
                  ? 'bg-[#141d24]/90 border-emerald-500/40 hover:border-emerald-400 shadow-md' 
                  : isCurrent 
                  ? 'bg-[#1e1335]/95 border-[#F5D77F] shadow-[0_0_25px_rgba(245,215,127,0.2)]' 
                  : 'bg-[#120B21]/80 border-[#DFB260]/20 hover:border-[#DFB260]/50'
              }`}
            >
              {/* Card Top Row */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <div className={`p-2 rounded-xl ${
                      isAchieved ? 'bg-emerald-900/60 text-emerald-300' : 'bg-[#28134D] text-[#F5D77F]'
                    }`}>
                      {getIcon(milestone.icon)}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#F5D77F] block">
                        {milestone.generationalTag}
                      </span>
                      <span className="text-xs font-mono font-bold text-[#FFF2A8]">
                        Year {milestoneYear} (+{milestone.yearsFromOrigin} Yrs)
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-semibold ${
                    isAchieved 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40' 
                      : isCurrent 
                      ? 'bg-[#DFB260]/30 text-[#FFF2A8] border border-[#DFB260]' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isAchieved ? '✓ Achieved' : isCurrent ? '★ Current Horizon' : 'Upcoming'}
                  </span>
                </div>

                <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors leading-snug">
                  {milestone.title}
                </h3>

                <p className="text-xs text-[#C8B1E4]/80 mt-2 line-clamp-3 leading-relaxed">
                  {milestone.description}
                </p>
              </div>

              {/* Card Bottom Meta */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-[#C8B1E4]">
                <span className="flex items-center gap-1 font-mono text-[10px] text-[#F5D77F]">
                  <Lock className="w-3 h-3" /> {milestone.heirAccessLevel}
                </span>

                <span className="flex items-center gap-1 text-[#FFF2A8] group-hover:translate-x-1 transition-transform font-bold text-[11px]">
                  <span>Inspect</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#F5D77F]" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* SELECTED MILESTONE MODAL / DRAWER */}
      {selectedMilestone && (
        <div className="fixed inset-0 z-50 bg-[#0a0414]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card-gold max-w-xl w-full p-6 sm:p-8 space-y-6 border border-[#DFB260] shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-start justify-between border-b border-[#DFB260]/30 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-[#DFB260] text-[#120B21] rounded-2xl flex items-center justify-center font-bold shadow-md">
                  {getIcon(selectedMilestone.icon)}
                </div>
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#F5D77F] font-bold tracking-wider block">
                    {selectedMilestone.generationalTag} // {selectedMilestone.anniversaryType}
                  </span>
                  <h3 className="text-2xl font-cinzel font-bold text-[#FFF2A8]">
                    {selectedMilestone.title}
                  </h3>
                </div>
              </div>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="text-[#C8B1E4] hover:text-white text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-[#E8DDF5]">
              <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#C8B1E4]">Milestone Calendar Year:</span>
                  <span className="text-[#FFF2A8] font-bold">{originYear + selectedMilestone.yearsFromOrigin} (+{selectedMilestone.yearsFromOrigin} Years)</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#C8B1E4]">Preservation Status:</span>
                  <span className="text-emerald-300 font-bold uppercase">{selectedMilestone.status}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-[#C8B1E4]">Heir Access Rights:</span>
                  <span className="text-[#F5D77F] font-bold">{selectedMilestone.heirAccessLevel}</span>
                </div>
                {selectedMilestone.permawebProofTx && (
                  <div className="flex items-center justify-between text-[11px] font-mono border-t border-[#DFB260]/20 pt-2">
                    <span className="text-[#C8B1E4]">Arweave Permaweb TX:</span>
                    <span className="text-emerald-400 font-mono truncate max-w-[200px]">{selectedMilestone.permawebProofTx}</span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-cinzel font-bold text-sm text-[#FFF2A8] mb-1">Preservation Overview</h4>
                <p className="leading-relaxed text-[#C8B1E4]">
                  {selectedMilestone.description}
                </p>
              </div>

              <div className="bg-[#1F103A] p-4 rounded-2xl border border-[#DFB260]/20 space-y-2">
                <div className="flex items-center space-x-2 text-[#F5D77F] font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>AI Vault Curation & Multi-Sig Directive</span>
                </div>
                <p className="text-[11px] text-[#C8B1E4] leading-relaxed">
                  Upon reaching Year {originYear + selectedMilestone.yearsFromOrigin}, the Aeterna Gemini AI Engine automatically compiles all media entries, verifies dead man's switch consensus across active heirs ({heirsCount} configured), and generates an immutable ancestral summary.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#DFB260]/30">
              {onOpenUpload && (
                <button
                  onClick={() => {
                    setSelectedMilestone(null);
                    onOpenUpload();
                  }}
                  className="gold-filled-btn text-xs px-5 py-2.5 flex items-center space-x-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-[#120B21]" />
                  <span>Attach Memory Entry</span>
                </button>
              )}
              <button
                onClick={() => setSelectedMilestone(null)}
                className="bg-[#28134D] hover:bg-[#381B68] text-[#F5D77F] border border-[#DFB260]/40 text-xs px-5 py-2.5 rounded-xl font-bold cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ADD CUSTOM MILESTONE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#0a0414]/85 backdrop-blur-md flex items-center justify-center p-4">
          <form 
            onSubmit={handleAddCustomMilestone}
            className="cosmic-card-gold max-w-lg w-full p-6 space-y-5 border border-[#DFB260] shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-3">
              <div className="flex items-center space-x-2 text-[#FFF2A8]">
                <Plus className="w-5 h-5 text-[#F5D77F]" />
                <h3 className="text-xl font-cinzel font-bold">Record Generational Milestone</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#C8B1E4] hover:text-white cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Milestone Title / Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grandparents 50th Golden Wedding Anniversary"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#E8DDF5] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Calendar Year</label>
                  <input
                    type="number"
                    required
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#E8DDF5] focus:outline-none focus:border-[#F5D77F]"
                  />
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Generational Tag</label>
                  <select
                    value={newGenTag}
                    onChange={(e) => setNewGenTag(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#E8DDF5] focus:outline-none focus:border-[#F5D77F]"
                  >
                    <option value="Gen I (Founders)">Gen I (Founders)</option>
                    <option value="Gen II (Children)">Gen II (Children)</option>
                    <option value="Gen III (Grandchildren)">Gen III (Grandchildren)</option>
                    <option value="Gen IV (Great-Grandchildren)">Gen IV (Great-Grandchildren)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Description & Family Context</label>
                <textarea
                  rows={3}
                  placeholder="Describe the significance of this anniversary for future heirs..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#E8DDF5] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#DFB260]/30">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-[#C8B1E4] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gold-filled-btn text-xs px-6 py-2.5 font-bold cursor-pointer"
              >
                Save Milestone
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
