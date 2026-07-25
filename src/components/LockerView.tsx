import React, { useState } from 'react';
import { ViewMode } from '../types';
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
  HardDrive
} from 'lucide-react';

interface LockerViewProps {
  onSelectView: (view: ViewMode) => void;
}

export const LockerView: React.FC<LockerViewProps> = ({ onSelectView }) => {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState('');

  const documents = [
    { title: 'Oakhaven Manor Property Deed', category: 'Real Estate', size: '4.2 MB', level: 'Level 5 Protected', tx: 'ar_d33d_99182x' },
    { title: 'Family Trust & Asset Distribution Ledger', category: 'Legal Trust', size: '1.8 MB', level: 'Level 5 Protected', tx: 'ar_tr4st_88120y' },
    { title: 'Hardware Wallet Recovery Seeds (Multi-sig)', category: 'Cryptographic', size: '128 KB', level: 'Level 5 Quantum-Proof', tx: 'ar_s33d_55219z' },
    { title: 'Intellectual Property & Patent Portfolio', category: 'Patents', size: '8.4 MB', level: 'Level 5 Protected', tx: 'ar_p4t3nt_10928m' }
  ];

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length >= 4) {
      setUnlocked(true);
    }
  };

  return (
    <div id="locker-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 cosmic-card-gold p-8 rounded-3xl shadow-xl">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-[#F5D77F] mb-2">
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

        <div className="flex items-center space-x-2 font-mono text-xs font-bold text-[#FFF2A8] bg-[#120B21]/80 border border-[#DFB260]/40 rounded-2xl px-4 py-2.5">
          <Shield className="w-4 h-4 text-[#F5D77F]" />
          <span>Status: Sovereign Sealed</span>
        </div>
      </div>

      {!unlocked ? (
        /* Lock Screen */
        <div className="cosmic-card p-8 max-w-md mx-auto text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-[#F5D77F]" />
          </div>

          <div>
            <h3 className="font-cinzel font-bold text-[#FFF2A8] text-2xl">Sovereign PIN Required</h3>
            <p className="text-xs text-[#C8B1E4]/80 mt-1 font-medium">Enter your Master Vault Security Passcode to decrypt files.</p>
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
          <div className="flex items-center justify-between border-b border-[#DFB260]/30 pb-3">
            <h3 className="font-cinzel font-bold text-[#FFF2A8] text-2xl">Decrypted Assets</h3>
            <button
              onClick={() => setUnlocked(false)}
              className="text-xs font-semibold text-[#F5D77F] uppercase hover:underline cursor-pointer"
            >
              Relock Locker
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map((doc, idx) => (
              <div
                key={idx}
                className="cosmic-card p-5 space-y-3 shadow-xl hover:border-[#DFB260] transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center">
                      <FileText className="w-5 h-5 text-[#F5D77F]" />
                    </div>
                    <div>
                      <h4 className="font-cinzel font-bold text-[#FFF2A8] text-base">{doc.title}</h4>
                      <span className="text-[10px] text-[#C8B1E4]/70 font-mono font-semibold">{doc.category} • {doc.size}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-semibold uppercase px-2.5 py-1 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40">
                    {doc.level}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#C8B1E4]/80 font-mono pt-2 border-t border-[#DFB260]/20">
                  <span className="text-[11px] font-bold text-[#F5D77F]">{doc.tx}</span>
                  <button
                    onClick={() => alert(`Simulated Decryption & Download for: ${doc.title}`)}
                    className="text-[#FFF2A8] hover:text-[#F5D77F] font-semibold uppercase cursor-pointer"
                  >
                    Download & Decrypt
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Inheritance Trustees Configuration */}
          <div className="cosmic-card p-6 space-y-4 shadow-xl">
            <h4 className="font-cinzel font-bold text-[#FFF2A8] text-xl">Designated Inheritance Trustees</h4>
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

    </div>
  );
};
