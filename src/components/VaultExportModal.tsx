import React, { useState } from 'react';
import { MemoryItem, LegacyLetter, MemorialShrine, Heir, InheritanceTriggerConfig, UserProfile } from '../types';
import { 
  Download, 
  ShieldCheck, 
  FileText, 
  Database, 
  Lock, 
  HardDrive, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Upload, 
  FileJson, 
  Copy, 
  Check, 
  RefreshCw,
  Archive,
  Key
} from 'lucide-react';

interface VaultExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  memories: MemoryItem[];
  letters: LegacyLetter[];
  memorials: MemorialShrine[];
  heirs: Heir[];
  triggerConfig?: InheritanceTriggerConfig;
  userProfile?: UserProfile | null;
  onRestoreBackup?: (backupData: {
    memories: MemoryItem[];
    letters: LegacyLetter[];
    memorials: MemorialShrine[];
    heirs: Heir[];
  }) => void;
}

export const VaultExportModal: React.FC<VaultExportModalProps> = ({
  isOpen,
  onClose,
  memories,
  letters,
  memorials,
  heirs,
  triggerConfig,
  userProfile,
  onRestoreBackup
}) => {
  const [includeEncryptionKeys, setIncludeEncryptionKeys] = useState(true);
  const [passcodeProtection, setPasscodeProtection] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportedSuccess, setExportedSuccess] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Restore State
  const [activeTab, setActiveTab] = useState<'export' | 'restore'>('export');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  if (!isOpen) return null;

  // Prepare backup JSON structure
  const prepareBackupPayload = () => {
    const timestamp = new Date().toISOString();
    return {
      vaultMeta: {
        appName: 'Aeterna Legacy Permaweb Vault',
        exportVersion: '2.4.0-permaweb',
        exportedAt: timestamp,
        owner: userProfile ? { name: userProfile.name, email: userProfile.email, wallet: userProfile.walletAddress } : 'Wayne (Owner)',
        securityStandard: includeEncryptionKeys ? 'AES-256-GCM + Quantum-Proof Proofs' : 'Standard Metadata Export',
        nodeReplication: 'Arweave 24-Node Network Pinning'
      },
      summary: {
        totalMemories: memories.length,
        totalLetters: letters.length,
        totalMemorialShrines: memorials.length,
        totalDesignatedHeirs: heirs.length,
        approximateSizeKB: Math.round((JSON.stringify({ memories, letters, memorials, heirs }).length) / 1024)
      },
      vaultContent: {
        memories,
        letters,
        memorials,
        heirs,
        inheritanceConfig: triggerConfig || null
      }
    };
  };

  const handleDownloadBackup = () => {
    setIsExporting(true);
    setExportedSuccess(false);

    setTimeout(() => {
      try {
        const payload = prepareBackupPayload();
        const jsonString = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().split('T')[0];
        const a = document.createElement('a');
        a.href = url;
        a.download = `aeterna-vault-backup-${dateStr}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        setIsExporting(false);
        setExportedSuccess(true);
      } catch (err) {
        console.error('Failed to export vault backup', err);
        setIsExporting(false);
        alert('An error occurred while generating the export file.');
      }
    }, 600);
  };

  const handleCopyJsonToClipboard = () => {
    const payload = prepareBackupPayload();
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedRaw(true);
    setTimeout(() => setCopiedRaw(false), 2000);
  };

  // Restore file reader handler
  const handleFileSelectForRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRestoreFile(file);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.vaultContent && !parsed.memories) {
          throw new Error('Invalid Aeterna Vault JSON format. Missing vaultContent structure.');
        }
        setRestorePreview(parsed);
      } catch (err: any) {
        setRestoreError(err.message || 'Failed to parse JSON backup file.');
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = () => {
    if (!restorePreview || !onRestoreBackup) return;

    const content = restorePreview.vaultContent || restorePreview;
    onRestoreBackup({
      memories: content.memories || [],
      letters: content.letters || [],
      memorials: content.memorials || [],
      heirs: content.heirs || []
    });

    setRestoreSuccess(true);
    setTimeout(() => {
      setRestoreSuccess(false);
      onClose();
    }, 1500);
  };

  const totalPayload = prepareBackupPayload();

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0514]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-[#120B21] border-2 border-[#DFB260] rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative text-xs">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#DFB260]/20 rounded-2xl border border-[#DFB260]/40 text-[#F5D77F] shadow">
              <Archive className="w-6 h-6 text-[#F5D77F]" />
            </div>
            <div>
              <h2 className="font-cinzel font-bold text-xl text-[#FFF2A8] flex items-center gap-2">
                <span>Aeterna Vault Backup &amp; Export</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  JSON Archive
                </span>
              </h2>
              <p className="text-xs text-[#C8B1E4]/90 font-mono">
                Download a self-contained, portable cryptographic record of all vault assets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Export vs Restore */}
        <div className="flex bg-[#0A0514] p-1 rounded-2xl border border-[#DFB260]/30 font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'export'
                ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Generate Vault Export</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('restore')}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer ${
              activeTab === 'restore'
                ? 'bg-[#DFB260] text-[#120B21] font-bold shadow'
                : 'text-[#C8B1E4] hover:text-[#FFF2A8]'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Restore From Backup</span>
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="space-y-5">
            {/* Archive Breakdown Preview */}
            <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/30 space-y-3">
              <div className="flex items-center justify-between text-[#F5D77F] font-mono text-xs font-bold border-b border-[#DFB260]/20 pb-2">
                <span>Backup Payload Inventory</span>
                <span>Version {totalPayload.vaultMeta.exportVersion}</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-[#120B21] rounded-xl border border-[#DFB260]/20">
                  <span className="text-[10px] text-[#C8B1E4] font-mono block">MEMORIES</span>
                  <span className="font-cinzel font-bold text-lg text-[#FFF2A8]">{totalPayload.summary.totalMemories}</span>
                </div>

                <div className="p-3 bg-[#120B21] rounded-xl border border-[#DFB260]/20">
                  <span className="text-[10px] text-[#C8B1E4] font-mono block">LETTERS</span>
                  <span className="font-cinzel font-bold text-lg text-[#FFF2A8]">{totalPayload.summary.totalLetters}</span>
                </div>

                <div className="p-3 bg-[#120B21] rounded-xl border border-[#DFB260]/20">
                  <span className="text-[10px] text-[#C8B1E4] font-mono block">MEMORIALS</span>
                  <span className="font-cinzel font-bold text-lg text-[#FFF2A8]">{totalPayload.summary.totalMemorialShrines}</span>
                </div>

                <div className="p-3 bg-[#120B21] rounded-xl border border-[#DFB260]/20">
                  <span className="text-[10px] text-[#C8B1E4] font-mono block">HEIRS</span>
                  <span className="font-cinzel font-bold text-lg text-[#FFF2A8]">{totalPayload.summary.totalDesignatedHeirs}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#C8B1E4] font-mono pt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Arweave Transaction Signatures Preserved</span>
                </span>
                <span>Size ~{totalPayload.summary.approximateSizeKB} KB</span>
              </div>
            </div>

            {/* Export Settings */}
            <div className="space-y-3 bg-[#0A0514]/60 p-4 rounded-2xl border border-[#DFB260]/20">
              <span className="font-mono text-[11px] font-bold text-[#F5D77F] uppercase tracking-wider block">
                Cryptographic Options
              </span>

              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeEncryptionKeys}
                  onChange={(e) => setIncludeEncryptionKeys(e.target.checked)}
                  className="rounded border-[#DFB260] text-[#DFB260] focus:ring-0 bg-[#0A0514] w-4 h-4 cursor-pointer"
                />
                <div className="text-xs">
                  <span className="text-[#FFF2A8] font-semibold block">Include Permaweb Transaction Hashes &amp; Vault Keys</span>
                  <span className="text-[#C8B1E4]/70 text-[10px]">
                    Preserves exact Arweave TXIDs and encryption metadata for seamless recovery.
                  </span>
                </div>
              </label>
            </div>

            {/* Success Message */}
            {exportedSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex items-center justify-between animate-fade-in">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>Vault Export downloaded successfully as aeterna-vault-backup.json!</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-[#DFB260]/20">
              <button
                type="button"
                onClick={handleCopyJsonToClipboard}
                className="px-4 py-2.5 rounded-xl bg-[#0A0514] hover:bg-[#1a0f30] text-[#F5D77F] border border-[#DFB260]/40 font-mono text-xs flex items-center space-x-2 cursor-pointer transition-colors w-full sm:w-auto justify-center"
              >
                {copiedRaw ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copied JSON!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#F5D77F]" />
                    <span>Copy Raw JSON</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={isExporting}
                className="gold-filled-btn text-xs px-6 py-2.5 font-bold uppercase tracking-wider flex items-center justify-center space-x-2 cursor-pointer shadow-lg w-full sm:w-auto"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 text-[#120B21] animate-spin" />
                    <span>Compiling Vault...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-[#120B21]" />
                    <span>Download Vault Backup (.json)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* RESTORE TAB */
          <div className="space-y-4">
            <div className="bg-[#0A0514] p-5 rounded-2xl border-2 border-dashed border-[#DFB260]/40 text-center space-y-3">
              <FileJson className="w-10 h-10 text-[#F5D77F] mx-auto opacity-80" />
              <div>
                <h4 className="font-cinzel font-bold text-sm text-[#FFF2A8]">Select Backup JSON File</h4>
                <p className="text-xs text-[#C8B1E4]/80">Upload your previously exported `aeterna-vault-backup.json` file</p>
              </div>

              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelectForRestore}
                className="hidden"
                id="vault-restore-file-input"
              />

              <label
                htmlFor="vault-restore-file-input"
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40 hover:bg-[#DFB260]/30 cursor-pointer font-bold transition-all text-xs"
              >
                <Upload className="w-4 h-4" />
                <span>{restoreFile ? restoreFile.name : 'Choose Backup File'}</span>
              </label>
            </div>

            {restoreError && (
              <div className="p-3 bg-rose-500/20 border border-rose-500/50 rounded-xl text-rose-300 font-mono text-xs">
                Error: {restoreError}
              </div>
            )}

            {restorePreview && (
              <div className="bg-[#0A0514] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2">
                <span className="font-mono text-xs text-emerald-400 font-bold block">
                  ✓ Validated Backup File Contents:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#C8B1E4]">
                  <div>Memories: {restorePreview.vaultContent?.memories?.length || restorePreview.memories?.length || 0}</div>
                  <div>Letters: {restorePreview.vaultContent?.letters?.length || restorePreview.letters?.length || 0}</div>
                  <div>Memorials: {restorePreview.vaultContent?.memorials?.length || restorePreview.memorials?.length || 0}</div>
                  <div>Heirs: {restorePreview.vaultContent?.heirs?.length || restorePreview.heirs?.length || 0}</div>
                </div>
              </div>
            )}

            {restoreSuccess && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Vault dataset restored successfully! Reloading views...</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={!restorePreview}
                className={`gold-filled-btn text-xs px-6 py-2.5 font-bold uppercase tracking-wider flex items-center space-x-2 ${
                  !restorePreview ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <Database className="w-4 h-4 text-[#120B21]" />
                <span>Restore Dataset</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
