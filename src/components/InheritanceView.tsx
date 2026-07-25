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

  // Simulation & Trigger State
  const [multiSigSignatures, setMultiSigSignatures] = useState<string[]>(['Clara Pendelton (Trustee)']);
  const [simulatedDecryptedId, setSimulatedDecryptedId] = useState<string | null>(null);
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
    <div id="inheritance-view" className="space-y-8 pb-20 text-[#2E2342]">
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs text-[#6B5E85] font-medium mb-1">
            <span onClick={() => onSelectView('dashboard')} className="hover:text-[#2E2342] cursor-pointer">Vault</span>
            <span>/</span>
            <span className="text-purple-900 font-semibold">Inheritance Protocol</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#2E2342]">
            Estate & Family Access Protocol
          </h1>
          <p className="text-xs text-[#6B5E85] font-medium mt-1">
            Configure dead man's switch triggers, invite verified heirs, and manage multi-sig fiduciary keys.
          </p>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsInviteOpen(true)}
            className="flex items-center space-x-1.5 bg-[#10B981] hover:bg-[#059669] text-white px-4 py-2.5 rounded-2xl text-xs font-semibold shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Invite Family Member</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {inviteSuccessToast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl text-xs flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Cryptographic invitation & verification hash sent to heir!</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 font-bold">RSA-4096 Key Issued</span>
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex border-b border-purple-100 space-x-2 sm:space-x-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('triggers')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'triggers'
              ? 'border-emerald-500 text-purple-900 font-bold'
              : 'border-transparent text-[#6B5E85] hover:text-[#2E2342]'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-600" />
          <span>Automated Triggers & Multi-Sig</span>
        </button>

        <button
          onClick={() => setActiveTab('family')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'family'
              ? 'border-emerald-500 text-purple-900 font-bold'
              : 'border-transparent text-[#6B5E85] hover:text-[#2E2342]'
          }`}
        >
          <Users className="w-4 h-4 text-purple-700" />
          <span>Family & Heir Access Rights ({heirs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('claim')}
          className={`flex items-center space-x-2 pb-3 px-3 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'claim'
              ? 'border-emerald-500 text-purple-900 font-bold'
              : 'border-transparent text-[#6B5E85] hover:text-[#2E2342]'
          }`}
        >
          <Unlock className="w-4 h-4 text-emerald-600" />
          <span>Beneficiary Access Portal</span>
          {triggerConfig.status === 'RELEASED' && (
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          )}
        </button>
      </div>

      {/* TAB 1: AUTOMATED TRIGGERS & MULTI-SIG */}
      {activeTab === 'triggers' && (
        <div className="space-y-6">
          
          {/* Status Banner */}
          <div className={`p-6 rounded-3xl border transition-all ${
            triggerConfig.status === 'RELEASED'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-950 shadow-sm'
              : 'bg-white border-purple-100 text-[#2E2342] shadow-sm'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${
                  triggerConfig.status === 'RELEASED' ? 'bg-emerald-600 text-white' : 'bg-purple-100 text-purple-800'
                }`}>
                  {triggerConfig.status === 'RELEASED' ? <Unlock className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">
                      Protocol Status: {triggerConfig.status}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                      triggerConfig.status === 'RELEASED' ? 'bg-emerald-200 text-emerald-900' : 'bg-purple-100 text-purple-900'
                    }`}>
                      {triggerConfig.status === 'RELEASED' ? 'UNLOCKED FOR HEIRS' : 'VAULT SEALED & ARMED'}
                    </span>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-[#2E2342]">
                    {triggerConfig.status === 'RELEASED' 
                      ? 'Inheritance Access Has Been Triggered & Unlocked' 
                      : 'Dead Man\'s Switch Active & Monitoring'}
                  </h3>
                  <p className="text-xs text-[#6B5E85] font-medium max-w-xl">
                    Vault decryption keys are programmed to automatically release to verified family trustees if inactivity exceeds {triggerConfig.deadMansSwitchDays} days or if multi-sig quorum is reached.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-shrink-0">
                <button
                  onClick={handleCheckIn}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>I'm Alive (Reset Inactivity)</span>
                </button>

                <button
                  onClick={handleToggleTriggerStatus}
                  className={`px-5 py-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                    triggerConfig.status === 'RELEASED'
                      ? 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900'
                  }`}
                >
                  {triggerConfig.status === 'RELEASED' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span>{triggerConfig.status === 'RELEASED' ? 'Re-Arm Vault' : 'Simulate Trigger Release'}</span>
                </button>
              </div>
            </div>

            {checkInResetSuccess && (
              <div className="mt-4 pt-3 border-t border-purple-100 text-xs text-emerald-700 font-semibold flex items-center space-x-2 animate-fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Check-in confirmed! Inactivity counter reset to 0 days. Cryptographic heartbeat recorded on Arweave ledger.</span>
              </div>
            )}
          </div>

          {/* Trigger Mechanism Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Dead Man's Switch (Inactivity Timer) */}
            <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#2E2342] text-base">Inactivity Dead Man's Switch</h4>
                    <p className="text-xs text-[#6B5E85] font-medium">Automatic key release after inactivity</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  {triggerConfig.deadMansSwitchDays} Days
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-sans">
                  <span className="text-[#6B5E85] font-medium">Last Check-in</span>
                  <span className="font-semibold text-[#2E2342]">{triggerConfig.lastCheckInDaysAgo} days ago</span>
                </div>
                <div className="w-full h-3 bg-purple-50 rounded-full overflow-hidden p-0.5 border border-purple-100">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, (triggerConfig.lastCheckInDaysAgo / triggerConfig.deadMansSwitchDays) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-[11px] text-[#6B5E85] font-medium">
                  If owner does not check in within <strong className="text-[#2E2342]">{triggerConfig.deadMansSwitchDays - triggerConfig.lastCheckInDaysAgo} days</strong>, keys will automatically decrypt for verified heirs.
                </p>
              </div>

              {/* Controls */}
              <div className="pt-2 border-t border-purple-100 space-y-3">
                <label className="block text-xs font-semibold text-[#2E2342]">Adjust Inactivity Period</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[60, 90, 180, 365].map(days => (
                    <button
                      key={days}
                      onClick={() => onUpdateTriggerConfig({ ...triggerConfig, deadMansSwitchDays: days })}
                      className={`py-2 rounded-xl font-semibold border transition-all cursor-pointer ${
                        triggerConfig.deadMansSwitchDays === days
                          ? 'bg-[#10B981] text-white border-emerald-600'
                          : 'bg-white text-[#6B5E85] border-purple-100 hover:bg-purple-50'
                      }`}
                    >
                      {days} Days
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Multi-Sig Fiduciary Consensus */}
            <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-[#2E2342] text-base">Multi-Sig Trustee Consensus</h4>
                    <p className="text-xs text-[#6B5E85] font-medium">Dual-key verification requirement</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-purple-900 bg-purple-100 px-2.5 py-1 rounded-full">
                  {multiSigSignatures.length} of {triggerConfig.multiSigTotal} Keys
                </span>
              </div>

              {/* Trustees Status List */}
              <div className="space-y-2 text-xs">
                {heirs.filter(h => h.accessRole === 'Full Trustee').map(trustee => {
                  const hasSigned = multiSigSignatures.includes(trustee.name);
                  return (
                    <div key={trustee.id} className="flex items-center justify-between p-3 rounded-2xl bg-purple-50/60 border border-purple-100">
                      <div className="flex items-center space-x-2">
                        <Shield className={`w-4 h-4 ${hasSigned ? 'text-emerald-600' : 'text-[#8C80A5]'}`} />
                        <div>
                          <div className="font-semibold text-[#2E2342]">{trustee.name}</div>
                          <div className="text-[10px] text-[#6B5E85] font-mono">{trustee.relationship}</div>
                        </div>
                      </div>
                      
                      {hasSigned ? (
                        <span className="flex items-center space-x-1 text-emerald-700 font-semibold bg-emerald-100 px-2.5 py-1 rounded-full text-[10px]">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Key Signed</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCoSignTrigger(trustee.name)}
                          className="bg-[#10B981] hover:bg-[#059669] text-white text-[11px] font-semibold px-3 py-1 rounded-xl transition-all cursor-pointer"
                        >
                          Simulate Co-Sign
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-[#6B5E85] font-medium pt-1">
                Requires at least <strong className="text-[#2E2342]">{triggerConfig.multiSigRequired} trustee signatures</strong> to instantly unlock vault assets prior to inactivity timer.
              </p>
            </div>

          </div>
        </div>
      )}

      {/* TAB 2: FAMILY & HEIR ACCESS RIGHTS */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-purple-100 rounded-3xl p-6 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-lg text-[#2E2342]">Designated Heirs & Beneficiaries</h3>
              <p className="text-xs text-[#6B5E85] font-medium mt-0.5">
                Manage individuals who hold cryptographic decryption access to your permanent Arweave vault.
              </p>
            </div>

            <button
              onClick={() => setIsInviteOpen(true)}
              className="inline-flex items-center space-x-1.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-5 py-2.5 rounded-2xl text-xs shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite New Heir</span>
            </button>
          </div>

          {/* Heirs Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {heirs.map(heir => (
              <div key={heir.id} className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  
                  {/* Top Avatar & Role */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-sm font-serif">
                        {heir.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-[#2E2342] text-base">{heir.name}</h4>
                        <p className="text-xs text-[#6B5E85] font-medium">{heir.relationship}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono bg-purple-50 text-purple-900 border border-purple-100">
                      {heir.status}
                    </span>
                  </div>

                  {/* Access Role Selector */}
                  <div className="pt-2 border-t border-purple-100 space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#6B5E85]">Access Level & Role</label>
                    <select
                      value={heir.accessRole}
                      onChange={(e) => onUpdateHeirRole(heir.id, e.target.value as any)}
                      className="w-full bg-purple-50/60 border border-purple-100 rounded-xl p-2 text-xs text-[#2E2342] font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Full Trustee">Full Trustee (Multi-sig + Full Access)</option>
                      <option value="Beneficiary / Decryptor">Beneficiary / Decryptor</option>
                      <option value="Viewer / Memory Keeper">Viewer / Memory Keeper (View Only)</option>
                    </select>
                  </div>

                  {/* Contact & Wallet Details */}
                  <div className="space-y-1 text-xs text-[#6B5E85]">
                    <div className="flex items-center space-x-2 font-medium">
                      <Mail className="w-3.5 h-3.5 text-[#8C80A5]" />
                      <span className="truncate">{heir.email}</span>
                    </div>
                    {heir.walletAddress && (
                      <div className="flex items-center space-x-2 font-mono text-[11px]">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-[#2E2342]">{heir.walletAddress}</span>
                      </div>
                    )}
                  </div>

                  {/* Assigned Categories */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-semibold text-[#6B5E85] uppercase tracking-wider">Assigned Vault Categories:</span>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {heir.assignedCategories.map(cat => (
                        <span key={cat} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-900">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-purple-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-mono text-[#8C80A5]">Invited: {heir.invitedAt}</span>
                  <button
                    onClick={() => onRemoveHeir(heir.id)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors"
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
          <div className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2E2342]">Beneficiary Claim & Decryption Portal</h3>
                  <p className="text-xs text-[#6B5E85] font-medium">Viewing inherited assets as Clara Pendelton (Primary Heir)</p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono ${
                triggerConfig.status === 'RELEASED'
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-purple-100 text-purple-900'
              }`}>
                {triggerConfig.status === 'RELEASED' ? 'UNLOCKED' : 'SEALED UNTIL TRIGGER'}
              </span>
            </div>

            {triggerConfig.status !== 'RELEASED' && (
              <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100 text-xs text-[#6B5E85] flex items-center justify-between">
                <span>Vault assets remain encrypted. You can test/simulate the release condition anytime using the trigger panel.</span>
                <button
                  onClick={handleToggleTriggerStatus}
                  className="bg-[#10B981] hover:bg-[#059669] text-white px-3.5 py-1.5 rounded-xl font-semibold cursor-pointer"
                >
                  Simulate Release
                </button>
              </div>
            )}
          </div>

          {/* Unlocked Inherited Items Grid */}
          <div className="space-y-4">
            <h4 className="font-serif font-bold text-base text-[#2E2342]">Unlocked Inherited Assets ({memories.length + letters.length})</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Letters & Time Capsules */}
              {letters.map(letter => (
                <div key={letter.id} className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                      Time Capsule Letter
                    </span>
                    <span className="text-[10px] font-mono text-[#8C80A5]">Arweave ID: {letter.arweaveId}</span>
                  </div>

                  <div>
                    <h5 className="font-serif font-bold text-base text-[#2E2342]">{letter.title}</h5>
                    <p className="text-xs text-[#6B5E85] mt-1 font-medium line-clamp-2">
                      {simulatedDecryptedId === letter.id ? letter.content : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-purple-100 flex items-center justify-between text-xs">
                    <span className="text-[#6B5E85] font-medium">Recipient: <strong>{letter.recipient}</strong></span>
                    
                    <button
                      onClick={() => setSimulatedDecryptedId(simulatedDecryptedId === letter.id ? null : letter.id)}
                      className="flex items-center space-x-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 px-3.5 py-1.5 rounded-xl font-semibold transition-all cursor-pointer"
                    >
                      {simulatedDecryptedId === letter.id ? <Lock className="w-3.5 h-3.5" /> : <Key className="w-3.5 h-3.5 text-emerald-600" />}
                      <span>{simulatedDecryptedId === letter.id ? 'Re-Lock' : 'Decrypt Letter'}</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Photos & Heirloom Memories */}
              {memories.map(mem => (
                <div key={mem.id} className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm hover:shadow-md transition-all flex space-x-4 items-center">
                  <img
                    src={mem.imageUrl}
                    alt={mem.title}
                    className="w-24 h-24 rounded-2xl object-cover border border-purple-100 flex-shrink-0"
                  />
                  <div className="flex-1 space-y-1">
                    <span className="text-[10px] font-mono font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-full">
                      {mem.category} • {mem.date}
                    </span>
                    <h5 className="font-serif font-bold text-sm text-[#2E2342]">{mem.title}</h5>
                    <p className="text-xs text-[#6B5E85] line-clamp-1 font-medium">{mem.description}</p>
                    <div className="pt-2 flex items-center justify-between text-xs flex-wrap gap-2">
                      <span className="text-[10px] font-mono text-emerald-700 font-semibold">{mem.encryptionLevel}</span>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => onSelectView('immortal')}
                          className="flex items-center space-x-1 text-purple-700 font-semibold hover:underline cursor-pointer bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200 text-[11px]"
                          title="View in Immortal Gateway Independent Viewer"
                        >
                          <Globe className="w-3.5 h-3.5 text-purple-600" />
                          <span>Immortal Gateway</span>
                        </button>
                        <button
                          onClick={() => alert(`Downloading verified Arweave heirloom asset ${mem.permawebTxId}`)}
                          className="flex items-center space-x-1 text-emerald-600 font-semibold hover:underline cursor-pointer text-[11px]"
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
        <div className="fixed inset-0 z-50 bg-[#2E2342]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-purple-100 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-lg text-[#2E2342]">Invite Family Heir</h3>
              </div>
              <button
                onClick={() => setIsInviteOpen(false)}
                className="text-[#6B5E85] hover:text-[#2E2342] font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#2E2342] font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={heirName}
                  onChange={(e) => setHeirName(e.target.value)}
                  placeholder="e.g. Clara Pendelton"
                  className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-xs text-[#2E2342] focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#2E2342] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={heirEmail}
                    onChange={(e) => setHeirEmail(e.target.value)}
                    placeholder="clara@family.org"
                    className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-xs text-[#2E2342] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[#2E2342] font-semibold mb-1">Relationship</label>
                  <input
                    type="text"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    placeholder="Daughter, Son..."
                    className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-xs text-[#2E2342] focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#2E2342] font-semibold mb-1">Arweave / ETH Wallet Address (Optional)</label>
                <input
                  type="text"
                  value={heirWallet}
                  onChange={(e) => setHeirWallet(e.target.value)}
                  placeholder="0x71C9... or Arweave Address"
                  className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-xs text-[#2E2342] font-mono focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[#2E2342] font-semibold mb-1">Access Role & Level</label>
                <select
                  value={accessRole}
                  onChange={(e) => setAccessRole(e.target.value as any)}
                  className="w-full bg-purple-50/50 border border-purple-100 rounded-xl p-2.5 text-xs text-[#2E2342] font-semibold focus:outline-none focus:border-emerald-500"
                >
                  <option value="Full Trustee">Full Trustee (Multi-sig + Full Access)</option>
                  <option value="Beneficiary / Decryptor">Beneficiary / Decryptor</option>
                  <option value="Viewer / Memory Keeper">Viewer / Memory Keeper (View Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-[#2E2342] font-semibold mb-1.5">Permitted Vault Categories</label>
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
                            ? 'bg-[#10B981] text-white'
                            : 'bg-purple-50 text-[#6B5E85] hover:bg-purple-100'
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
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 rounded-2xl shadow-md shadow-emerald-500/15 text-xs transition-all cursor-pointer"
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
