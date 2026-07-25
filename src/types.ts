export type ViewMode = 
  | 'dashboard' 
  | 'landing' 
  | 'pricing' 
  | 'legacy' 
  | 'search' 
  | 'empty' 
  | 'memorials' 
  | 'locker'
  | 'inheritance'
  | 'immortal';

export interface Heir {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  relationship: string;
  accessRole: 'Full Trustee' | 'Beneficiary / Decryptor' | 'Viewer / Memory Keeper';
  status: 'Key Verified' | 'Pending Invitation' | 'Declined';
  assignedCategories: string[];
  invitedAt: string;
  verificationHash: string;
}

export interface InheritanceTriggerConfig {
  deadMansSwitchDays: number;
  lastCheckInDaysAgo: number;
  multiSigRequired: number;
  multiSigTotal: number;
  status: 'ARMED' | 'TRIGGERED_EXECUTING' | 'RELEASED' | 'PAUSED';
  medicalReleaseEnabled: boolean;
}

export interface MemoryItem {
  id: string;
  title: string;
  category: 'Personal' | 'Family' | 'Legal' | 'Memorial' | 'Time Capsule';
  date: string;
  time?: string;
  location?: string;
  imageUrl?: string;
  description: string;
  encryptionLevel: 'Standard' | 'Vault Level 3' | 'Level 5 Protected' | 'Quantum-Proof';
  permawebTxId: string;
  tags: string[];
  albumName?: string;
  isCoverPhoto?: boolean;
}

export interface LegacyLetter {
  id: string;
  title: string;
  recipient: string;
  releaseDate: string;
  status: 'Permanent' | 'Drafting' | 'Conditional' | 'Sealed';
  content: string;
  attachmentsCount: number;
  heirsCount: number;
  arweaveId: string;
}

export interface MemorialShrine {
  id: string;
  name: string;
  years: string;
  relationship: string;
  imageUrl: string;
  tributesCount: number;
  candleLitToday: boolean;
  motto: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionButtons?: { label: string; action: string }[];
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  balanceAr: number;
  nodeLatencyMs: number;
  encryptionKeyStatus: 'Verified' | 'Pending' | 'Locked';
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Vault Owner' | 'Trustee' | 'Heir / Beneficiary';
  authMethod: 'Email & Passcode' | 'ArConnect / Web3' | 'JWK Keyfile' | 'Heir Key Code';
  walletAddress?: string;
  avatarUrl?: string;
  signedInAt?: string;
  securityLevel: 'Quantum-Proof AES-GCM' | 'Hardware Enclave' | 'Standard Biometric';
}
