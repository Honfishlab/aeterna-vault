import React, { useState } from 'react';
import { ViewMode, WalletState, UserProfile } from '../types';
import { AeternaLogo } from './AeternaLogo';
import { GlobalImportIndicator } from './GlobalImportIndicator';
import { 
  Shield, 
  Search, 
  Wallet, 
  User, 
  Users,
  Bell, 
  Database, 
  Sparkles, 
  Layers, 
  BookOpen, 
  Award, 
  PlusCircle,
  CheckCircle2,
  Lock,
  ChevronDown,
  Globe,
  LogIn,
  UserCheck,
  FileCheck,
  Video,
  Archive,
  Download,
  History,
  Trash2,
  HardDrive,
  Settings
} from 'lucide-react';

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

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onSelectView,
  walletState,
  onOpenWallet,
  onOpenUpload,
  onOpenVideoRecorder,
  onOpenExportModal,
  currentUser,
  onOpenAuth,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: ViewMode; label: string; icon: any }[] = [
    { id: 'landing', label: 'Landing', icon: Shield },
    { id: 'dashboard', label: 'Dashboard', icon: Layers },
    { id: 'imports', label: 'Audit', icon: History },
    { id: 'recycle', label: 'Recycle Bin', icon: Trash2 },
    { id: 'storage', label: 'Storage', icon: HardDrive },
    { id: 'account', label: 'Account', icon: Settings },
    { id: 'immortal', label: 'Immortal Gateway', icon: Globe },
    { id: 'inheritance', label: 'Inheritance Protocol', icon: Users },
    { id: 'legacy', label: 'Time Capsule', icon: BookOpen },
    { id: 'memorials', label: 'Memorials', icon: Sparkles },
    { id: 'locker', label: 'Legacy Locker', icon: Lock },
    { id: 'pricing', label: 'Plans & Pricing', icon: Award },
    { id: 'empty', label: 'New Vault', icon: PlusCircle },
  ];
  const sideNavIds = new Set<ViewMode>(['legacy', 'memorials', 'locker']);
  const vaultNavIds = new Set<ViewMode>(['imports', 'storage', 'account']);
  const adminNavIds = new Set<ViewMode>(['pricing', 'recycle']);
  const sideNavItems = navItems.filter(item => sideNavIds.has(item.id));
  const vaultNavItems = navItems.filter(item => vaultNavIds.has(item.id));
  const adminNavItems = navItems.filter(item => adminNavIds.has(item.id));

  return (
    <>
    <header id="main-header" className="sticky top-0 z-40 bg-[#120B21]/95 backdrop-blur-xl border-b border-[#DFB260]/30 text-[#E8DDF5]">
      <div className="w-full max-w-[1850px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-20 sm:h-24">
          
          {/* Logo Brand on Far Left */}
          <div 
            className="flex items-center space-x-3.5 sm:space-x-5 cursor-pointer group py-2 pr-4 sm:pr-8" 
            onClick={() => onSelectView(currentUser ? 'dashboard' : 'landing')}
          >
            <AeternaLogo size="md" showTitle={false} className="transition-transform duration-300 group-hover:scale-105 shrink-0" />
            <div className="hidden min-[1280px]:block">
              <div className="flex items-center space-x-2.5">
                <span className="font-cinzel font-bold text-xl sm:text-2xl md:text-3xl tracking-[0.22em] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF8D0] via-[#F5D77F] to-[#B88E4C] drop-shadow-[0_2px_12px_rgba(223,178,96,0.35)]">
                  AETERNA
                </span>
                <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest px-2.5 py-0.5 rounded-md bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40 shadow-[0_0_10px_rgba(223,178,96,0.2)]">
                  VAULT
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#C8B1E4]/85 tracking-widest uppercase flex items-center gap-2 font-mono mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                PERMAWEB // IMMORTAL
              </p>
            </div>
          </div>

          {/* Quick Search Input */}
          <form onSubmit={onSearchSubmit} className="hidden min-[1600px]:flex items-center flex-1 max-w-[220px] mx-3">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3.5 top-2.5 text-[#C8B1E4]/60" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search memories, tags, permaweb..."
                className="w-full bg-[#1A0C33]/80 border border-[#DFB260]/30 rounded-xl pl-9 pr-4 py-1.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] focus:ring-1 focus:ring-[#F5D77F]/30 transition-all font-sans shadow-inner"
              />
            </div>
          </form>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSideItem = sideNavIds.has(item.id) || vaultNavIds.has(item.id) || adminNavIds.has(item.id);
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  aria-label={item.label}
                  title={item.label}
                  onClick={() => onSelectView(item.id)}
                  className={`${isSideItem ? "hidden" : "flex"} items-center space-x-1 px-1.5 min-[1200px]:px-2 py-1.5 text-[11px] font-semibold rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-[#DFB260]/20 to-[#7353A0]/30 text-[#FFF2A8] border border-[#DFB260]/50 shadow-[0_0_12px_rgba(223,178,96,0.2)]'
                      : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8] hover:bg-[#1A0C33]/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F5D77F]' : 'text-[#C8B1E4]/70'}`} />
                  <span className="hidden min-[1200px]:inline font-sans">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <GlobalImportIndicator enabled={Boolean(currentUser)} onOpen={onOpenUpload} />
            {/* Record Video Camera Button */}
            {onOpenVideoRecorder && (
              <button
                id="btn-quick-record-video"
                onClick={onOpenVideoRecorder}
                className="hidden min-[1600px]:flex items-center space-x-1.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-semibold px-3.5 py-2 text-xs rounded-xl shadow-md border border-amber-400/40 transition-all cursor-pointer active:scale-95"
                title="Turn on camera for live video or photo capture"
              >
                <Video className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
                <span>Live Record</span>
              </button>
            )}

            {/* Vault Backup Export Button */}
            {onOpenExportModal && (
              <button
                id="btn-vault-export-backup"
                onClick={onOpenExportModal}
                className="hidden min-[1600px]:flex items-center space-x-1.5 bg-[#0A0514] hover:bg-[#1A0C33] text-[#F5D77F] border border-[#DFB260]/40 font-semibold px-3 py-2 text-xs rounded-xl shadow transition-all cursor-pointer active:scale-95"
                title="Generate & Download Vault JSON Backup"
              >
                <Archive className="w-3.5 h-3.5 text-[#F5D77F]" />
                <span>Vault Export</span>
              </button>
            )}

            {/* New Memory Button */}
            <button
              id="btn-quick-new-memory"
              onClick={onOpenUpload}
              className="hidden sm:flex items-center space-x-1.5 gold-filled-btn px-4 py-2 text-xs cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#120B21]" />
              <span className="hidden min-[1500px]:inline">+ New Memory</span>
            </button>

            {/* Wallet Connect button */}
            <button
              id="btn-wallet-connect"
              onClick={onOpenWallet}
              className={`flex lg:hidden items-center space-x-2 px-3 py-1.5 text-xs rounded-xl border transition-all cursor-pointer ${
                walletState.isConnected
                  ? 'bg-[#1A0C33] border-[#DFB260]/40 text-[#F5D77F] hover:bg-[#28134D]'
                  : 'bg-gradient-to-r from-[#7353A0] to-[#381B68] border-[#DFB260]/30 text-white hover:border-[#DFB260]/60'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span className="font-mono text-xs font-semibold">
                {walletState.isConnected
                  ? `${walletState.address.substring(0, 6)}...${walletState.address.substring(walletState.address.length - 4)}`
                  : 'Wallet'}
              </span>
              {walletState.isConnected && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              )}
            </button>

            {/* Profile Avatar & Sign In Control */}
            <div className="flex items-center space-x-2 pl-2 border-l border-[#DFB260]/20">
              {currentUser ? (
                <button
                  id="btn-user-profile"
                  onClick={onOpenAuth}
                  className="flex items-center space-x-2 bg-[#1A0C33] hover:bg-[#28134D] border border-[#DFB260]/40 px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                  title="Manage Vault Identity & Session"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#DFB260] to-[#FFF2A8] text-[#120B21] font-bold flex items-center justify-center text-[10px]">
                    {currentUser.name.substring(0, 1).toUpperCase()}
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="font-bold text-[#FFF2A8] text-[11px] leading-none">{currentUser.name}</div>
                    <div className="text-[9px] text-[#F5D77F] font-mono font-semibold">{currentUser.role}</div>
                  </div>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              ) : (
                <button
                  id="btn-sign-in"
                  onClick={onOpenAuth}
                  className="flex items-center space-x-1.5 gold-beveled-btn px-3.5 py-1.5 text-xs font-semibold text-[#FFF2A8] cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F5D77F]" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        <div className="md:hidden flex items-center justify-between py-2 border-t border-[#DFB260]/20 overflow-x-auto space-x-1 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectView(item.id)}
                className={`whitespace-nowrap flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                  isActive
                    ? 'bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 font-semibold'
                    : 'text-[#C8B1E4]/70 hover:text-[#FFF2A8]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
      <aside className="hidden lg:flex fixed left-3 top-1/2 -translate-y-1/2 z-50 w-36 flex-col gap-3" aria-label="Side navigation">
        <nav aria-label="Legacy sections" className="flex flex-col gap-2 rounded-2xl border border-[#DFB260]/35 bg-[#120B21]/95 p-2 shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#F5D77F]">Legacy</p>
          {sideNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return <button key={item.id} id={'side-nav-' + item.id} onClick={() => onSelectView(item.id)} title={item.label} className={'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-all ' + (isActive ? 'border-[#DFB260]/60 bg-[#DFB260]/20 text-[#FFF2A8]' : 'border-transparent text-[#C8B1E4] hover:border-[#DFB260]/30 hover:bg-[#1A0C33] hover:text-[#FFF2A8]')}>
              <Icon className={'h-4 w-4 shrink-0 ' + (isActive ? 'text-[#F5D77F]' : 'text-[#C8B1E4]')}/><span>{item.label}</span>
            </button>;
          })}
        </nav>
        <nav aria-label="Vault sections" className="flex flex-col gap-2 rounded-2xl border border-[#DFB260]/50 bg-[#120B21]/95 p-2 shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#F5D77F]">Vault</p>
          {vaultNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return <button key={item.id} id={'vault-nav-' + item.id} onClick={() => onSelectView(item.id)} title={item.label} className={'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-all ' + (isActive ? 'border-[#DFB260]/60 bg-[#DFB260]/20 text-[#FFF2A8]' : 'border-transparent text-[#C8B1E4] hover:border-[#DFB260]/40 hover:bg-[#1A0C33] hover:text-[#FFF2A8]')}>
              <Icon className={'h-4 w-4 shrink-0 ' + (isActive ? 'text-[#F5D77F]' : 'text-[#C8B1E4]')}/><span>{item.label}</span>
            </button>;
          })}
          <button id="vault-nav-wallet" onClick={onOpenWallet} title="Arweave Web Wallet" className={'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-all ' + (walletState.isConnected ? 'border-emerald-400/40 bg-emerald-500/10 text-[#FFF2A8]' : 'border-transparent text-[#C8B1E4] hover:border-[#DFB260]/40 hover:bg-[#1A0C33] hover:text-[#FFF2A8]')}>
            <Wallet className={"h-4 w-4 shrink-0 " + (walletState.isConnected ? "text-emerald-400" : "text-[#C8B1E4]")}/><span>Arweave Web Wallet</span>
          </button>
        </nav>
        <nav aria-label="Administrative sections" className="flex flex-col gap-2 rounded-2xl border border-[#7353A0]/50 bg-[#120B21]/95 p-2 shadow-2xl backdrop-blur-xl">
          <p className="px-2 pb-1 text-[9px] font-mono uppercase tracking-[0.18em] text-[#C8B1E4]">Administrative</p>
          {adminNavItems.map(item => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return <button key={item.id} id={'admin-nav-' + item.id} onClick={() => onSelectView(item.id)} title={item.label} className={'flex w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[11px] font-semibold transition-all ' + (isActive ? 'border-[#DFB260]/60 bg-[#DFB260]/20 text-[#FFF2A8]' : 'border-transparent text-[#C8B1E4] hover:border-[#7353A0]/60 hover:bg-[#1A0C33] hover:text-[#FFF2A8]')}>
              <Icon className={'h-4 w-4 shrink-0 ' + (isActive ? 'text-[#F5D77F]' : 'text-[#C8B1E4]')}/><span>{item.label}</span>
            </button>;
          })}
        </nav>
      </aside>
    </>
  );
};
