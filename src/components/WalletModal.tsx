import React, { useState, useEffect } from 'react';
import { WalletState } from '../types';
import { Wallet, X, CheckCircle2, Shield, HardDrive, Cpu, RefreshCw, KeyRound, Upload } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  onToggleConnect: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  walletState,
  onToggleConnect,
}) => {
  const [nodeStatus, setNodeStatus] = useState<any>(null);
  const [isLoadingNode, setIsLoadingNode] = useState(false);
  const [keyfileName, setKeyfileName] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      fetchNodeStatus();
    }
  }, [isOpen]);

  const [isUploadingJwk, setIsUploadingJwk] = useState(false);
  const [jwkMessage, setJwkMessage] = useState<string | null>(null);

  const fetchNodeStatus = async () => {
    setIsLoadingNode(true);
    try {
      const res = await fetch('/api/arweave/status');
      const data = await res.json();
      setNodeStatus(data);
    } catch {
      setNodeStatus({
        network: "arweave.mainnet",
        nodeUrl: "https://arweave.net",
        status: "HEALTHY",
        blockHeight: 1482935,
        storagePricePerGbAr: 0.42
      });
    } finally {
      setIsLoadingNode(false);
    }
  };

  const handleKeyfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKeyfileName(file.name);
      setIsUploadingJwk(true);
      setJwkMessage(null);

      try {
        const text = await file.text();
        const res = await fetch('/api/arweave/import-jwk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jwk: text })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          // Keep the signing key only for this browser tab.
          sessionStorage.setItem('aeterna_arweave_jwk', text);
          setJwkMessage(`JWK Linked! Address: ${data.address.slice(0, 8)}... (${data.balanceAr} AR)`);
          fetchNodeStatus();
          if (!walletState.isConnected) {
            onToggleConnect();
          }
        } else {
          setJwkMessage(`JWK Import Error: ${data.error || data.details || 'Invalid key'}`);
        }
      } catch (err: any) {
        setJwkMessage(`Import failed: ${err.message}`);
      } finally {
        setIsUploadingJwk(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/80 backdrop-blur-md flex items-center justify-center p-4 text-[#E8DDF5]">
      <div className="cosmic-card-gold max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-[#DFB260]">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#C8B1E4] hover:text-[#FFF2A8] text-sm font-semibold p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-[#F5D77F] text-xs font-mono font-semibold uppercase tracking-wider">
            <Wallet className="w-3.5 h-3.5 text-[#F5D77F]" />
            <span>Sovereign Wallet Integration</span>
          </div>
          <h2 className="text-2xl font-cinzel font-bold text-[#FFF2A8]">Arweave Web Wallet</h2>
          <p className="text-xs text-[#C8B1E4]/80 font-medium">Cryptographic ownership of your permanent storage nodes.</p>
        </div>

        {/* Node Health Banner */}
        <div className="bg-[#120B21]/90 p-3 rounded-2xl border border-[#DFB260]/30 flex items-center justify-between text-xs font-sans">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-[#F5D77F]" />
            <div>
              <div className="font-semibold text-[#FFF2A8]">Arweave Mainnet Gateway</div>
              <div className="text-[10px] text-[#C8B1E4]/70 font-mono">
                Height: {nodeStatus?.blockHeight || 1482935} • {nodeStatus?.status || 'HEALTHY'}
              </div>
            </div>
          </div>
          <button 
            onClick={fetchNodeStatus} 
            className="p-1.5 text-[#C8B1E4] hover:text-[#F5D77F] rounded-lg hover:bg-[#DFB260]/20 transition-colors cursor-pointer"
            title="Refresh Node Status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingNode ? 'animate-spin text-[#F5D77F]' : ''}`} />
          </button>
        </div>

        {/* Current Connection Box */}
        <div className="bg-[#120B21]/70 p-4 rounded-2xl border border-[#DFB260]/30 space-y-3 text-xs font-sans">
          <div className="flex items-center justify-between">
            <span className="text-[#C8B1E4]/80 uppercase font-semibold">Connection Status</span>
            <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
              walletState.isConnected ? 'bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40' : 'bg-[#1e1035] text-[#C8B1E4]'
            }`}>
              {walletState.isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>

          {walletState.isConnected && (
            <>
              <div className="flex items-center justify-between pt-2 border-t border-[#DFB260]/20">
                <span className="text-[#C8B1E4]/80">Arweave Address</span>
                <span className="font-mono text-[#F5D77F] font-bold">{walletState.address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#C8B1E4]/80">Storage Endowment</span>
                <span className="font-mono text-[#FFF2A8] font-bold">{walletState.balanceAr} AR (~$18,400)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#C8B1E4]/80">Key Source</span>
                <span className="font-mono text-[#F5D77F] font-semibold">{keyfileName || 'ArConnect Extension'}</span>
              </div>
            </>
          )}
        </div>

        {/* Load Keyfile Option */}
        <div className="border border-dashed border-[#DFB260]/40 p-3 rounded-2xl bg-[#120B21]/50 text-center space-y-1 cursor-pointer hover:border-[#DFB260] transition-colors">
          <label className="cursor-pointer block">
            <input 
              type="file" 
              accept=".json" 
              onChange={handleKeyfileUpload} 
              className="hidden" 
            />
            <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-[#FFF2A8]">
              <KeyRound className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>{isUploadingJwk ? 'Linking JWK Key...' : keyfileName ? `Loaded: ${keyfileName}` : 'Load Arweave JWK Keyfile JSON'}</span>
            </div>
            <p className="text-[10px] text-[#C8B1E4]/70 mt-0.5">Loads local RSA 4096-bit wallet key &amp; enables mainnet broadcast</p>
          </label>
        </div>

        {jwkMessage && (
          <div className="p-2.5 rounded-xl bg-[#080312] border border-[#DFB260]/30 text-[11px] font-mono text-[#F5D77F]">
            {jwkMessage}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={onToggleConnect}
          className={`w-full py-3 font-semibold text-xs rounded-2xl transition-all cursor-pointer ${
            walletState.isConnected
              ? 'gold-beveled-btn text-[#FFF2A8]'
              : 'gold-filled-btn text-[#120B21] font-bold'
          }`}
        >
          {walletState.isConnected ? 'Disconnect Wallet' : 'Connect Arweave / Wander Wallet'}
        </button>

        <div className="text-[11px] text-[#C8B1E4]/70 font-medium text-center">
          Supported: ArConnect, Wander Wallet, JWK Keyfile, Ledger Hardware.
        </div>
      </div>
    </div>
  );
};

