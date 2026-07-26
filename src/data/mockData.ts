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
    tags: ['Wedding 2012', 'Family', 'Boston', 'Ceremony'],
    people: ['Wayne', 'Clara Pendelton', 'Family Bride & Groom'],
    autoTags: {
      category: 'Family',
      people: ['Wayne', 'Clara Pendelton'],
      location: 'St. Mary Cathedral, Boston',
      tags: ['Wedding', 'Ceremony', 'Cathedral', 'Stained Glass', 'Sanctuary']
    }
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
    tags: ['Wedding 2012', 'Rings', 'Heirloom'],
    people: ['Wayne', 'Clara Pendelton'],
    autoTags: {
      category: 'Family',
      people: ['Wayne', 'Clara Pendelton'],
      location: 'Boston, MA',
      tags: ['Gold Rings', 'Vermont Coordinates', 'Heirloom Jewelry', 'Symbol']
    }
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
    tags: ['Wedding 2012', 'Toast', 'Edward'],
    people: ['Grandfather Edward', 'Thomas Pendelton'],
    autoTags: {
      category: 'Family',
      people: ['Grandfather Edward', 'Thomas Pendelton'],
      location: 'The Grand Ballroom',
      tags: ['Family Toast', 'Champagne', '1998 Vintage', 'Celebration']
    }
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
    tags: ['Wedding 2012', 'Decor', 'Flowers'],
    people: ['Estate Gardeners', 'Family Committee'],
    autoTags: {
      category: 'Family',
      people: ['Family Committee'],
      location: 'Estate Gardens',
      tags: ['Peonies', 'Lanterns', 'Garden Reception', 'Amber Lighting']
    }
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
    tags: ['Wedding 2012', 'Venue', 'Manor'],
    people: ['Pendelton Family'],
    autoTags: {
      category: 'Family',
      people: ['Pendelton Family'],
      location: 'Oakhaven Manor',
      tags: ['Historic Estate', 'Golden Hour', 'Architecture', 'Sunset']
    }
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
    tags: ['Summer 2024', 'Cape Cod', 'Beach'],
    people: ['Wayne', 'Clara Pendelton', 'Grandchildren'],
    autoTags: {
      category: 'Personal',
      people: ['Wayne', 'Clara Pendelton', 'Grandchildren'],
      location: 'Cape Cod Coastal Beach, MA',
      tags: ['Beach Retreat', 'Lighthouse', 'Ocean Waves', 'Three Generations', 'Summer Vacation']
    }
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
    bornDate: 'May 14, 1932',
    passedDate: 'October 22, 2018',
    years: '1932 – 2018',
    relationship: 'Matriarch & Grandmother',
    imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
    coverImageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=1200',
    restingPlace: 'Oakridge Memorial Gardens, Boston, MA',
    tributesCount: 128,
    candlesLitCount: 412,
    flowersOfferedCount: 189,
    candleLitToday: true,
    motto: 'Strength in gentleness, wisdom in silence.',
    biography: 'Eleanor Vance Pendelton was born in Boston, Massachusetts. A devoted educator and classical pianist, Eleanor spent over 35 years teaching music literature at the Conservatory. She believed deeply in the power of family heritage, quiet craftsmanship, and unconditional grace. Her home was always filled with fresh garden peonies, Bach fugues, and warm hearth light for anyone in need.',
    keyValues: ['Patience', 'Classical Music', 'Generosity', 'Devotion to Family'],
    favoriteQuotes: [
      'The truest legacy is written in the hearts of those we loved.',
      'Music reaches where words cannot tread.'
    ],
    lifeMilestones: [
      { 
        id: 'ms-101',
        year: '1932', 
        dateExact: 'May 14, 1932',
        title: 'Born in Beacon Hill, Boston', 
        description: 'Daughter of Henry Vance (architect) & Margaret Vance (botanist). Raised in a home filled with literature and classical instruments.',
        location: 'Boston, Massachusetts',
        category: 'Birth',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Boston', 'Vance Lineage', 'Heritage']
      },
      { 
        id: 'ms-102',
        year: '1954', 
        dateExact: 'June 10, 1954',
        title: 'Graduated Honors at Boston Conservatory', 
        description: 'Awarded Summa Cum Laude in Classical Piano Performance. Performed Chopin’s Nocturne in E-flat major at Symphony Hall.',
        location: 'Boston Conservatory, MA',
        category: 'Education',
        imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Piano', 'Conservatory', 'Chopin']
      },
      { 
        id: 'ms-103',
        year: '1956', 
        dateExact: 'September 22, 1956',
        title: 'Wedding Ceremony with Capt. Thomas Pendelton', 
        description: 'United in matrimony at St. Mary Cathedral, attended by over 200 friends and family. The reception was held at the historic estate garden.',
        location: 'St. Mary Cathedral, Boston',
        category: 'Marriage & Family',
        imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Wedding', 'Pendelton Lineage', 'St Mary']
      },
      { 
        id: 'ms-104',
        year: '1965–2000', 
        dateExact: '1965 – 2000',
        title: 'Senior Faculty Educator & Mentor', 
        description: 'Taught classical music literature for 35 years. Mentored over 600 aspiring young pianists and founded the Youth Symphony Endowment.',
        location: 'New England Conservatory',
        category: 'Career',
        imageUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Mentorship', 'Faculty', 'Endowment']
      },
      { 
        id: 'ms-105',
        year: '2012', 
        dateExact: 'June 12, 2012',
        title: '50th Family Estate Jubilee Recital', 
        description: 'Celebrated six decades of family harmony surrounded by children and grandchildren at Oakhaven Manor.',
        location: 'Oakhaven Manor, MA',
        category: 'Achievement',
        imageUrl: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Golden Jubilee', 'Oakhaven Manor']
      },
      { 
        id: 'ms-106',
        year: '2018', 
        dateExact: 'October 22, 2018',
        title: 'Eternally Remembered & Seated in Light', 
        description: 'Passed peacefully at her estate surrounded by three generations of family listening to Beethoven’s Moonlight Sonata.',
        location: 'Oakridge Memorial Gardens, MA',
        category: 'Legacy & Memorial',
        imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
        mediaType: 'photo',
        tags: ['Permaweb Shrine', 'Ancestral Peace']
      }
    ],
    tributes: [
      {
        id: 'trib-1',
        author: 'Clara Pendelton',
        relationship: 'Granddaughter',
        message: 'Grandmother’s piano melodies still linger in our holiday memories. Her quiet wisdom remains our family’s perpetual guiding beacon.',
        date: 'Dec 24, 2024',
        tributeType: 'Family Memory'
      },
      {
        id: 'trib-2',
        author: 'Arthur Pendelton II',
        relationship: 'Grandson',
        message: 'Offered fresh white roses at the family shrine today. Remembering her unconditional warmth and summer garden tea gatherings.',
        date: 'Nov 12, 2024',
        tributeType: 'Flower Tribute'
      }
    ]
  },
  {
    id: 'shrine-2',
    name: 'Capt. Thomas Pendelton Sr.',
    bornDate: 'August 12, 1928',
    passedDate: 'March 04, 2011',
    years: '1928 – 2011',
    relationship: 'Grandfather & Aviator',
    imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=600',
    coverImageUrl: 'https://images.unsplash.com/photo-1506012787146-f92b2d7d6d96?auto=format&fit=crop&q=80&w=1200',
    restingPlace: 'Arlington National Cemetery, Section 34',
    tributesCount: 94,
    candlesLitCount: 308,
    flowersOfferedCount: 142,
    candleLitToday: false,
    motto: 'Clear skies and steady wings.',
    biography: 'Captain Thomas Pendelton Sr. served 28 years in aviation navigation and commercial flight operations. A disciplined craftsman, avid hiker, and amateur astronomer, Thomas taught his children and grandchildren how to navigate by the stars and build things with uncompromising integrity.',
    keyValues: ['Honor', 'Precision', 'Aviation', 'Constellations'],
    favoriteQuotes: [
      'Keep your eyes on the horizon and your mind calm in the storm.',
      'True courage is choosing honor when no one is watching.'
    ],
    lifeMilestones: [
      { year: '1928', title: 'Born in Portland, Maine', description: 'Raised on coastal harbor navigation.' },
      { year: '1950', title: 'Earned Commercial Pilot License', description: 'Logbook surpassed 10,000 flight hours.' },
      { year: '1956', title: 'Married Eleanor Vance', description: 'Built the family estate in Massachusetts.' },
      { year: '2011', title: 'Final Flight', description: 'Laid to rest with full military honors.' }
    ],
    tributes: [
      {
        id: 'trib-3',
        author: 'Thomas Pendelton Jr.',
        relationship: 'Son',
        message: 'Remembering our flight over the Green Mountains. Dad’s calm navigation in storm clouds taught me how to live.',
        date: 'Oct 08, 2024',
        tributeType: 'Honor & Gratitude'
      }
    ]
  },
  {
    id: 'shrine-3',
    name: 'Arthur Pendelton I',
    bornDate: 'January 18, 1898',
    passedDate: 'July 29, 1974',
    years: '1898 – 1974',
    relationship: 'Great-Grandfather',
    imageUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=600',
    coverImageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1200',
    restingPlace: 'Historic Mount Auburn, Cambridge, MA',
    tributesCount: 62,
    candlesLitCount: 215,
    flowersOfferedCount: 88,
    candleLitToday: true,
    motto: 'Build things that endure generations.',
    biography: 'Arthur Pendelton I was a master architect and stone stonemason who helped restore historic New England landmarks. He founded the original family estate and established the trust protocol that guards our lineage today.',
    keyValues: ['Craftsmanship', 'Architecture', 'Integrity', 'Heritage'],
    favoriteQuotes: [
      'Stone by stone, legacy is carved for those who come after.'
    ],
    lifeMilestones: [
      { year: '1898', title: 'Born in Cambridge, MA', description: 'Son of New England artisans.' },
      { year: '1925', title: 'Founded Pendelton Architectural Works', description: 'Specialized in stone masonry and permanent timber structures.' },
      { year: '1974', title: 'Resting in Peace', description: 'Eternally enshrined at Mount Auburn.' }
    ],
    tributes: [
      {
        id: 'trib-4',
        author: 'Sovereign Trust Executor',
        relationship: 'Family Estate Fiduciary',
        message: 'In honor of Arthur I, the founder who laid the cornerstone of this sovereign vault.',
        date: 'Sep 15, 2024',
        tributeType: 'Candle & Prayer'
      }
    ]
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

