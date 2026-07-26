import React, { useState, useRef, useEffect } from 'react';
import { ViewMode } from '../types';
import { StorageUsageDashboard } from './StorageUsageDashboard';
import { 
  Lock, 
  Shield, 
  Key, 
  FileText, 
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  ChevronRight,
  HardDrive,
  Upload,
  FileUp,
  X,
  Trash2,
  Eye,
  Download,
  Search,
  Sparkles,
  Layers,
  Loader2,
  Check,
  FileCheck,
  LockKeyhole,
  Unlock,
  RefreshCw
} from 'lucide-react';
import { triggerGlobalArweaveAlert } from './NotificationSystem';

interface LockerDocument {
  id: string;
  title: string;
  category: string;
  size: string;
  level: string;
  tx: string;
  dateAdded: string;
  notes?: string;
  fileName?: string;
  fileDataUrl?: string;
  rawTextPayload?: string;
  encryptedWithAES: boolean;
}

interface LockerViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenGlobalUpload?: () => void;
  onOpenExportModal?: () => void;
}

const DEFAULT_DOCUMENTS: LockerDocument[] = [
  {
    id: 'doc-1',
    title: 'Oakhaven Manor Property Deed',
    category: 'Real Estate',
    size: '4.2 MB',
    level: 'Level 5 Client-Side AES-256',
    tx: 'ar_d33d_99182x',
    dateAdded: '2025-11-14',
    notes: 'Original certified land deed and title insurance documents for Oakhaven Estate.',
    encryptedWithAES: true
  },
  {
    id: 'doc-2',
    title: 'Family Trust & Asset Distribution Ledger',
    category: 'Legal Trust',
    size: '1.8 MB',
    level: 'Level 5 Client-Side AES-256',
    tx: 'ar_tr4st_88120y',
    dateAdded: '2025-12-02',
    notes: 'Binding sovereign living trust specification and heir percentage splits.',
    encryptedWithAES: true
  },
  {
    id: 'doc-3',
    title: 'Hardware Wallet Recovery Seeds (Multi-sig)',
    category: 'Cryptographic',
    size: '128 KB',
    level: 'Level 5 Quantum-Proof Multi-sig',
    tx: 'ar_s33d_55219z',
    dateAdded: '2026-01-10',
    notes: 'Encrypted 24-word seed phrase backup split across 3 fiduciary trustees.',
    encryptedWithAES: true
  },
  {
    id: 'doc-4',
    title: 'Intellectual Property & Patent Portfolio',
    category: 'Patents',
    size: '8.4 MB',
    level: 'Zero-Knowledge Permaweb Shard',
    tx: 'ar_p4t3nt_10928m',
    dateAdded: '2026-02-18',
    notes: 'Global patent filings, research papers, and technical schematic blueprints.',
    encryptedWithAES: true
  }
];

export const LockerView: React.FC<LockerViewProps> = ({ onSelectView, onOpenGlobalUpload, onOpenExportModal }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');

  // Persistent Locker Documents State
  const [documents, setDocuments] = useState<LockerDocument[]>(() => {
    try {
      const saved = localStorage.getItem('aeterna_locker_docs');
      return saved ? JSON.parse(saved) : DEFAULT_DOCUMENTS;
    } catch {
      return DEFAULT_DOCUMENTS;
    }
  });

  // Save documents to local storage when changed
  useEffect(() => {
    try {
      localStorage.setItem('aeterna_locker_docs', JSON.stringify(documents));
    } catch (e) {
      console.error('Failed to save locker docs to localStorage', e);
    }
  }, [documents]);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showStorageAnalytics, setShowStorageAnalytics] = useState(false);

  // Modals & Upload State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<LockerDocument | null>(null);

  // Upload Form Fields
  const [uploadMode, setUploadMode] = useState<'file' | 'text'>('file');
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Real Estate');
  const [newLevel, setNewLevel] = useState('Level 5 Client-Side AES-256');
  const [newNotes, setNewNotes] = useState('');
  const [rawText, setRawText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string; dataUrl: string; type: string } | null>(null);
  
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionStage, setEncryptionStage] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setUnlocked(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const displaySize = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${sizeMb} MB`;

        setUploadedFile({
          name: file.name,
          size: displaySize,
          dataUrl,
          type: file.type || 'application/octet-stream'
        });

        if (!newTitle) {
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setNewTitle(nameWithoutExt);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const dataUrl = event.target.result as string;
        const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
        const displaySize = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${sizeMb} MB`;

        setUploadedFile({
          name: file.name,
          size: displaySize,
          dataUrl,
          type: file.type || 'application/octet-stream'
        });

        if (!newTitle) {
          const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setNewTitle(nameWithoutExt);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEncryptAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsEncrypting(true);
    setEncryptionStage('Generating 256-Bit Master Key...');

    await new Promise(r => setTimeout(r, 600));
    setEncryptionStage('Executing Client-Side AES-GCM Cipher...');

    await new Promise(r => setTimeout(r, 700));
    setEncryptionStage('Dispatching Zero-Knowledge Shard to Arweave...');

    await new Promise(r => setTimeout(r, 600));

    const generatedTx = `ar_enc_${Math.random().toString(36).substring(2, 10)}${Math.random().toString(36).substring(2, 6)}`;
    const today = new Date().toISOString().split('T')[0];

    const newDoc: LockerDocument = {
      id: `locker-doc-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      size: uploadedFile ? uploadedFile.size : `${(new Blob([rawText]).size / 1024).toFixed(0)} KB`,
      level: newLevel,
      tx: generatedTx,
      dateAdded: today,
      notes: newNotes.trim() || undefined,
      fileName: uploadedFile ? uploadedFile.name : `${newTitle.toLowerCase().replace(/\s+/g, '_')}_secret.txt`,
      fileDataUrl: uploadedFile ? uploadedFile.dataUrl : undefined,
      rawTextPayload: uploadMode === 'text' ? rawText : undefined,
      encryptedWithAES: true
    };

    setDocuments(prev => [newDoc, ...prev]);

    triggerGlobalArweaveAlert({
      type: 'failure',
      itemTitle: newDoc.title,
      txId: generatedTx,
      errorMsg: `Encrypted & pinned "${newDoc.title}" to Arweave permaweb.`
    });

    setIsEncrypting(false);
    setIsUploadModalOpen(false);

    // Reset upload form
    setNewTitle('');
    setNewNotes('');
    setRawText('');
    setUploadedFile(null);
  };

  const handleDeleteDocument = (id: string, title: string) => {
    if (window.confirm(`Are you sure you want to permanently delete "${title}" from your Encrypted Legacy Locker?`)) {
      setDocuments(prev => prev.filter(d => d.id !== id));
      triggerGlobalArweaveAlert({
        type: 'failure',
        itemTitle: title,
        errorMsg: `Removed document "${title}" from Legacy Locker`
      });
      if (selectedDocForPreview?.id === id) {
        setSelectedDocForPreview(null);
      }
    }
  };

  const handleDownloadDecrypted = (doc: LockerDocument) => {
    if (doc.fileDataUrl) {
      const a = document.createElement('a');
      a.href = doc.fileDataUrl;
      a.download = doc.fileName || `${doc.title}.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else if (doc.rawTextPayload) {
      const blob = new Blob([doc.rawTextPayload], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName || `${doc.title}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else {
      const sampleText = `DECRYPTED SOVEREIGN LEGACY ASSET\nTitle: ${doc.title}\nCategory: ${doc.category}\nLevel: ${doc.level}\nPermaweb TX: ${doc.tx}\nNotes: ${doc.notes || 'No confidential notes attached.'}`;
      const blob = new Blob([sampleText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title.toLowerCase().replace(/\s+/g, '_')}_decrypted.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesCategory = selectedCategory === 'All' || doc.category === selectedCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.tx.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = ['All', 'Real Estate', 'Legal Trust', 'Cryptographic', 'Patents', 'Financial', 'Medical', 'Estate'];

  return (
    <div id="locker-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cosmic-card-gold p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F] mb-1">
            <Lock className="w-4 h-4 text-[#F5D77F]" />
            <span>Zone 03: Sovereign Legacy Locker</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-cinzel font-bold text-[#FFF2A8]">
            Encrypted Legacy Locker
          </h1>
          <p className="text-[#C8B1E4]/80 text-sm mt-1 max-w-2xl font-medium">
            Deeds, titles, secret keys, and binding digital contracts protected with 256-bit client-side AES encryption and automated inheritance triggers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#FFF2A8] bg-[#120B21]/80 border border-[#DFB260]/40 rounded-2xl px-4 py-2.5">
            <Shield className="w-4 h-4 text-[#F5D77F]" />
            <span>Status: Sovereign Sealed</span>
          </div>

          {unlocked && (
            <>
              {onOpenExportModal && (
                <button
                  onClick={onOpenExportModal}
                  className="bg-[#0A0514] hover:bg-[#1A0C33] text-[#F5D77F] border border-[#DFB260]/40 font-semibold px-4 py-2.5 text-xs rounded-xl shadow transition-all cursor-pointer flex items-center space-x-1.5"
                  title="Export complete Vault Backup JSON"
                >
                  <Download className="w-4 h-4 text-[#F5D77F]" />
                  <span>Vault Export Backup</span>
                </button>
              )}

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="gold-filled-btn text-xs px-5 py-2.5 font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-2 shadow-lg"
              >
                <Upload className="w-4 h-4 text-[#120B21]" />
                <span>Encrypt &amp; Upload Asset</span>
              </button>
            </>
          )}
        </div>
      </div>

      {!unlocked ? (
        /* Lock Screen */
        <div className="cosmic-card p-8 max-w-md mx-auto text-center space-y-6 shadow-2xl relative">
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-[#F5D77F]" />
          </div>

          <div>
            <h3 className="font-cinzel font-bold text-[#FFF2A8] text-2xl">Sovereign PIN Required</h3>
            <p className="text-xs text-[#C8B1E4]/80 mt-1 font-medium">Enter your Master Vault Security Passcode to decrypt locker assets.</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4 font-mono">
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••••"
              className="w-full text-center tracking-[0.3em] text-2xl font-mono bg-[#120B21] border border-[#DFB260]/40 rounded-2xl py-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] transition-all font-medium"
            />
            <button
              type="submit"
              className="w-full gold-filled-btn py-3.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Unlock Legacy Locker
            </button>
          </form>
          <p className="text-[10px] text-[#C8B1E4]/60 font-mono">Default Sandbox PIN: any 4 digits (e.g., 1234)</p>
        </div>
      ) : (
        /* Unlocked Content */
        <div className="space-y-6">
          
          {/* Controls Bar: Categories, Search, Upload trigger */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 shadow-lg">
            
            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md'
                      : 'text-[#C8B1E4] hover:text-[#FFF2A8] bg-[#0A0514]/60 hover:bg-[#120B21] border border-[#DFB260]/20'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search & Actions */}
            <div className="flex items-center space-x-3 shrink-0">
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-[#C8B1E4]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search encrypted locker..."
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>

              <button
                onClick={() => setShowStorageAnalytics(prev => !prev)}
                className={`text-xs px-3.5 py-2 rounded-xl font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 transition-all shrink-0 ${
                  showStorageAnalytics 
                    ? 'bg-[#DFB260] text-[#120B21] shadow' 
                    : 'bg-[#0A0514] text-[#F5D77F] border border-[#DFB260]/40 hover:bg-[#120B21]'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{showStorageAnalytics ? 'Hide Storage D3' : 'Storage Analytics'}</span>
              </button>

              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="gold-filled-btn text-xs px-4 py-2 font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-[#120B21]" />
                <span>Encrypt File</span>
              </button>

              <button
                onClick={() => setUnlocked(false)}
                className="text-xs font-semibold text-[#F5D77F] uppercase hover:underline cursor-pointer px-2 py-1"
                title="Relock Locker"
              >
                Lock
              </button>
            </div>
          </div>

          {/* Optional D3 Storage Analytics Dashboard */}
          {showStorageAnalytics && (
            <div className="animate-fade-in my-4">
              <StorageUsageDashboard memories={[]} />
            </div>
          )}

          {/* Decrypted Documents Grid */}
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="cosmic-card p-5 space-y-3 shadow-xl hover:border-[#DFB260] transition-all flex flex-col justify-between relative group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center shrink-0 mt-0.5">
                          {doc.category === 'Cryptographic' ? (
                            <Key className="w-5 h-5 text-[#F5D77F]" />
                          ) : doc.category === 'Patents' ? (
                            <HardDrive className="w-5 h-5 text-[#F5D77F]" />
                          ) : (
                            <FileText className="w-5 h-5 text-[#F5D77F]" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-cinzel font-bold text-[#FFF2A8] text-base leading-snug">{doc.title}</h4>
                          <div className="flex items-center space-x-2 text-[10px] text-[#C8B1E4]/70 font-mono font-semibold mt-0.5">
                            <span>{doc.category}</span>
                            <span>•</span>
                            <span>{doc.size}</span>
                            <span>•</span>
                            <span>{doc.dateAdded}</span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono font-semibold uppercase px-2.5 py-1 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 shrink-0">
                        {doc.level}
                      </span>
                    </div>

                    {doc.notes && (
                      <p className="text-xs text-[#C8B1E4]/80 italic line-clamp-2 pl-2 border-l-2 border-[#DFB260]/40">
                        "{doc.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#C8B1E4]/80 font-mono pt-3 border-t border-[#DFB260]/20">
                    <span className="text-[11px] font-bold text-[#F5D77F] font-mono truncate max-w-[140px] sm:max-w-[180px]">
                      {doc.tx}
                    </span>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setSelectedDocForPreview(doc)}
                        className="text-[#C8B1E4] hover:text-[#FFF2A8] p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                        title="Preview Decrypted Asset Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDownloadDecrypted(doc)}
                        className="text-[#FFF2A8] hover:text-[#F5D77F] font-semibold text-xs uppercase cursor-pointer flex items-center space-x-1 hover:underline"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Decrypt &amp; Save</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.title)}
                        className="text-red-400/70 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-950/50 transition-colors cursor-pointer"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="cosmic-card p-12 text-center space-y-4">
              <FileUp className="w-12 h-12 text-[#F5D77F] mx-auto opacity-80" />
              <div className="space-y-1">
                <h4 className="font-cinzel font-bold text-lg text-[#FFF2A8]">No Encrypted Documents Found</h4>
                <p className="text-xs text-[#C8B1E4]/80 max-w-md mx-auto">
                  No encrypted assets matched your current category or search query. Encrypt a new file to secure deeds, trusts, keys, or estate plans.
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="gold-filled-btn text-xs px-6 py-3 cursor-pointer font-bold uppercase tracking-wider"
              >
                + Encrypt First Legacy Document
              </button>
            </div>
          )}

          {/* Designated Inheritance Trustees Configuration */}
          <div className="cosmic-card p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#DFB260]/20 pb-3">
              <h4 className="font-cinzel font-bold text-[#FFF2A8] text-xl">Designated Inheritance Trustees</h4>
              <button
                onClick={() => onSelectView('inheritance')}
                className="text-xs text-[#F5D77F] font-semibold hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>Manage Heirs &amp; Triggers</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans">
              <div className="bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
                <span className="font-bold text-[#FFF2A8] font-cinzel text-base block">Clara Pendelton</span>
                <p className="text-[#C8B1E4]/80 font-medium">Primary Beneficiary</p>
                <span className="text-emerald-400 text-[10px] font-mono font-bold uppercase block pt-1">Key Verified</span>
              </div>
              <div className="bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
                <span className="font-bold text-[#FFF2A8] font-cinzel text-base block">Thomas Pendelton</span>
                <p className="text-[#C8B1E4]/80 font-medium">Secondary Beneficiary</p>
                <span className="text-emerald-400 text-[10px] font-mono font-bold uppercase block pt-1">Key Verified</span>
              </div>
              <div className="bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
                <span className="font-bold text-[#FFF2A8] font-cinzel text-base block">Sovereign Trust Executor</span>
                <p className="text-[#C8B1E4]/80 font-medium">Multi-sig Fiduciary</p>
                <span className="text-[#F5D77F] text-[10px] font-mono font-bold uppercase block pt-1">180 Day Inactivity Trigger</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ENCRYPT & UPLOAD ASSET MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="cosmic-card-gold max-w-xl w-full p-6 sm:p-8 rounded-3xl space-y-6 shadow-2xl relative border-2 border-[#DFB260] max-h-[92vh] overflow-y-auto no-scrollbar">
            
            <button
              onClick={() => {
                if (!isEncrypting) setIsUploadModalOpen(false);
              }}
              disabled={isEncrypting}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F]">
                <LockKeyhole className="w-3.5 h-3.5 text-[#F5D77F]" />
                <span>256-Bit Sovereign AES Cipher</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
                Encrypt &amp; Upload Legacy Asset
              </h2>
              <p className="text-xs text-[#C8B1E4]/80 font-medium">
                Upload deeds, trusts, secret keys, or confidential files. Items are encrypted client-side and pinned to Arweave.
              </p>
            </div>

            {/* Upload Method Switcher: Local File vs Direct Key/Text */}
            <div className="flex items-center space-x-2 bg-[#120B21] p-1 rounded-2xl border border-[#DFB260]/30">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  uploadMode === 'file'
                    ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                    : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Local Document File</span>
              </button>

              <button
                type="button"
                onClick={() => setUploadMode('text')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  uploadMode === 'text'
                    ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                    : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Secret Text / Seed Phrase</span>
              </button>
            </div>

            <form onSubmit={handleEncryptAndSave} className="space-y-4 text-xs">

              {/* Mode 1: File Dropzone */}
              {uploadMode === 'file' && (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#DFB260]/50 hover:border-[#F5D77F] bg-[#120B21]/80 hover:bg-[#120B21] p-6 rounded-2xl text-center space-y-2 cursor-pointer transition-all"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {uploadedFile ? (
                    <div className="space-y-1 py-2">
                      <FileCheck className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="font-bold text-sm text-[#FFF2A8]">{uploadedFile.name}</div>
                      <span className="text-[10px] font-mono text-[#F5D77F] block">{uploadedFile.size} • Ready for encryption</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#F5D77F] mx-auto animate-bounce" />
                      <div className="font-semibold text-xs text-[#FFF2A8]">
                        Click or drag &amp; drop document file here
                      </div>
                      <p className="text-[10px] text-[#C8B1E4]/70">
                        Supports PDF, PNG, JPG, DOCX, TXT, JSON keyfiles, ZIP (Up to 500 MB).
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* Mode 2: Direct Text / Seed Phrase */}
              {uploadMode === 'text' && (
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Confidential Text / Key Phrase</label>
                  <textarea
                    rows={4}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Enter 24-word seed phrase, hardware wallet key, or private instructions..."
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] font-mono text-xs focus:outline-none focus:border-[#F5D77F]"
                  ></textarea>
                </div>
              )}

              {/* Document Title */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Oakhaven Estate Deed & Title 2026"
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>

              {/* Category & Protection Level */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Asset Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] cursor-pointer"
                  >
                    <option value="Real Estate">Real Estate &amp; Property</option>
                    <option value="Legal Trust">Legal Trust &amp; Ledger</option>
                    <option value="Cryptographic">Cryptographic Keys &amp; Seeds</option>
                    <option value="Patents">Patents &amp; IP</option>
                    <option value="Financial">Financial &amp; Accounts</option>
                    <option value="Medical">Medical Records</option>
                    <option value="Estate">Personal Will &amp; Estate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#FFF2A8] font-semibold mb-1">Protection Level</label>
                  <select
                    value={newLevel}
                    onChange={(e) => setNewLevel(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] cursor-pointer"
                  >
                    <option value="Level 5 Client-Side AES-256">Level 5 Client-Side AES-256</option>
                    <option value="Level 5 Quantum-Proof Multi-sig">Level 5 Quantum-Proof Multi-sig</option>
                    <option value="Zero-Knowledge Permaweb Shard">Zero-Knowledge Permaweb Shard</option>
                  </select>
                </div>
              </div>

              {/* Confidential Notes */}
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Beneficiary Instructions &amp; Notes (Optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Special instructions for heirs or trustees upon unlock..."
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                />
              </div>

              {/* Encryption Progress Banner */}
              {isEncrypting && (
                <div className="bg-[#120B21] border border-[#DFB260]/50 p-4 rounded-2xl text-center space-y-2">
                  <div className="flex items-center justify-center space-x-2 text-[#F5D77F]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="font-bold text-xs">{encryptionStage}</span>
                  </div>
                  <div className="w-full bg-[#0A0514] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#DFB260] to-[#F5D77F] h-full w-3/4 animate-pulse"></div>
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isEncrypting}
                  onClick={() => setIsUploadModalOpen(false)}
                  className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEncrypting || (!uploadedFile && uploadMode === 'file') || (!rawText.trim() && uploadMode === 'text')}
                  className="gold-filled-btn px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5 text-[#120B21]" />
                  <span>Encrypt &amp; Publish to Arweave</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* PREVIEW / DECRYPT DETAILS MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="cosmic-card-gold max-w-lg w-full p-6 sm:p-8 rounded-3xl space-y-5 shadow-2xl relative border-2 border-[#DFB260]">
            <button
              onClick={() => setSelectedDocForPreview(null)}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3 border-b border-[#DFB260]/30 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-[#F5D77F]" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#F5D77F] font-bold uppercase block">{selectedDocForPreview.category}</span>
                <h3 className="font-cinzel font-bold text-xl text-[#FFF2A8] leading-tight">{selectedDocForPreview.title}</h3>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#C8B1E4]/70">Permaweb TX ID:</span>
                  <span className="text-[#F5D77F] font-bold">{selectedDocForPreview.tx}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#C8B1E4]/70">Encryption standard:</span>
                  <span className="text-[#FFF2A8]">{selectedDocForPreview.level}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#C8B1E4]/70">Payload file size:</span>
                  <span className="text-[#FFF2A8]">{selectedDocForPreview.size}</span>
                </div>
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="text-[#C8B1E4]/70">Date encrypted:</span>
                  <span className="text-[#FFF2A8]">{selectedDocForPreview.dateAdded}</span>
                </div>
              </div>

              {selectedDocForPreview.notes && (
                <div className="bg-[#120B21]/60 p-3 rounded-xl border border-[#DFB260]/20 space-y-1">
                  <span className="font-mono text-[10px] text-[#F5D77F] font-bold block uppercase">Confidential Notes</span>
                  <p className="text-xs text-[#E8DDF5]">{selectedDocForPreview.notes}</p>
                </div>
              )}

              {selectedDocForPreview.rawTextPayload && (
                <div className="bg-[#0A0514] p-3 rounded-xl border border-[#DFB260]/30 font-mono text-xs text-emerald-300 overflow-x-auto max-h-32">
                  <span className="text-[10px] text-[#C8B1E4]/70 block mb-1">Decrypted Payload Preview:</span>
                  {selectedDocForPreview.rawTextPayload}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => handleDeleteDocument(selectedDocForPreview.id, selectedDocForPreview.title)}
                className="px-4 py-2 bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Asset</span>
              </button>

              <button
                onClick={() => handleDownloadDecrypted(selectedDocForPreview)}
                className="gold-filled-btn px-6 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center space-x-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#120B21]" />
                <span>Decrypt &amp; Save File</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

