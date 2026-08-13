import React, { useState } from 'react';
import { Heir, InheritanceTriggerConfig, MemoryItem, LegacyLetter } from '../types';
import { 
  Users, 
  ShieldCheck, 
  Clock, 
  Key, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Send, 
  Trash2, 
  Shield, 
  Mail, 
  Eye, 
  Download, 
  FileText, 
  Sparkles, 
  Check, 
  AlertTriangle,
  ChevronRight,
  KeyRound,
  FileCheck,
  Globe,
  ExternalLink
} from 'lucide-react';

interface InheritanceViewProps {
  heirs: Heir[];
  onAddHeir: (heir: Heir) => void;
  onRemoveHeir: (heirId: string) => void;
  onUpdateHeirRole: (heirId: string, role: Heir['accessRole']) => void;
  triggerConfig: InheritanceTriggerConfig;
  onUpdateTriggerConfig: (config: InheritanceTriggerConfig) => void;
  memories: MemoryItem[];
  letters: LegacyLetter[];
  onSelectView: (view: any) => void;
}

export const InheritanceView: React.FC<InheritanceViewProps> = ({
  heirs,
  onAddHeir,
  onRemoveHeir,
  onUpdateHeirRole,
  triggerConfig,
  onUpdateTriggerConfig,
  memories,
  letters,
  onSelectView
}) => {
  const [activeTab, setActiveTab] = useState<'triggers' | 'family' | 'claim'>('triggers');

  // Invite Modal State
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [heirName, setHeirName] = useState('');
  const [heirEmail, setHeirEmail] = useState('');
  const [heirWallet, setHeirWallet] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [accessRole, setAccessRole] = useState<Heir['accessRole']>('Beneficiary / Decryptor');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Family', 'Time Capsule']);
  const [inviteSuccessToast, setInviteSuccessToast] = useState(false);

  // Decryption & Trigger State
  const [multiSigSignatures, setMultiSigSignatures] = useState<string[]>(['Clara Pendelton (Trustee)']);
  const [activeDecryptedId, setActiveDecryptedId] = useState<string | null>(null);
  const [checkInResetSuccess, setCheckInResetSuccess] = useState(false);

  const availableCategories = ['Personal', 'Family', 'Legal', 'Time Capsule', 'Memorial'];

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heirName || !heirEmail) return;

    const newHeir: Heir = {
      id: `heir-${Date.now()}`,
      name: heirName,
      email: heirEmail,
      walletAddress: heirWallet || '0x' + Math.random().toString(16).substring(2, 10).toUpperCase(),
      relationship,
      accessRole,
      status: 'Pending Invitation',
      assignedCategories: selectedCategories,
      invitedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      verificationHash: '0x' + Math.random().toString(16).substring(2, 18)
    };

    onAddHeir(newHeir);
    setHeirName('');
    setHeirEmail('');
    setHeirWallet('');
    setIsInviteOpen(false);
    setInviteSuccessToast(true);
    setTimeout(() => setInviteSuccessToast(false), 4000);
  };

  const handleCheckIn = () => {
    onUpdateTriggerConfig({
      ...triggerConfig,
      lastCheckInDaysAgo: 0
    });
    setCheckInResetSuccess(true);
    setTimeout(() => setCheckInResetSuccess(false), 3000);
  };

  const handleToggleTriggerStatus = () => {
    const nextStatus = triggerConfig.status === 'RELEASED' ? 'ARMED' : 'RELEASED';
    onUpdateTriggerConfig({
      ...triggerConfig,
      status: nextStatus
    });
  };

  const handleCoSignTrigger = (heirName: string) => {
    if (!multiSigSignatures.includes(heirName)) {
      const updated = [...multiSigSignatures, heirName];
      setMultiSigSignatures(updated);

      if (updated.length >= triggerConfig.multiSigRequired && triggerConfig.status !== 'RELEASED') {
        onUpdateTriggerConfig({
          ...triggerConfig,
          status: 'RELEASED'
        });
      }
    }
  };

  return (
    <div id="inheritance-view" className="space-y-8 pb-20 text-[#E8DDF5]">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#C8B1E4] font-medium mb-1">
            <span onClick={() => onSelectView('dashboard')} className="hover:text-[#FFF2A8] cursor-pointer">Vault</span>
            <span>/</span>
            <span className="text-[#F5D77F] font-semibold">Family Access</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
            Estate & Family Access Protocol
          </h1>
          <p className="text-xs text-[#C8B1E4] font-medium mt-1">
            Configure dead man's switch triggers, invite verified heirs, and manage multi-sig fiduciary keys.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="gold-filled-btn text-xs px-5 py-2.5 flex items-center space-x-1.5 cursor-pointer shadow-[0_0_20px_rgba(245,215,127,0.3)]"
          >
            <UserPlus className="w-4 h-4 text-[#120B21]" />
            <span>+ Invite Family Member</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {inviteSuccessToast && (
        <div className="bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] p-4 rounded-2xl text-xs flex items-center justify-between shadow-md animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
            <span>Cryptographic invitation & verification hash sent to heir!</span>
          </div>
          <span className="text-[10px] font-mono text-[#F5D77F] font-bold">RSA-4096 Key Issued</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex border-b border-[#DFB260]/30 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'triggers'
              ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
              : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
          }`}
        >
          <Clock className="w-4 h-4 text-[#F5D77F]" />
          <span>Automated Triggers & Multi-Sig</span>
        </button>

        <button
          onClick={() => setActiveTab('family')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'family'
              ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
              : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
          }`}
        >
          <Users className="w-4 h-4 text-[#F5D77F]" />
          <span>Family & Heir Access Rights ({heirs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('claim')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'claim'
              ? 'border-[#F5D77F] text-[#FFF2A8] font-bold'
              : 'border-transparent text-[#C8B1E4] hover:text-[#FFF2A8]'
          }`}
        >
          <Unlock className="w-4 h-4 text-[#F5D77F]" />
          <span>Beneficiary Access Portal</span>
          {triggerConfig.status === 'RELEASED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          )}
        </button>
      </div>

      {/* TAB 1: AUTOMATED TRIGGERS & MULTI-SIG */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          
          {/* Status Banner */}
          <div className="cosmic-card-gold p-6 rounded-3xl border border-[#DFB260]/40 shadow-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#120B21] text-[#F5D77F] border border-[#DFB260]/40 shadow-md">
                  {triggerConfig.status === 'RELEASED' ? <Unlock className="w-6 h-6 text-emerald-400" /> : <ShieldCheck className="w-6 h-6 text-[#F5D77F]" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5D77F]">
                      Protocol Status: {triggerConfig.status}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/30">
                      {triggerConfig.status === 'RELEASED' ? 'UNLOCKED FOR HEIRS' : 'VAULT SEALED & ARMED'}
                    </span>
                  </div>
                  <h3 className="text-lg font-cinzel font-bold text-[#FFF2A8]">
                    {triggerConfig.status === 'RELEASED' 
                      ? 'Inheritance Access Has Been Triggered & Unlocked' 
                      : 'Dead Man\'s Switch Active & Monitoring'}
                  </h3>
                  <p className="text-xs text-[#C8B1E4] font-medium max-w-xl">
                    Vault decryption keys are programmed to automatically release to verified family trustees if inactivity exceeds {triggerConfig.deadMansSwitchDays} days or if multi-sig quorum is reached.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleCheckIn}
                  className="gold-filled-btn text-xs px-5 py-3 flex items-center justify-center space-x-2 cursor-pointer shadow-[0_0_15px_rgba(245,215,127,0.25)]"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#120B21]" />
                  <span>I'm Alive (Reset Inactivity)</span>
                </button>

                <button
                  onClick={handleToggleTriggerStatus}
                  className="px-5 py-3 rounded-2xl text-xs font-semibold bg-[#1a0f30] hover:bg-[#28174a] text-[#F5D77F] border border-[#DFB260]/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  {triggerConfig.status === 'RELEASED' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{triggerConfig.status === 'RELEASED' ? 'Re-Arm Vault' : 'Simulate Trigger Release'}</span>
                </button>
              </div>
            </div>

            {checkInResetSuccess && (
              <div className="mt-4 pt-3 border-t border-[#DFB260]/20 text-xs text-emerald-400 font-semibold flex items-center space-x-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Check-in confirmed! Inactivity counter reset to 0 days. Cryptographic heartbeat recorded on Arweave ledger.</span>
              </div>
            )}
          </div>

          {/* Trigger Mechanism Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Dead Man's Switch (Inactivity Timer) */}
            <div className="cosmic-card p-6 rounded-3xl space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0A0514] text-[#F5D77F] border border-[#DFB260]/30 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-[#FFF2A8] text-base">Inactivity Dead Man's Switch</h4>
                    <p className="text-xs text-[#C8B1E4] font-medium">Automatic key release after inactivity</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#F5D77F] bg-[#DFB260]/20 px-2.5 py-1 rounded-full border border-[#DFB260]/30">
                  {triggerConfig.deadMansSwitchDays} Days
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-[#C8B1E4] font-medium">Last Check-in</span>
                  <span className="font-semibold text-[#FFF2A8]">{triggerConfig.lastCheckInDaysAgo} days ago</span>
                </div>
                <div className="w-full h-3 bg-[#0A0514] rounded-full overflow-hidden p-0.5 border border-[#DFB260]/30">
                  <div 
                    className="h-full bg-gradient-to-r from-[#DFB260] to-[#F5D77F] rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(245,215,127,0.5)]" 
                    style={{ width: `${Math.min(100, (triggerConfig.lastCheckInDaysAgo / triggerConfig.deadMansSwitchDays) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[#C8B1E4] font-medium">
                  If owner does not check in within <strong className="text-[#FFF2A8]">{triggerConfig.deadMansSwitchDays - triggerConfig.lastCheckInDaysAgo} days</strong>, keys will automatically decrypt for verified heirs.
                </p>
              </div>

              {/* Controls */}
              <div className="pt-2 border-t border-[#DFB260]/20 space-y-3">
                <label className="block text-xs font-semibold text-[#FFF2A8]">Adjust Inactivity Period</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[60, 90, 180, 365].map(days => (
                    <button
                      key={days}
                      onClick={() => onUpdateTriggerConfig({ ...triggerConfig, deadMansSwitchDays: days })}
                      className={`py-2 rounded-xl font-semibold border transition-all cursor-pointer ${
                        triggerConfig.deadMansSwitchDays === days
                          ? 'gold-filled-btn text-xs'
                          : 'bg-[#0A0514] text-[#C8B1E4] border border-[#DFB260]/30 hover:border-[#F5D77F]'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Multi-Sig Fiduciary Consensus */}
            <div className="cosmic-card p-6 rounded-3xl space-y-5 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#0A0514] text-[#F5D77F] border border-[#DFB260]/30 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-cinzel font-bold text-[#FFF2A8] text-base">Multi-Sig Trustee Consensus</h4>
                    <p className="text-xs text-[#C8B1E4] font-medium">Dual-key verification requirement</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-[#F5D77F] bg-[#DFB260]/20 px-2.5 py-1 rounded-full border border-[#DFB260]/30">
                  {multiSigSignatures.length} of {triggerConfig.multiSigTotal} Keys
                </span>
              </div>

              {/* Trustees Status List */}
              <div className="space-y-2 text-xs">
                {heirs.filter(h => h.accessRole === 'Full Trustee').map(trustee => {
                  const hasSigned = multiSigSignatures.includes(trustee.name);
                  return (
                    <div key={trustee.id} className="flex items-center justify-between p-3 rounded-2xl bg-[#0A0514]/80 border border-[#DFB260]/30">
                      <div className="flex items-center space-x-2">
                        <Shield className={`w-4 h-4 ${hasSigned ? 'text-emerald-400' : 'text-[#C8B1E4]'}`} />
                        <div>
                          <div className="font-semibold text-[#FFF2A8]">{trustee.name}</div>
                          <div className="text-[10px] text-[#C8B1E4] font-mono">{trustee.relationship}</div>
                        </div>
                      </div>
                      
                      {hasSigned ? (
                        <span className="flex items-center space-x-1 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-full text-[10px]">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Key Signed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCoSignTrigger(trustee.name)}
                          className="gold-filled-btn text-[11px] font-semibold px-3 py-1 cursor-pointer"
                        >
                          Simulate Co-Sign
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#C8B1E4] font-medium pt-1">
                Requires at least <strong className="text-[#FFF2A8]">{triggerConfig.multiSigRequired} trustee signatures</strong> to instantly unlock vault assets prior to inactivity timer.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: FAMILY & HEIR ACCESS RIGHTS */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cosmic-card-gold p-6 rounded-3xl border border-[#DFB260]/40 shadow-2xl">
            <div>
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">Designated Heirs & Beneficiaries</h3>
              <p className="text-xs text-[#C8B1E4] font-medium mt-0.5">
                Manage individuals who hold cryptographic decryption access to your permanent Arweave vault.
              </p>
            </div>

            <button
              onClick={() => setIsInviteOpen(true)}
              className="gold-filled-btn text-xs px-5 py-2.5 flex items-center space-x-1.5 cursor-pointer shadow-[0_0_20px_rgba(245,215,127,0.3)]"
            >
              <UserPlus className="w-4 h-4 text-[#120B21]" />
              <span>Invite New Heir</span>
            </button>
          </div>

          {/* Heirs Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {heirs.map(heir => (
              <div key={heir.id} className="cosmic-card p-6 rounded-3xl space-y-4 hover:border-[#F5D77F] transition-all flex flex-col justify-between shadow-2xl">
                <div className="space-y-3">
                  
                  {/* Top Avatar & Role */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0A0514] text-[#F5D77F] border border-[#DFB260]/40 flex items-center justify-center font-bold text-sm font-cinzel">
                        {heir.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-cinzel font-bold text-[#FFF2A8] text-base">{heir.name}</h4>
                        <p className="text-xs text-[#C8B1E4] font-medium">{heir.relationship}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/30">
                      {heir.status}
                    </span>
                  </div>

                  {/* Access Role Selector */}
                  <div className="pt-2 border-t border-[#DFB260]/20 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#C8B1E4]">Access Level & Role</label>
                    <select
                      value={heir.accessRole}
                      onChange={(e) => onUpdateHeirRole(heir.id, e.target.value as any)}
                      className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2 text-xs text-[#FFF2A8] font-semibold focus:outline-none focus:border-[#F5D77F]"
                    >
                      <option value="Full Trustee">Full Trustee (Multi-sig + Full Access)</option>
                      <option value="Beneficiary / Decryptor">Beneficiary / Decryptor</option>
                      <option value="Viewer / Memory Keeper">Viewer / Memory Keeper (View Only)</option>
                    </select>
                  </div>

                  {/* Contact & Wallet Details */}
                  <div className="space-y-1 text-xs text-[#C8B1E4]">
                    <div className="flex items-center space-x-2 font-medium">
                      <Mail className="w-3.5 h-3.5 text-[#F5D77F]" />
                      <span className="truncate">{heir.email}</span>
                    </div>
                    {heir.walletAddress && (
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <Key className="w-3.5 h-3.5 text-[#F5D77F]" />
                        <span className="font-bold text-[#FFF2A8]">{heir.walletAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Categories */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-[#C8B1E4] uppercase tracking-wider">Assigned Vault Categories:</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {heir.assignedCategories.map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/30">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[#C8B1E4]">Invited: {heir.invitedAt}</span>
                  <button
                    onClick={() => onRemoveHeir(heir.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded-lg hover:bg-red-950/50 transition-colors cursor-pointer"
                    title="Revoke Heir Access"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* TAB 3: BENEFICIARY ACCESS PORTAL */}
      {activeTab === 'claim' && (
        <div className="space-y-6">
          
          {/* Status Banner for Beneficiaries */}
          <div className="cosmic-card-gold p-6 rounded-3xl border border-[#DFB260]/40 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#120B21] text-[#F5D77F] border border-[#DFB260]/40 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">Beneficiary Claim & Decryption Portal</h3>
                  <p className="text-xs text-[#C8B1E4] font-medium">Viewing inherited assets as Clara Pendelton (Primary Heir)</p>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40">
                {triggerConfig.status === 'RELEASED' ? 'UNLOCKED' : 'SEALED UNTIL TRIGGER'}
              </span>
            </div>

            {triggerConfig.status !== 'RELEASED' && (
              <div className="bg-[#0A0514]/80 p-4 rounded-2xl border border-[#DFB260]/30 text-xs text-[#C8B1E4] flex items-center justify-between">
                <span>Vault assets remain encrypted. You can test/simulate the release condition anytime using the trigger panel.</span>
                <button
                  onClick={handleToggleTriggerStatus}
                  className="gold-filled-btn text-xs px-3.5 py-1.5 cursor-pointer"
                >
                  Simulate Release
                </button>
              </div>
            )}
          </div>

          {/* Unlocked Inherited Items Grid */}
          <div className="space-y-4">
            <h4 className="font-cinzel font-bold text-base text-[#FFF2A8]">Unlocked Inherited Assets ({memories.length + letters.length})</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Letters & Time Capsules */}
              {letters.map(letter => (
                <div key={letter.id} className="cosmic-card p-6 rounded-3xl space-y-4 hover:border-[#F5D77F] transition-all shadow-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-[#F5D77F] bg-[#DFB260]/20 px-2.5 py-0.5 rounded-full border border-[#DFB260]/30">
                      Time Capsule Letter
                    </span>
                    <span className="text-[10px] font-mono text-[#C8B1E4]">Arweave ID: {letter.arweaveId}</span>
                  </div>

                  <div>
                    <h5 className="font-cinzel font-bold text-base text-[#FFF2A8]">{letter.title}</h5>
                    <p className="text-xs text-[#C8B1E4] mt-1 font-medium line-clamp-2">
                      {activeDecryptedId === letter.id ? letter.content : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#DFB260]/20 flex items-center justify-between text-xs">
                    <span className="text-[#C8B1E4] font-medium">Recipient: <strong className="text-[#FFF2A8]">{letter.recipient}</strong></span>
                    
                    <button
                      onClick={() => setActiveDecryptedId(activeDecryptedId === letter.id ? null : letter.id)}
                      className="flex items-center space-x-1.5 bg-[#1a0f30] hover:bg-[#28174a] text-[#F5D77F] border border-[#DFB260]/30 px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                      {activeDecryptedId === letter.id ? <Lock className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5 text-[#F5D77F]" />}
                      <span>{activeDecryptedId === letter.id ? 'Re-Lock' : 'Decrypt Letter'}</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Photos & Heirloom Memories */}
              {memories.map(mem => (
                <div key={mem.id} className="cosmic-card p-6 rounded-3xl space-y-4 hover:border-[#F5D77F] transition-all flex space-x-4 items-center shadow-2xl">
                  <img
                    src={mem.imageUrl}
                    alt={mem.title}
                    className="w-24 h-24 rounded-2xl object-cover border border-[#DFB260]/30 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-mono font-semibold text-[#F5D77F] bg-[#DFB260]/20 px-2 py-0.5 rounded-full border border-[#DFB260]/30">
                      {mem.category} • {mem.date}
                    </span>
                    <h5 className="font-cinzel font-bold text-sm text-[#FFF2A8]">{mem.title}</h5>
                    <p className="text-xs text-[#C8B1E4] line-clamp-1 font-medium">{mem.description}</p>
                    <div className="pt-2 flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="text-[10px] font-mono text-[#F5D77F] font-semibold">{mem.encryptionLevel}</span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onSelectView('immortal')}
                          className="flex items-center space-x-1 text-[#F5D77F] font-semibold hover:underline cursor-pointer bg-[#0A0514] px-2 py-0.5 rounded-lg border border-[#DFB260]/30 text-[11px]"
                          title="View in Immortal Gateway Independent Viewer"
                        >
                          <Globe className="w-3.5 h-3.5 text-[#F5D77F]" />
                          <span>Immortal Gateway</span>
                        </button>
                        <button
                          onClick={() => alert(`Downloading verified Arweave heirloom asset ${mem.permawebTxId}`)}
                          className="flex items-center space-x-1 text-[#F5D77F] font-semibold hover:underline cursor-pointer text-[11px]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>

        </div>
      )}

      {/* INVITE HEIR MODAL */}
      {isInviteOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card-gold p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-5 shadow-2xl relative border border-[#DFB260]/50">
            <div className="flex items-center justify-between border-b border-[#DFB260]/20 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-[#F5D77F]" />
                <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8]">Invite Family Heir</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-[#C8B1E4] hover:text-white font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#F5D77F] font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={heirName}
                  onChange={(e) => setHeirName(e.target.value)}
                  placeholder="e.g. Clara Pendelton"
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#F5D77F] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={heirEmail}
                    onChange={(e) => setHeirEmail(e.target.value)}
                    placeholder="clara@family.org"
                    className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[#F5D77F] font-semibold mb-1">Relationship</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Daughter, Son..."
                    className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#F5D77F] font-semibold mb-1">Arweave / ETH Wallet Address (Optional)</label>
                <input
                  type="text"
                  value={heirWallet}
                  onChange={(e) => setHeirWallet(e.target.value)}
                  placeholder="0x71C9... or Arweave Address"
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/50 font-mono focus:outline-none focus:border-[#F5D77F] font-medium"
                />
              </div>

              <div>
                <label className="block text-[#F5D77F] font-semibold mb-1">Access Role & Level</label>
                <select
                  value={accessRole}
                  onChange={(e) => setAccessRole(e.target.value as any)}
                  className="w-full bg-[#0A0514] border border-[#DFB260]/30 rounded-xl p-2.5 text-xs text-[#FFF2A8] font-semibold focus:outline-none focus:border-[#F5D77F]"
                >
                  <option value="Full Trustee">Full Trustee (Multi-sig + Full Access)</option>
                  <option value="Beneficiary / Decryptor">Beneficiary / Decryptor</option>
                  <option value="Viewer / Memory Keeper">Viewer / Memory Keeper (View Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#F5D77F] font-semibold mb-1.5">Permitted Vault Categories</label>
                <div className="flex flex-wrap gap-1.5">
                  {availableCategories.map(cat => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? 'gold-filled-btn text-xs'
                            : 'bg-[#0A0514] text-[#C8B1E4] border border-[#DFB260]/30 hover:border-[#F5D77F]'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="gold-filled-btn w-full py-3 text-xs cursor-pointer"
                >
                  Issue Cryptographic Heir Key & Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
