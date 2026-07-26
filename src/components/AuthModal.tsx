import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  X, 
  ShieldCheck, 
  KeyRound, 
  Mail, 
  Lock, 
  Wallet, 
  FileText, 
  CheckCircle2, 
  UserCheck, 
  LogOut, 
  ArrowRight, 
  ShieldAlert, 
  Sparkles,
  HelpCircle
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onSignIn: (user: UserProfile) => void;
  onSignOut: () => void;
  authMode?: 'signin' | 'signup';
  onClearDemoContent?: () => void;
  onRestoreDemoContent?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSignIn,
  onSignOut,
  authMode = 'signin',
  onClearDemoContent,
  onRestoreDemoContent
}) => {
  const [authType, setAuthType] = useState<'signin' | 'signup'>(authMode);
  const [startCleanVault, setStartCleanVault] = useState(true);

  useEffect(() => {
    setAuthType(authMode);
  }, [authMode, isOpen]);

  const [activeTab, setActiveTab] = useState<'email' | 'wallet' | 'jwk' | 'heir'>('email');
  
  // Registration / Sign Up extra fields
  const [signUpName, setSignUpName] = useState('');
  
  // Email Form State
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [role, setRole] = useState<'Vault Owner' | 'Trustee' | 'Heir / Beneficiary'>('Vault Owner');
  
  // Heir Access Code State
  const [heirAccessCode, setHeirAccessCode] = useState('');

  // JWK File State
  const [jwkFileName, setJwkFileName] = useState('');

  // Loading indicator
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleEmailSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    if (!passcode) {
      setAuthError('Please enter your vault master passcode.');
      return;
    }

    setIsAuthenticating(true);
    setTimeout(() => {
      const usernameRaw = email.split('@')[0] || 'User';
      const formattedName = usernameRaw.charAt(0).toUpperCase() + usernameRaw.slice(1);

      const newUser: UserProfile = {
        id: 'usr_' + Math.random().toString(36).substring(2, 9),
        name: formattedName,
        email: email,
        role: role,
        authMethod: 'Email & Passcode',
        walletAddress: '0x71C92a4f9a72b0c3d4E691',
        signedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        securityLevel: 'Quantum-Proof AES-GCM'
      };

      if (authType === 'signup' && startCleanVault && onClearDemoContent) {
        onClearDemoContent();
      }

      setIsAuthenticating(false);
      onSignIn(newUser);
      onClose();
    }, 800);
  };

  const handleWeb3SignIn = () => {
    setIsAuthenticating(true);
    setAuthError(null);

    setTimeout(() => {
      const newUser: UserProfile = {
        id: 'usr_arconnect_' + Math.random().toString(36).substring(2, 7),
        name: 'ArConnect Sovereign User',
        email: 'wallet-0x71c9@arweave.net',
        role: 'Vault Owner',
        authMethod: 'ArConnect / Web3',
        walletAddress: '0x71C92a4f9a72b0c3d4E691',
        signedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        securityLevel: 'Hardware Enclave'
      };
      setIsAuthenticating(false);
      onSignIn(newUser);
      onClose();
    }, 1000);
  };

  const handleJwkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setJwkFileName(file.name);
      setIsAuthenticating(true);
      setAuthError(null);

      setTimeout(() => {
        const newUser: UserProfile = {
          id: 'usr_jwk_' + Math.random().toString(36).substring(2, 7),
          name: 'JWK Sovereign Keyholder',
          email: 'keyfile-rsa4096@aeterna.vault',
          role: 'Vault Owner',
          authMethod: 'JWK Keyfile',
          walletAddress: 'ar_jwk_4096_71c9a8',
          signedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          securityLevel: 'Quantum-Proof AES-GCM'
        };
        setIsAuthenticating(false);
        onSignIn(newUser);
        onClose();
      }, 900);
    }
  };

  const handleHeirAccessSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!heirAccessCode) {
      setAuthError('Please enter your Heir Emergency Access Token.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    setTimeout(() => {
      const newUser: UserProfile = {
        id: 'usr_heir_' + Math.random().toString(36).substring(2, 7),
        name: 'Designated Heir / Trustee',
        email: 'trustee-verified@aeterna.vault',
        role: 'Heir / Beneficiary',
        authMethod: 'Heir Key Code',
        walletAddress: '0xHeir8921a0C',
        signedInAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        securityLevel: 'Standard Biometric'
      };
      setIsAuthenticating(false);
      onSignIn(newUser);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/80 backdrop-blur-md flex items-center justify-center p-4 text-[#E8DDF5]">
      <div className="cosmic-card-gold max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-fade-in border border-[#DFB260]">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#C8B1E4] hover:text-[#FFF2A8] text-sm font-semibold p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 text-[#F5D77F] text-xs font-mono font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-[#F5D77F]" />
            <span>Identity & Access Verification</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
            {currentUser 
              ? 'Aeterna Sovereign Profile' 
              : authType === 'signup' 
                ? 'Create 200-Year Vault Account' 
                : 'Sign In to Sovereign Vault'
            }
          </h2>
          <p className="text-xs text-[#C8B1E4]/80 font-medium">
            {currentUser 
              ? 'Manage your active encryption keys, access level, and session authorization.' 
              : authType === 'signup'
                ? 'Register your email and master encryption passcode to activate 200-year Arweave storage.'
                : 'Authenticate using email passcode, Web3 Arweave wallet, or trustee emergency access code.'
            }
          </p>

          {!currentUser && (
            <div className="flex items-center justify-center space-x-2 pt-2 border-b border-[#DFB260]/30 pb-3">
              <button
                type="button"
                onClick={() => setAuthType('signin')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authType === 'signin' ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md' : 'bg-[#120B21] text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                Sign In (Registered User)
              </button>
              <button
                type="button"
                onClick={() => setAuthType('signup')}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  authType === 'signup' ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md' : 'bg-[#120B21] text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                Sign Up (New User)
              </button>
            </div>
          )}
        </div>

        {/* If Already Signed In */}
        {currentUser ? (
          <div className="space-y-5">
            <div className="bg-[#120B21]/90 p-5 rounded-2xl border border-[#DFB260]/30 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#DFB260] to-[#b88e4c] text-[#120B21] flex items-center justify-center font-cinzel font-bold text-lg shadow-md">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-cinzel font-bold text-base text-[#FFF2A8]">{currentUser.name}</h3>
                    <p className="text-xs text-[#C8B1E4]/70 font-mono">{currentUser.email}</p>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#F5D77F]">
                  {currentUser.role}
                </span>
              </div>

              <div className="pt-3 border-t border-[#DFB260]/20 grid grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-[#C8B1E4]/70 block text-[10px]">AUTH METHOD:</span>
                  <span className="font-bold text-[#FFF2A8]">{currentUser.authMethod}</span>
                </div>
                <div>
                  <span className="text-[#C8B1E4]/70 block text-[10px]">SECURITY LEVEL:</span>
                  <span className="font-bold text-[#F5D77F]">{currentUser.securityLevel}</span>
                </div>
                <div>
                  <span className="text-[#C8B1E4]/70 block text-[10px]">WALLET ADDRESS:</span>
                  <span className="font-bold text-[#F5D77F] truncate block">{currentUser.walletAddress}</span>
                </div>
                <div>
                  <span className="text-[#C8B1E4]/70 block text-[10px]">SESSION TIME:</span>
                  <span className="font-bold text-[#FFF2A8]">{currentUser.signedInAt}</span>
                </div>
              </div>
            </div>

            {/* Demo Data Controls in User Profile */}
            <div className="p-4 bg-[#120B21]/80 rounded-2xl border border-[#DFB260]/30 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5D77F] block">
                Vault Demo Data Controls
              </span>
              <p className="text-[11px] text-[#C8B1E4]/80">
                You can wipe all sample demo memories to start with a fresh empty vault, or restore sample data.
              </p>
              <div className="flex items-center space-x-2 pt-1">
                {onClearDemoContent && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearDemoContent();
                      onClose();
                    }}
                    className="flex-1 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-500/40 rounded-xl font-semibold text-xs transition-all cursor-pointer text-center"
                  >
                    Clear Demo Content
                  </button>
                )}
                {onRestoreDemoContent && (
                  <button
                    type="button"
                    onClick={() => {
                      onRestoreDemoContent();
                      onClose();
                    }}
                    className="flex-1 py-2 bg-[#28134D] hover:bg-[#381B68] text-[#F5D77F] border border-[#DFB260]/40 rounded-xl font-semibold text-xs transition-all cursor-pointer text-center"
                  >
                    Restore Demo Data
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                onSignOut();
                onClose();
              }}
              className="w-full py-3 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-500/40 rounded-2xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out of Vault Session</span>
            </button>
          </div>
        ) : (
          /* Sign In Form Tabs */
          <div className="space-y-5">
            {/* Tab Navigation */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-[#120B21] rounded-2xl border border-[#DFB260]/30 text-xs font-semibold">
              <button
                onClick={() => { setActiveTab('email'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'email' ? 'bg-[#DFB260] text-[#120B21] font-bold' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                Passcode
              </button>

              <button
                onClick={() => { setActiveTab('wallet'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'wallet' ? 'bg-[#DFB260] text-[#120B21] font-bold' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                Web3
              </button>

              <button
                onClick={() => { setActiveTab('jwk'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'jwk' ? 'bg-[#DFB260] text-[#120B21] font-bold' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                JWK File
              </button>

              <button
                onClick={() => { setActiveTab('heir'); setAuthError(null); }}
                className={`py-2 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'heir' ? 'bg-[#DFB260] text-[#120B21] font-bold' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
                }`}
              >
                Heir Access
              </button>
            </div>

            {/* Auth Error Banner */}
            {authError && (
              <div className="bg-red-950/50 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {/* TAB 1: Email & Passcode Form */}
            {activeTab === 'email' && (
              <form onSubmit={handleEmailSignIn} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#FFF2A8] mb-1">
                    Vault Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#C8B1E4]/60 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. name@domain.com"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#120B21] border border-[#DFB260]/40 rounded-xl text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#FFF2A8] mb-1">
                    Master Vault Passcode / Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#C8B1E4]/60 absolute left-3 top-3" />
                    <input
                      type="password"
                      value={passcode}
                      onChange={(e) => setPasscode(e.target.value)}
                      placeholder="Enter 8+ char vault passcode"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#120B21] border border-[#DFB260]/40 rounded-xl text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#FFF2A8] mb-1">
                    Signing-in Access Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full p-2.5 bg-[#120B21] border border-[#DFB260]/40 rounded-xl text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium"
                  >
                    <option value="Vault Owner" className="bg-[#120B21]">Vault Owner (Full Access)</option>
                    <option value="Trustee" className="bg-[#120B21]">Designated Trustee / Executor</option>
                    <option value="Heir / Beneficiary" className="bg-[#120B21]">Heir / Beneficiary</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="gold-filled-btn w-full py-3 text-xs uppercase tracking-wider cursor-pointer mt-2"
                >
                  {isAuthenticating ? (
                    <span>Authenticating Quantum Key...</span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <span>Sign In & Unlock Vault</span>
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </button>
              </form>
            )}

            {/* TAB 2: Web3 Arweave Wallet Sign In */}
            {activeTab === 'wallet' && (
              <div className="space-y-4 text-xs text-center">
                <div className="bg-[#120B21]/80 p-6 rounded-2xl border border-[#DFB260]/30 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#DFB260]/20 text-[#F5D77F] border border-[#DFB260]/40 flex items-center justify-center mx-auto">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <h3 className="font-cinzel font-bold text-base text-[#FFF2A8]">ArConnect / Wander Signature Sign-In</h3>
                  <p className="text-xs text-[#C8B1E4]/80 max-w-xs mx-auto">
                    Authenticate using your cryptographic Arweave address signature. Zero password required.
                  </p>
                </div>

                <button
                  onClick={handleWeb3SignIn}
                  disabled={isAuthenticating}
                  className="gold-filled-btn w-full py-3 text-xs cursor-pointer"
                >
                  {isAuthenticating ? (
                    <span>Verifying Cryptographic Signature...</span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Sign In with ArConnect / Web3</span>
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* TAB 3: JWK Keyfile Sign In */}
            {activeTab === 'jwk' && (
              <div className="space-y-4 text-xs">
                <div className="border-2 border-dashed border-[#DFB260]/40 p-6 rounded-2xl bg-[#120B21]/60 text-center space-y-2">
                  <KeyRound className="w-8 h-8 text-[#F5D77F] mx-auto" />
                  <h3 className="font-cinzel font-bold text-sm text-[#FFF2A8]">Load Arweave JWK Wallet File</h3>
                  <p className="text-xs text-[#C8B1E4]/80">Select your offline RSA 4096-bit JSON Keyfile to unlock sovereign mode.</p>
                  
                  <label className="inline-block mt-2 gold-beveled-btn px-4 py-2 font-semibold cursor-pointer">
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleJwkUpload} 
                      className="hidden" 
                    />
                    <span>{jwkFileName ? `Selected: ${jwkFileName}` : 'Choose .json Keyfile'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* TAB 4: Heir Emergency Access Token Sign In */}
            {activeTab === 'heir' && (
              <form onSubmit={handleHeirAccessSignIn} className="space-y-4 text-xs">
                <div className="bg-[#DFB260]/10 p-4 rounded-2xl border border-[#DFB260]/30 space-y-1">
                  <div className="font-bold text-[#FFF2A8] flex items-center space-x-1.5 font-cinzel">
                    <Sparkles className="w-4 h-4 text-[#F5D77F]" />
                    <span>Designated Heir / Trustee Access Portal</span>
                  </div>
                  <p className="text-[11px] text-[#C8B1E4]/90">
                    If you received an emergency inheritance code or trustee invitation token, enter it below to claim assigned memory packages.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold text-[#FFF2A8] mb-1">
                    Emergency Heir Token Code
                  </label>
                  <input
                    type="text"
                    value={heirAccessCode}
                    onChange={(e) => setHeirAccessCode(e.target.value)}
                    placeholder="e.g. HEIR-7731-AETERNA-VAULT"
                    className="w-full p-2.5 bg-[#120B21] border border-[#DFB260]/40 rounded-xl text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-mono text-xs"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthenticating}
                  className="gold-filled-btn w-full py-3 text-xs cursor-pointer"
                >
                  {isAuthenticating ? (
                    <span>Verifying Emergency Code...</span>
                  ) : (
                    <span className="flex items-center justify-center space-x-2">
                      <UserCheck className="w-4 h-4" />
                      <span>Redeem Heir Token & Access Vault</span>
                    </span>
                  )}
                </button>
              </form>
            )}

          </div>
        )}

      </div>
    </div>
  );
};
