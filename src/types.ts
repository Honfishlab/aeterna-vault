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
  | 'immortal'
  | 'imports'
  | 'recycle'
  | 'storage'
  | 'account'
  | 'audit';

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
  videoUrl?: string;
  mediaType?: 'photo' | 'video' | 'document';
  thumbnailUrl?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  durationMs?: number;
  sourceProvider?: string;
  sourceCreatedAt?: string;
  mediaId?: string;
  processingStatus?: 'not_required' | 'queued' | 'processing' | 'ready' | 'failed';
  description: string;
  encryptionLevel: 'Standard' | 'Vault Level 3' | 'Level 5 Protected' | 'Quantum-Proof';
  permawebTxId?: string;
  archiveJobId?: string;
  archiveStatus?: "r2_only" | "staging" | "queued" | "uploading" | "submitted" | "confirmed" | "failed";
  archiveError?: string;
  archiveConfirmations?: number;
  tags: string[];
  people?: string[];
  albumName?: string;
  isCoverPhoto?: boolean;
  autoTags?: {
    category?: string;
    people?: string[];
    location?: string;
    tags?: string[];
  };
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
  audioUrl?: string;
  isAudioRecording?: boolean;
}

export interface TributeNote {
  id: string;
  author: string;
  relationship: string;
  message: string;
  date: string;
  imageUrl?: string;
  audioUrl?: string;
  isAudioTribute?: boolean;
  transcription?: string;
  tributeType?: 'Candle & Prayer' | 'Flower Tribute' | 'Family Memory' | 'Honor & Gratitude' | 'Spoken Story (Audio AI)';
}

export interface LifeMilestone {
  id?: string;
  year: string;
  dateExact?: string;
  title: string;
  description: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  mediaType?: 'photo' | 'video' | 'audio' | 'story';
  category?: 'Birth' | 'Education' | 'Career' | 'Marriage & Family' | 'Achievement' | 'Travel & Adventure' | 'Legacy & Memorial';
  tags?: string[];
  quotes?: string;
}

export interface MemorialShrine {
  id: string;
  name: string;
  bornDate?: string;
  passedDate?: string;
  years: string;
  relationship: string;
  imageUrl: string;
  coverImageUrl?: string;
  restingPlace?: string;
  tributesCount: number;
  candlesLitCount?: number;
  flowersOfferedCount?: number;
  candleLitToday: boolean;
  motto: string;
  biography?: string;
  keyValues?: string[];
  favoriteQuotes?: string[];
  lifeMilestones?: LifeMilestone[];
  tributes?: TributeNote[];
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
