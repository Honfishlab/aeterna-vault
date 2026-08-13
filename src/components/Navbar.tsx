import React, { useState } from 'react';
import { ViewMode, WalletState, UserProfile } from '../types';
import { AeternaLogo } from './AeternaLogo';
import { GlobalImportIndicator } from './GlobalImportIndicator';
import { Archive, BookOpen, ChevronDown, HardDrive, Home, Images, Lock, Menu, Plus, Search, Settings, Trash2, UserCheck, Users, Wallet, X } from 'lucide-react';

interface NavbarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  walletState: WalletState;
  onOpenWallet: () => void;
  onOpenUpload: () => void;
  onOpenVideoRecorder?: () => void;
  onOpenExportModal?: () => void;
  currentUser: UserProfile | null;
  onOpenAuth: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
}

const primaryItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'search', label: 'Memories', icon: Images },
  { id: 'legacy', label: 'Letters', icon: BookOpen },
  { id: 'inheritance', label: 'Family Access', icon: Users },
  { id: 'immortal', label: 'Vault Security', icon: Archive },
];

const moreItems: { id: ViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'memorials', label: 'Memorials', icon: Images },
  { id: 'locker', label: 'Important Documents', icon: Lock },
  { id: 'imports', label: 'Activity & Archive Status', icon: Archive },
  { id: 'storage', label: 'Storage', icon: HardDrive },
  { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
  { id: 'pricing', label: 'Plans', icon: ChevronDown },
  { id: 'account', label: 'Account', icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({ currentView, onSelectView, walletState, onOpenWallet, onOpenUpload, currentUser, onOpenAuth, searchQuery, onSearchChange, onSearchSubmit }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const select = (view: ViewMode) => { onSelectView(view); setMoreOpen(false); };

  return <>
    <header id="main-header" className="sticky top-0 z-40 border-b border-[#DFB260]/25 bg-[#120B21]/95 text-[#E8DDF5] backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-3 px-4 sm:px-6">
        <button onClick={() => select('dashboard')} className="flex min-h-11 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFF2A8]" aria-label="Aeterna Vault home">
          <AeternaLogo size="md" showTitle={false} className="shrink-0" />
          <span className="hidden text-xl font-bold tracking-[0.18em] text-[#FFF2A8] xl:block">AETERNA</span>
        </button>

        <nav aria-label="Primary navigation" className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {primaryItems.map(item => { const Icon=item.icon; const active=currentView===item.id; return <button key={item.id} id={`nav-link-${item.id}`} onClick={() => select(item.id)} className={`flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition ${active?'border border-[#DFB260]/45 bg-[#DFB260]/15 text-[#FFF2A8]':'text-[#D8CCE8] hover:bg-white/5 hover:text-white'}`}><Icon className="h-4 w-4"/><span className="hidden lg:inline">{item.label}</span></button>; })}
          <div className="relative">
            <button aria-expanded={moreOpen} aria-haspopup="menu" onClick={() => setMoreOpen(value=>!value)} className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-[#D8CCE8] hover:bg-white/5 hover:text-white"><Menu className="h-4 w-4"/>More</button>
            {moreOpen && <div role="menu" className="absolute right-0 top-12 w-64 rounded-2xl border border-[#DFB260]/35 bg-[#120B21] p-2 shadow-2xl">
              {moreItems.map(item => {const Icon=item.icon; return <button role="menuitem" key={item.id} onClick={()=>select(item.id)} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#E8DDF5] hover:bg-[#DFB260]/15"><Icon className="h-4 w-4 text-[#F5D77F]"/>{item.label}</button>;})}
              <button role="menuitem" onClick={onOpenWallet} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-[#E8DDF5] hover:bg-[#DFB260]/15"><Wallet className="h-4 w-4 text-[#F5D77F]"/>Archive wallet {walletState.isConnected?'connected':''}</button>
            </div>}
          </div>
        </nav>

        <form onSubmit={onSearchSubmit} className="hidden w-52 2xl:block"><label className="sr-only" htmlFor="vault-search">Search your vault</label><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-[#C8B1E4]"/><input id="vault-search" value={searchQuery} onChange={e=>onSearchChange(e.target.value)} placeholder="Search your vault" className="min-h-11 w-full rounded-xl border border-[#DFB260]/30 bg-[#0A0514]/75 pl-9 pr-3 text-sm text-white placeholder:text-[#B7A7CB] focus:border-[#F5D77F] focus:outline-none"/></div></form>
        <GlobalImportIndicator enabled={Boolean(currentUser)} onOpen={onOpenUpload}/>
        <button id="btn-quick-new-memory" onClick={onOpenUpload} className="hidden min-h-11 items-center gap-2 rounded-xl bg-[#F5D77F] px-4 text-sm font-bold text-[#120B21] shadow-lg hover:bg-[#FFF2A8] sm:flex"><Plus className="h-4 w-4"/>Add memory</button>
        <button id="btn-user-profile" onClick={onOpenAuth} aria-label={currentUser?'Open account':'Sign in'} className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-[#DFB260]/35 bg-[#1A0C33] px-3 text-sm text-[#FFF2A8]">
          {currentUser?<><span className="grid h-7 w-7 place-items-center rounded-full bg-[#F5D77F] font-bold text-[#120B21]">{currentUser.name[0]}</span><span className="hidden xl:inline">{currentUser.name}</span><UserCheck className="h-4 w-4 text-emerald-400"/></>:<>Sign in</>}
        </button>
      </div>
    </header>

    <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#DFB260]/30 bg-[#120B21]/98 px-1 pb-[max(env(safe-area-inset-bottom),0.25rem)] pt-1 backdrop-blur-xl md:hidden">
      {[primaryItems[0],primaryItems[1]].map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>select(item.id)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs ${currentView===item.id?'bg-[#DFB260]/15 text-[#FFF2A8]':'text-[#C8B1E4]'}`}><Icon className="h-5 w-5"/>{item.label}</button>})}
      <button onClick={onOpenUpload} className="mx-auto -mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#F5D77F] text-[#120B21] shadow-xl" aria-label="Add memory"><Plus className="h-6 w-6"/></button>
      <button onClick={()=>select('inheritance')} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs ${currentView==='inheritance'?'bg-[#DFB260]/15 text-[#FFF2A8]':'text-[#C8B1E4]'}`}><Users className="h-5 w-5"/>Family</button>
      <button onClick={()=>setMoreOpen(true)} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs text-[#C8B1E4]"><Menu className="h-5 w-5"/>More</button>
    </nav>

    {moreOpen && <div className="fixed inset-0 z-[60] flex items-end bg-black/65 p-3 md:hidden" onClick={()=>setMoreOpen(false)}><div role="dialog" aria-modal="true" aria-label="More destinations" onClick={e=>e.stopPropagation()} className="max-h-[75vh] w-full overflow-auto rounded-3xl border border-[#DFB260]/35 bg-[#120B21] p-4 pb-8 shadow-2xl"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold text-[#FFF2A8]">More</h2><button onClick={()=>setMoreOpen(false)} aria-label="Close more menu" className="grid h-11 w-11 place-items-center rounded-xl bg-white/5"><X className="h-5 w-5"/></button></div>{[...primaryItems.slice(2),...moreItems].map(item=>{const Icon=item.icon;return <button key={item.id} onClick={()=>select(item.id)} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-[#E8DDF5] hover:bg-[#DFB260]/15"><Icon className="h-5 w-5 text-[#F5D77F]"/>{item.label}</button>})}<button onClick={onOpenWallet} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-base text-[#E8DDF5]"><Wallet className="h-5 w-5 text-[#F5D77F]"/>Archive wallet</button></div></div>}
  </>;
};
