import React, { useState, useEffect } from 'react';
import { ViewMode, MemoryItem, LegacyLetter, MemorialShrine, WalletState, Heir, InheritanceTriggerConfig, UserProfile } from './types';
import { INITIAL_MEMORIES, INITIAL_LETTERS, INITIAL_MEMORIALS, INITIAL_HEIRS, INITIAL_TRIGGER_CONFIG } from './data/mockData';
import { setVaultItem, getVaultItem, removeVaultItem, safeSetLocalStorage } from './lib/storage';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { LandingView } from './components/LandingView';
import { PricingView } from './components/PricingView';
import { LegacyView } from './components/LegacyView';
import { SearchView } from './components/SearchView';
import { EmptyView } from './components/EmptyView';
import { MemorialsView } from './components/MemorialsView';
import { LockerView } from './components/LockerView';
import { InheritanceView } from './components/InheritanceView';
import { ImmortalGatewayView } from './components/ImmortalGatewayView';
import { AuditView } from './components/AuditView';
import { ImportHistoryView } from './components/ImportHistoryView';
import { RecycleBinView } from './components/RecycleBinView';
import { StorageManagementView } from './components/StorageManagementView';
import { AccountManagementView } from './components/AccountManagementView';
import { UploadModal } from './components/UploadModal';
import { VideoRecorderModal } from './components/VideoRecorderModal';
import { WalletModal } from './components/WalletModal';
import { ConciergeChatModal } from './components/ConciergeChatModal';
import { AuthModal } from './components/AuthModal';
import { VaultExportModal } from './components/VaultExportModal';
import { NotificationProvider } from './components/NotificationSystem';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  useEffect(() => { const requested = window.location.hash.replace('#', '') as ViewMode; if (['imports','account','storage','recycle','search','audit','immortal'].includes(requested)) setCurrentView(requested); }, []);
  const [searchQuery, setSearchQuery] = useState('');
  
  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = localStorage.getItem('aeterna_user_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved user profile', e);
    }
    return null;
  });

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async response => response.ok ? response.json() : null)
      .then(result => {
        if (!result) return;
        setCurrentUser(result.user || null);
        if (result.user) localStorage.setItem("aeterna_user_profile", JSON.stringify(result.user));
        else localStorage.removeItem("aeterna_user_profile");
      })
      .catch(() => undefined);
  }, []);

  // App State collections initialized with persistent localStorage support
  const [memories, setMemories] = useState<MemoryItem[]>(() => {
    if (typeof window === 'undefined') return INITIAL_MEMORIES;
    try {
      if (localStorage.getItem('aeterna_demo_cleared') === 'true') {
        const saved = localStorage.getItem('aeterna_memories');
        return saved ? JSON.parse(saved) : [];
      }
      const saved = localStorage.getItem('aeterna_memories');
      return saved ? JSON.parse(saved) : INITIAL_MEMORIES;
    } catch {
      return INITIAL_MEMORIES;
    }
  });

  const [letters, setLetters] = useState<LegacyLetter[]>(() => {
    if (typeof window === 'undefined') return INITIAL_LETTERS;
    try {
      if (localStorage.getItem('aeterna_demo_cleared') === 'true') {
        const saved = localStorage.getItem('aeterna_letters');
        return saved ? JSON.parse(saved) : [];
      }
      const saved = localStorage.getItem('aeterna_letters');
      return saved ? JSON.parse(saved) : INITIAL_LETTERS;
    } catch {
      return INITIAL_LETTERS;
    }
  });

  const [memorials, setMemorials] = useState<MemorialShrine[]>(() => {
    if (typeof window === 'undefined') return INITIAL_MEMORIALS;
    try {
      if (localStorage.getItem('aeterna_demo_cleared') === 'true') {
        return [];
      }
      const saved = localStorage.getItem('aeterna_memorials');
      return saved ? JSON.parse(saved) : INITIAL_MEMORIALS;
    } catch {
      return INITIAL_MEMORIALS;
    }
  });

  const [heirs, setHeirs] = useState<Heir[]>(() => {
    if (typeof window === 'undefined') return INITIAL_HEIRS;
    try {
      if (localStorage.getItem('aeterna_demo_cleared') === 'true') {
        return [];
      }
      const saved = localStorage.getItem('aeterna_heirs');
      return saved ? JSON.parse(saved) : INITIAL_HEIRS;
    } catch {
      return INITIAL_HEIRS;
    }
  });

  const [triggerConfig, setTriggerConfig] = useState<InheritanceTriggerConfig>(INITIAL_TRIGGER_CONFIG);

  // Prefer the authenticated server vault, with IndexedDB as an offline fallback.
  useEffect(() => {
    async function hydrateFromVault() {
      const isDemoCleared = localStorage.getItem('aeterna_demo_cleared') === 'true';

      // 1. Try loading from server persistent storage first
      try {
        const res = await fetch('/api/vault/data');
        if (res.ok) {
          const body = await res.json();
          if (body.data) {
            if (Array.isArray(body.data.memories)) setMemories(body.data.memories);
            if (Array.isArray(body.data.letters)) setLetters(body.data.letters);
            if (Array.isArray(body.data.heirs)) setHeirs(body.data.heirs);
            if (Array.isArray(body.data.memorials)) setMemorials(body.data.memorials);
            return;
          }
        }
      } catch (err) {
        console.warn('Server vault fetch notice, using IndexedDB fallback:', err);
      }

      // 2. Fallback to IndexedDB / local storage
      const dbMemories = await getVaultItem<MemoryItem[]>('aeterna_memories');
      if (dbMemories !== null) {
        setMemories(dbMemories);
      } else if (isDemoCleared) {
        setMemories([]);
      }

      const dbLetters = await getVaultItem<LegacyLetter[]>('aeterna_letters');
      if (dbLetters !== null) {
        setLetters(dbLetters);
      } else if (isDemoCleared) {
        setLetters([]);
      }

      const dbMemorials = await getVaultItem<MemorialShrine[]>('aeterna_memorials');
      if (dbMemorials !== null) {
        setMemorials(dbMemorials);
      }

      const dbHeirs = await getVaultItem<Heir[]>('aeterna_heirs');
      if (dbHeirs !== null) {
        setHeirs(dbHeirs);
      }
    }
    hydrateFromVault();
  }, [currentUser?.id]);

  // Sync authenticated vault state to server whenever vault items are updated
  useEffect(() => {
    if (!currentUser) return;
    const timer = setTimeout(() => {
      fetch('/api/vault/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memories, letters, heirs, memorials })
      }).catch(err => console.warn('Vault server sync notice:', err));
    }, 1000);
    return () => clearTimeout(timer);
  }, [memories, letters, heirs, memorials, currentUser?.id]);

  // Clear demo content handler
  const handleClearDemoContent = () => {
    setMemories([]);
    setLetters([]);
    setMemorials([]);
    setHeirs([]);
    try {
      safeSetLocalStorage('aeterna_demo_cleared', 'true');
      setVaultItem('aeterna_memories', []);
      setVaultItem('aeterna_letters', []);
      setVaultItem('aeterna_memorials', []);
      setVaultItem('aeterna_heirs', []);
    } catch (e) {
      console.error('Failed to clear demo state', e);
    }
  };

  // Restore demo content handler
  const handleRestoreDemoContent = () => {
    setMemories(INITIAL_MEMORIES);
    setLetters(INITIAL_LETTERS);
    setMemorials(INITIAL_MEMORIALS);
    setHeirs(INITIAL_HEIRS);
    try {
      localStorage.removeItem('aeterna_demo_cleared');
      removeVaultItem('aeterna_memories');
      removeVaultItem('aeterna_letters');
      removeVaultItem('aeterna_memorials');
      removeVaultItem('aeterna_heirs');
    } catch (e) {
      console.error('Failed to restore demo state', e);
    }
  };

  // Wallet State
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: true,
    address: '0x71C92a4f9a',
    balanceAr: 2450,
    nodeLatencyMs: 14,
    encryptionKeyStatus: 'Verified'
  });

  // Modal Visibility
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [conciergeModalOpen, setConciergeModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // Restore backup handler
  const handleRestoreBackup = (backupData: {
    memories: MemoryItem[];
    letters: LegacyLetter[];
    memorials: MemorialShrine[];
    heirs: Heir[];
  }) => {
    if (backupData.memories) setMemories(backupData.memories);
    if (backupData.letters) setLetters(backupData.letters);
    if (backupData.memorials) setMemorials(backupData.memorials);
    if (backupData.heirs) setHeirs(backupData.heirs);

    try {
      if (backupData.memories) setVaultItem('aeterna_memories', backupData.memories);
      if (backupData.letters) setVaultItem('aeterna_letters', backupData.letters);
      if (backupData.memorials) setVaultItem('aeterna_memorials', backupData.memorials);
      if (backupData.heirs) setVaultItem('aeterna_heirs', backupData.heirs);
      localStorage.removeItem('aeterna_demo_cleared');
    } catch (e) {
      console.error('Failed to save restored backup to vault storage', e);
    }
  };

  // Handle URL route or hash navigation for login/signup
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      if (path.includes('/login') || hash.includes('login')) {
        setAuthModalMode('signin');
        setAuthModalOpen(true);
      } else if (path.includes('/signup') || hash.includes('signup')) {
        setAuthModalMode('signup');
        setAuthModalOpen(true);
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  // Sync user profile to localStorage
  const handleSignIn = (user: UserProfile) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('aeterna_user_profile', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user session', e);
    }
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    setCurrentView('landing');
    try {
      localStorage.removeItem('aeterna_user_profile');
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
  };

  // Handlers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentView('search');
  };

  const handleAddMemory = (newMemories: MemoryItem | MemoryItem[]) => {
    const itemsToAdd = Array.isArray(newMemories) ? newMemories : [newMemories];
    setMemories(prev => {
      const updated = [...itemsToAdd, ...prev];
      setVaultItem('aeterna_memories', updated);
      return updated;
    });
  };

  const handleUpdateMemoriesList = (updatedMemories: MemoryItem[]) => {
    setMemories(updatedMemories);
    setVaultItem('aeterna_memories', updatedMemories);
  };

  const handleAddLetter = (newLetter: LegacyLetter) => {
    setLetters(prev => {
      const updated = [newLetter, ...prev];
      setVaultItem('aeterna_letters', updated);
      return updated;
    });
  };

  const handleDeleteLetter = (id: string) => {
    setLetters(prev => {
      const updated = prev.filter(l => l.id !== id);
      setVaultItem('aeterna_letters', updated);
      return updated;
    });
  };

  const handleDeleteMemory = (id: string) => {
    setMemories(prev => {
      const updated = prev.filter(m => m.id !== id);
      setVaultItem('aeterna_memories', updated);
      return updated;
    });
  };

  const handleDeleteMemorial = (id: string) => {
    setMemorials(prev => {
      const updated = prev.filter(m => m.id !== id);
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleToggleCandle = (id: string) => {
    setMemorials(prev => {
      const updated = prev.map(m => {
        if (m.id === id) {
          const isNowLit = !m.candleLitToday;
          const currentCount = m.candlesLitCount || 100;
          return {
            ...m,
            candleLitToday: isNowLit,
            candlesLitCount: isNowLit ? currentCount + 1 : Math.max(0, currentCount - 1),
            tributesCount: isNowLit ? m.tributesCount + 1 : m.tributesCount
          };
        }
        return m;
      });
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleOfferFlowers = (id: string) => {
    setMemorials(prev => {
      const updated = prev.map(m => {
        if (m.id === id) {
          return {
            ...m,
            flowersOfferedCount: (m.flowersOfferedCount || 0) + 1,
            tributesCount: m.tributesCount + 1
          };
        }
        return m;
      });
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleAddTribute = (shrineId: string, tribute: import('./types').TributeNote) => {
    setMemorials(prev => {
      const updated = prev.map(m => {
        if (m.id === shrineId) {
          const existingTributes = m.tributes || [];
          return {
            ...m,
            tributes: [tribute, ...existingTributes],
            tributesCount: m.tributesCount + 1
          };
        }
        return m;
      });
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleAddMemorial = (newShrine: MemorialShrine) => {
    setMemorials(prev => {
      const updated = [newShrine, ...prev];
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleEditMemorial = (updatedShrine: MemorialShrine) => {
    setMemorials(prev => {
      const updated = prev.map(m => m.id === updatedShrine.id ? updatedShrine : m);
      setVaultItem('aeterna_memorials', updated);
      return updated;
    });
  };

  const handleToggleWalletConnect = () => {
    setWalletState(prev => ({
      ...prev,
      isConnected: !prev.isConnected
    }));
  };

  const handleAddHeir = (newHeir: Heir) => {
    setHeirs(prev => [...prev, newHeir]);
  };

  const handleRemoveHeir = (heirId: string) => {
    setHeirs(prev => prev.filter(h => h.id !== heirId));
  };

  const handleUpdateHeirRole = (heirId: string, role: Heir['accessRole']) => {
    setHeirs(prev => prev.map(h => h.id === heirId ? { ...h, accessRole: role } : h));
  };

  return (
    <NotificationProvider onViewAuditLog={() => setCurrentView('audit')}>
      <div className="min-h-screen text-[#E8DDF5] font-sans antialiased selection:bg-[#DFB260] selection:text-[#120B21] pb-12 relative">
      
      {/* Top Header Navigation (hidden on landing page for clean full-screen experience) */}
      {currentView !== 'landing' && (
        <Navbar
          currentView={currentView}
          onSelectView={(view) => {
            setCurrentView(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          walletState={walletState}
          onOpenWallet={() => setWalletModalOpen(true)}
          onOpenUpload={() => setUploadModalOpen(true)}
          onOpenVideoRecorder={() => setVideoRecorderOpen(true)}
          onOpenExportModal={() => setExportModalOpen(true)}
          currentUser={currentUser}
          onOpenAuth={() => setAuthModalOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
        />
      )}

      {/* Main View Container */}
      {currentView === 'landing' ? (
        <div className="w-full min-h-screen">
          <LandingView
            onSelectView={setCurrentView}
            onOpenUpload={() => setUploadModalOpen(true)}
            onOpenAuth={(mode) => {
              setAuthModalMode(mode || 'signin');
              setAuthModalOpen(true);
            }}
            onSignInAsDemo={() => {
              handleSignIn({
                id: 'usr_demo_guest',
                name: 'Demo Owner',
                email: 'demo@aeterna.local',
                role: 'Vault Owner',
                authMethod: 'Email & Passcode',
                walletAddress: '0x71C92a4f9a72b0c3d4E691',
                signedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                securityLevel: 'Quantum-Proof AES-GCM'
              });
              setCurrentView('dashboard');
            }}
            currentUser={currentUser}
          />
        </div>
      ) : (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
          {currentView === 'dashboard' && (
            <DashboardView
              onSelectView={setCurrentView}
              onOpenUpload={() => setUploadModalOpen(true)}
              onOpenVideoRecorder={() => setVideoRecorderOpen(true)}
              onOpenConcierge={() => setConciergeModalOpen(true)}
              memories={memories}
              memorials={memorials}
              heirs={heirs}
              currentUser={currentUser}
              onClearDemoContent={handleClearDemoContent}
              onRestoreDemoContent={handleRestoreDemoContent}
            />
          )}

        {currentView === 'pricing' && (
          <PricingView
            onSelectView={setCurrentView}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        )}

        {currentView === 'legacy' && (
          <LegacyView
            onSelectView={setCurrentView}
            letters={letters}
            onAddLetter={handleAddLetter}
            onDeleteLetter={handleDeleteLetter}
            onOpenConcierge={() => setConciergeModalOpen(true)}
            onOpenVideoRecorder={() => setVideoRecorderOpen(true)}
          />
        )}

        {currentView === 'search' && (
          <SearchView
            onSelectView={setCurrentView}
            memories={memories}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenUpload={() => setUploadModalOpen(true)}
            onUpdateMemories={handleUpdateMemoriesList}
            onDeleteMemory={handleDeleteMemory}
            onRestoreDemoContent={handleRestoreDemoContent}
          />
        )}

        {currentView === 'empty' && (
          <EmptyView
            onSelectView={setCurrentView}
            onOpenUpload={() => setUploadModalOpen(true)}
          />
        )}

        {currentView === 'memorials' && (
          <MemorialsView
            onSelectView={setCurrentView}
            memorials={memorials}
            memories={memories}
            onToggleCandle={handleToggleCandle}
            onOfferFlowers={handleOfferFlowers}
            onAddTribute={handleAddTribute}
            onAddMemorial={handleAddMemorial}
            onEditMemorial={handleEditMemorial}
            onDeleteMemorial={handleDeleteMemorial}
          />
        )}

        {currentView === 'locker' && (
          <LockerView
            onSelectView={setCurrentView}
            onOpenGlobalUpload={() => setUploadModalOpen(true)}
            onOpenExportModal={() => setExportModalOpen(true)}
          />
        )}

        {currentView === 'inheritance' && (
          <InheritanceView
            heirs={heirs}
            onAddHeir={handleAddHeir}
            onRemoveHeir={handleRemoveHeir}
            onUpdateHeirRole={handleUpdateHeirRole}
            triggerConfig={triggerConfig}
            onUpdateTriggerConfig={setTriggerConfig}
            memories={memories}
            letters={letters}
            onSelectView={setCurrentView}
          />
        )}

        {currentView === 'immortal' && (
          <ImmortalGatewayView
            memories={memories}
            letters={letters}
            heirs={heirs}
            onSelectView={setCurrentView}
          />
        )}

        {currentView === 'imports' && <ImportHistoryView onOpenAlbum={(album) => { setSearchQuery(album); setCurrentView('search'); }} />}

        {currentView === 'recycle' && <RecycleBinView onRestore={(items) => handleUpdateMemoriesList([...memories, ...items.filter(item => !memories.some(existing => existing.id === item.id))])} />}

        {currentView === 'storage' && <StorageManagementView onOpenRecycle={() => setCurrentView('recycle')} />}

        {currentView === 'account' && <AccountManagementView onSignedOut={() => { setCurrentUser(null); localStorage.removeItem('aeterna_user_profile'); setCurrentView('landing'); }} />}

        {currentView === 'audit' && (
          <AuditView
            memories={memories}
            letters={letters}
            onSelectView={setCurrentView}
            onOpenUpload={() => setUploadModalOpen(true)}
            onOpenExportModal={() => setExportModalOpen(true)}
          />
        )}
      </main>
      )}

      {/* Global Modals */}
      <UploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onAddMemory={handleAddMemory}
        onOpenVideoRecorder={() => setVideoRecorderOpen(true)}
      />

      <VideoRecorderModal
        isOpen={videoRecorderOpen}
        onClose={() => setVideoRecorderOpen(false)}
        onAddMemory={handleAddMemory}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
        walletState={walletState}
        onToggleConnect={handleToggleWalletConnect}
      />

      <ConciergeChatModal
        isOpen={conciergeModalOpen}
        onClose={() => setConciergeModalOpen(false)}
        currentUser={currentUser}
        onSelectView={setCurrentView}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenWallet={() => setWalletModalOpen(true)}
        onClearDemoContent={handleClearDemoContent}
        onRestoreDemoContent={handleRestoreDemoContent}
      />

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        currentUser={currentUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        authMode={authModalMode}
        onClearDemoContent={handleClearDemoContent}
        onRestoreDemoContent={handleRestoreDemoContent}
      />

      <VaultExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        memories={memories}
        letters={letters}
        memorials={memorials}
        heirs={heirs}
        triggerConfig={triggerConfig}
        userProfile={currentUser}
        onRestoreBackup={handleRestoreBackup}
      />

      </div>
    </NotificationProvider>
  );
}
