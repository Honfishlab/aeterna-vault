import { MemoryItem, LegacyLetter, MemorialShrine, Heir, InheritanceTriggerConfig } from '../types';

export const INITIAL_MEMORIES: MemoryItem[] = [
  {
    id: 'mem-1',
    title: "Ceremony at St. Mary's",
    category: 'Family',
    date: 'June 12, 2012',
    location: 'St. Mary Cathedral, Boston',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
    description: 'The vows exchange surrounded by 120 family members and friends. Sunlight streaming through stained glass.',
    encryptionLevel: 'Level 5 Protected',
    permawebTxId: 'ar_w3dd1ng_99812a',
    tags: ['Wedding 2012', 'Family', 'Boston', 'Ceremony']
  },
  {
    id: 'mem-2',
    title: 'The Wedding Rings - Close Detail',
    category: 'Family',
    date: 'June 12, 2012',
    location: 'Boston, MA',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&q=80&w=800',
    description: 'Gold bands inscribed with coordinates of our first summit hike in Vermont.',
    encryptionLevel: 'Level 5 Protected',
    permawebTxId: 'ar_r1ngs_44120x',
    tags: ['Wedding 2012', 'Rings', 'Heirloom']
  },
  {
    id: 'mem-3',
    title: 'The Toast & Champagne',
    category: 'Family',
    date: 'June 12, 2012',
    location: 'The Grand Ballroom',
    imageUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800',
    description: 'Grandfather Edward giving the traditional family toast with vintage 1998 champagne.',
    encryptionLevel: 'Standard',
    permawebTxId: 'ar_t0ast_88192z',
    tags: ['Wedding 2012', 'Toast', 'Edward']
  },
  {
    id: 'mem-4',
    title: 'Reception Floral & Lantern Decor',
    category: 'Family',
    date: 'June 12, 2012',
    location: 'Estate Gardens',
    imageUrl: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&q=80&w=800',
    description: 'Handcrafted white peony floral arrangements illuminated by amber fairy lanterns.',
    encryptionLevel: 'Standard',
    permawebTxId: 'ar_d3c0r_10928a',
    tags: ['Wedding 2012', 'Decor', 'Flowers']
  },
  {
    id: 'mem-5',
    title: 'The Historic Estate Venue',
    category: 'Family',
    date: 'June 12, 2012',
    location: 'Oakhaven Manor',
    imageUrl: 'https://images.unsplash.com/photo-1544077960-604201fe74bc?auto=format&fit=crop&q=80&w=800',
    description: 'Panoramic view of Oakhaven Manor at golden hour during the evening reception.',
    encryptionLevel: 'Standard',
    permawebTxId: 'ar_v3nu3_55219m',
    tags: ['Wedding 2012', 'Venue', 'Manor']
  },
  {
    id: 'mem-6',
    title: 'Summer Coast Family Gathering',
    category: 'Personal',
    date: 'August 18, 2024',
    location: 'Cape Cod, MA',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=800',
    description: 'Full family retreat by the coastal lighthouse. Three generations together.',
    encryptionLevel: 'Vault Level 3',
    permawebTxId: 'ar_s4mm3r_99210k',
    tags: ['Summer 2024', 'Cape Cod', 'Beach']
  }
];

export const INITIAL_LETTERS: LegacyLetter[] = [
  {
    id: 'let-1',
    title: 'Letter to My Great-Grandchildren',
    recipient: 'Future Generations (Pendelton Lineage)',
    releaseDate: 'December 24, 2074',
    status: 'Permanent',
    content: 'The world is a vast canvas, and each generation paints its own horizon. I am leaving you the deeds to the mountain cottage, our family genealogy ledger, and these fundamental truths about kindness, perseverance, and quiet craftsmanship...',
    attachmentsCount: 12,
    heirsCount: 4,
    arweaveId: 'ar_L3tt3r_2074_0x89a'
  },
  {
    id: 'let-2',
    title: 'Annual Video Legacy Log 2024',
    recipient: 'Clara & Thomas Pendelton',
    releaseDate: 'October 12, 2025',
    status: 'Drafting',
    content: 'Annual video update discussing this past year’s architectural projects, family milestones, and personal reflections on resilience.',
    attachmentsCount: 3,
    heirsCount: 2,
    arweaveId: 'ar_V1d30_2024_0x71b'
  },
  {
    id: 'let-3',
    title: 'Heritage Access Keys & Wallet Protocol',
    recipient: 'Designated Executor Trust',
    releaseDate: 'On Inactivity Trigger (180 Days)',
    status: 'Conditional',
    content: 'Automated release of multi-sig cryptographic keys to sovereign vault assets upon 180 consecutive days of inactivity.',
    attachmentsCount: 8,
    heirsCount: 3,
    arweaveId: 'ar_Tr4st_K3ys_0x99c'
  }
];

export const INITIAL_MEMORIALS: MemorialShrine[] = [
  {
    id: 'shrine-1',
    name: 'Eleanor Vance Pendelton',
    years: '1932 – 2018',
    relationship: 'Matriarch & Grandmother',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    tributesCount: 128,
    candleLitToday: true,
    motto: 'Strength in gentleness, wisdom in silence.'
  },
  {
    id: 'shrine-2',
    name: 'Capt. Thomas Pendelton Sr.',
    years: '1928 – 2011',
    relationship: 'Grandfather & Aviator',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    tributesCount: 94,
    candleLitToday: false,
    motto: 'Clear skies and steady wings.'
  },
  {
    id: 'shrine-3',
    name: 'Arthur Pendelton I',
    years: '1898 – 1974',
    relationship: 'Great-Grandfather',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
    tributesCount: 62,
    candleLitToday: true,
    motto: 'Build things that endure generations.'
  }
];

export const INITIAL_HEIRS: Heir[] = [
  {
    id: 'heir-1',
    name: 'Clara Pendelton',
    email: 'clara.p@pendelton-estate.org',
    walletAddress: '0x71C9...89aB',
    relationship: 'Daughter / Primary Heir',
    accessRole: 'Full Trustee',
    status: 'Key Verified',
    assignedCategories: ['Personal', 'Family', 'Legal', 'Time Capsule', 'Memorial'],
    invitedAt: 'Jan 15, 2024',
    verificationHash: '0x8f19a2b04c8e71d3'
  },
  {
    id: 'heir-2',
    name: 'Thomas Pendelton II',
    email: 'thomas.jr@pendelton-estate.org',
    walletAddress: '0x34A2...11fC',
    relationship: 'Son / Co-Beneficiary',
    accessRole: 'Beneficiary / Decryptor',
    status: 'Key Verified',
    assignedCategories: ['Family', 'Legal', 'Time Capsule'],
    invitedAt: 'Feb 02, 2024',
    verificationHash: '0x32c819a110d9e4a5'
  },
  {
    id: 'heir-3',
    name: 'Sovereign Trust Executor (Fiduciary)',
    email: 'executor@sovereign-trust.law',
    walletAddress: '0x991C...77FF',
    relationship: 'Family Estate Fiduciary',
    accessRole: 'Full Trustee',
    status: 'Key Verified',
    assignedCategories: ['Legal', 'Personal'],
    invitedAt: 'Nov 10, 2023',
    verificationHash: '0xaa7192bc33001892'
  }
];

export const INITIAL_TRIGGER_CONFIG: InheritanceTriggerConfig = {
  deadMansSwitchDays: 180,
  lastCheckInDaysAgo: 4,
  multiSigRequired: 2,
  multiSigTotal: 3,
  status: 'ARMED',
  medicalReleaseEnabled: true
};

