import React, { useState, useMemo, useEffect } from 'react';
import { ViewMode, MemoryItem } from '../types';
import { ImageViewerModal } from './ImageViewerModal';
import { 
  Search, 
  FolderPlus, 
  Sparkles, 
  Tag, 
  Calendar, 
  MapPin, 
  Lock, 
  Maximize2, 
  X, 
  Share2, 
  CheckCircle2,
  ArrowRight,
  Upload,
  Clock,
  Images,
  RotateCcw,
  Plus,
  Shield,
  Layers,
  FileText,
  Star,
  Edit3,
  Trash2,
  FolderEdit,
  ImagePlus,
  FilePlus,
  CheckSquare,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Info,
  Download,
  Globe,
  Play
} from 'lucide-react';

interface SearchViewProps {
  onSelectView: (view: ViewMode) => void;
  memories: MemoryItem[];
  searchQuery: string;
  onSearchChange?: (query: string) => void;
  onOpenUpload: () => void;
  onUpdateMemories?: (memories: MemoryItem[]) => void;
  onDeleteMemory?: (id: string) => void;
  onRestoreDemoContent?: () => void;
}

export const SearchView: React.FC<SearchViewProps> = ({
  onSelectView,
  memories,
  searchQuery,
  onSearchChange,
  onOpenUpload,
  onUpdateMemories,
  onDeleteMemory,
  onRestoreDemoContent,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [selectedImage, setSelectedImage] = useState<MemoryItem | null>(null);
  const [showLightboxInfo, setShowLightboxInfo] = useState(false);
  const [showAlbumCreatedToast, setShowAlbumCreatedToast] = useState(false);
  const [createdAlbumName, setCreatedAlbumName] = useState('');
  
  // Group modal state (Quick album creation)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newAlbumTitleInput, setNewAlbumTitleInput] = useState('');

  // Local live search query
  const [localSearch, setLocalSearch] = useState(searchQuery);

  // Album Editing state
  const [editingAlbumName, setEditingAlbumName] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'details' | 'photos' | 'add'>('details');
  const [editAlbumTitle, setEditAlbumTitle] = useState<string>('');
  const [editAlbumDate, setEditAlbumDate] = useState<string>('');
  const [editAlbumTime, setEditAlbumTime] = useState<string>('');
  const [editAlbumLocation, setEditAlbumLocation] = useState<string>('');
  const [editAlbumCategory, setEditAlbumCategory] = useState<'Personal' | 'Family' | 'Legal' | 'Memorial' | 'Time Capsule'>('Family');
  const [editAlbumDescription, setEditAlbumDescription] = useState<string>('');
  const [editAlbumTags, setEditAlbumTags] = useState<string>('');
  const [editLeadPhotoId, setEditLeadPhotoId] = useState<string | null>(null);
  
  // Add photos to album state inside Edit Album modal
  const [newPhotoUrlInput, setNewPhotoUrlInput] = useState<string>('');
  const [newPhotoTitleInput, setNewPhotoTitleInput] = useState<string>('');
  const [addedPhotosList, setAddedPhotosList] = useState<{ id: string; url: string; title: string }[]>([]);

  // Existing vault photos selection modal state inside Edit Album
  const [selectedVaultPhotoIds, setSelectedVaultPhotoIds] = useState<string[]>([]);

  // Multi-selection state for Main Vault Grid (supports Shift + Click)
  const [selectedGridPhotoIds, setSelectedGridPhotoIds] = useState<string[]>([]);
  const [lastGridSelectedIndex, setLastGridSelectedIndex] = useState<number | null>(null);

  // Batch Tagging modal state
  const [isBatchTagModalOpen, setIsBatchTagModalOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');

  // Shift-click selection index trackers for Edit Album modal
  const [lastVaultSelectedIndex, setLastVaultSelectedIndex] = useState<number | null>(null);
  const [selectedAlbumItemIds, setSelectedAlbumItemIds] = useState<string[]>([]);
  const [lastAlbumItemIndex, setLastAlbumItemIndex] = useState<number | null>(null);

  const activeQuery = localSearch !== undefined ? localSearch : searchQuery;

  const handleSearchInput = (val: string) => {
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // Handler for Main Bento Grid photo click (supports Shift key range selection)
  const handleGridPhotoClick = (mem: MemoryItem, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.shiftKey && lastGridSelectedIndex !== null) {
      const start = Math.min(lastGridSelectedIndex, index);
      const end = Math.max(lastGridSelectedIndex, index);
      const rangeIds = filteredMemories.slice(start, end + 1).map(m => m.id);
      setSelectedGridPhotoIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      setLastGridSelectedIndex(index);
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedGridPhotoIds(prev =>
        prev.includes(mem.id) ? prev.filter(id => id !== mem.id) : [...prev, mem.id]
      );
      setLastGridSelectedIndex(index);
    } else {
      setSelectedGridPhotoIds(prev =>
        prev.includes(mem.id) ? prev.filter(id => id !== mem.id) : [...prev, mem.id]
      );
      setLastGridSelectedIndex(index);
    }
  };

  // Handler for Option C (Attach Vault Memories) inside Edit Album modal (supports Shift key range selection)
  const handleVaultPhotoClick = (mem: MemoryItem, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.shiftKey && lastVaultSelectedIndex !== null) {
      const start = Math.min(lastVaultSelectedIndex, index);
      const end = Math.max(lastVaultSelectedIndex, index);
      const rangeIds = unassignedVaultMemories.slice(start, end + 1).map(m => m.id);
      setSelectedVaultPhotoIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      setLastVaultSelectedIndex(index);
    } else {
      setSelectedVaultPhotoIds(prev =>
        prev.includes(mem.id) ? prev.filter(id => id !== mem.id) : [...prev, mem.id]
      );
      setLastVaultSelectedIndex(index);
    }
  };

  // Handler for Tab 2 (Album photos list inside Edit Album modal)
  const handleAlbumItemClick = (photo: MemoryItem, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.shiftKey && lastAlbumItemIndex !== null) {
      const start = Math.min(lastAlbumItemIndex, index);
      const end = Math.max(lastAlbumItemIndex, index);
      const rangeIds = currentEditingItems.slice(start, end + 1).map(m => m.id);
      setSelectedAlbumItemIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      setLastAlbumItemIndex(index);
    } else {
      setSelectedAlbumItemIds(prev =>
        prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
      );
      setLastAlbumItemIndex(index);
    }
  };

  // Action for batch tagging selected grid memories
  const handleBatchTagSelectedGrid = () => {
    if (!batchTagInput.trim() || selectedGridPhotoIds.length === 0 || !onUpdateMemories) return;
    const newTags = batchTagInput.split(',').map(t => t.trim()).filter(Boolean);
    const selectedSet = new Set(selectedGridPhotoIds);
    const updated = memories.map(m => {
      if (selectedSet.has(m.id)) {
        return {
          ...m,
          tags: Array.from(new Set([...(m.tags || []), ...newTags]))
        };
      }
      return m;
    });
    onUpdateMemories(updated);
    setIsBatchTagModalOpen(false);
    setBatchTagInput('');
    setSelectedGridPhotoIds([]);
  };

  // Action for batch deleting selected grid memories
  const handleBatchDeleteSelectedGrid = () => {
    if (selectedGridPhotoIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedGridPhotoIds.length} selected items from your vault?`)) {
      const selectedSet = new Set(selectedGridPhotoIds);
      if (onUpdateMemories) {
        onUpdateMemories(memories.filter(m => !selectedSet.has(m.id)));
      } else if (onDeleteMemory) {
        selectedGridPhotoIds.forEach(id => onDeleteMemory(id));
      }
      setSelectedGridPhotoIds([]);
    }
  };

  // Action for single item deletion
  const handleDeleteSingleMemory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this memory item from your vault?')) {
      if (onDeleteMemory) {
        onDeleteMemory(id);
      } else if (onUpdateMemories) {
        onUpdateMemories(memories.filter(m => m.id !== id));
      }
      if (selectedImage?.id === id) {
        setSelectedImage(null);
      }
      setSelectedGridPhotoIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  // Action for batch detaching selected items inside Edit Album modal
  const handleBatchDetachAlbumItems = () => {
    if (selectedAlbumItemIds.length === 0 || !onUpdateMemories) return;
    const selectedSet = new Set(selectedAlbumItemIds);
    const updated = memories.map(m => {
      if (selectedSet.has(m.id)) {
        return {
          ...m,
          albumName: undefined,
          isCoverPhoto: false
        };
      }
      return m;
    });
    onUpdateMemories(updated);
    setSelectedAlbumItemIds([]);
  };

  // Extract dynamic album titles and top tags directly from memories contents
  const dynamicFilterOptions = useMemo(() => {
    const albumMap = new Map<string, number>();
    const tagMap = new Map<string, number>();

    memories.forEach(mem => {
      if (mem.albumName) {
        albumMap.set(mem.albumName, (albumMap.get(mem.albumName) || 0) + 1);
      }
      if (Array.isArray(mem.tags)) {
        mem.tags.forEach(tag => {
          if (tag) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        });
      }
      if (mem.category) {
        tagMap.set(mem.category, (tagMap.get(mem.category) || 0) + 1);
      }
    });

    const list: { name: string; isAlbum: boolean; count: number }[] = [
      { name: 'All', isAlbum: false, count: memories.length }
    ];

    // Push explicit albums first
    albumMap.forEach((count, name) => {
      list.push({ name, isAlbum: true, count });
    });

    // Push discovered tags
    tagMap.forEach((count, name) => {
      if (!list.some(item => item.name.toLowerCase() === name.toLowerCase())) {
        list.push({ name, isAlbum: false, count });
      }
    });

    // Default suggestions if list is sparse
    const defaultTags = ['Wedding 2012', 'Family', 'Rings', 'Toast', 'Decor', 'Venue', 'Memorial'];
    defaultTags.forEach(dt => {
      if (!list.some(item => item.name.toLowerCase() === dt.toLowerCase())) {
        const countMatches = memories.filter(m => 
          m.title.toLowerCase().includes(dt.toLowerCase()) || 
          (m.tags && m.tags.some(t => t.toLowerCase().includes(dt.toLowerCase())))
        ).length;
        if (countMatches > 0) {
          list.push({ name: dt, isAlbum: false, count: countMatches });
        }
      }
    });

    return list;
  }, [memories]);

  // Filter memories based on search query AND active selected tag/album
  const filteredMemories = useMemo(() => {
    const q = activeQuery.trim().toLowerCase();

    return memories.filter(mem => {
      const matchesSearch = !q || 
        mem.title.toLowerCase().includes(q) ||
        mem.description.toLowerCase().includes(q) ||
        mem.category.toLowerCase().includes(q) ||
        (mem.albumName && mem.albumName.toLowerCase().includes(q)) ||
        (mem.location && mem.location.toLowerCase().includes(q)) ||
        (mem.people && mem.people.some(p => p.toLowerCase().includes(q))) ||
        (mem.tags && mem.tags.some(t => t.toLowerCase().includes(q))) ||
        (mem.autoTags && mem.autoTags.people && mem.autoTags.people.some(p => p.toLowerCase().includes(q))) ||
        (mem.autoTags && mem.autoTags.tags && mem.autoTags.tags.some(t => t.toLowerCase().includes(q)));

      let matchesFilter = true;
      if (selectedFilter !== 'All') {
        const sf = selectedFilter.toLowerCase();
        matchesFilter = (mem.albumName && mem.albumName.toLowerCase() === sf) ||
                        (mem.tags && mem.tags.some(t => t.toLowerCase() === sf)) ||
                        (mem.people && mem.people.some(p => p.toLowerCase() === sf)) ||
                        mem.category.toLowerCase() === sf ||
                        mem.title.toLowerCase().includes(sf);
      }

      return matchesSearch && matchesFilter;
    });
  }, [memories, activeQuery, selectedFilter]);

  // Keyboard shortcut listener for Lightbox modal (Escape to close, Arrow keys to navigate)
  useEffect(() => {
    if (!selectedImage) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null);
      } else if (e.key === 'ArrowLeft') {
        const currentIndex = filteredMemories.findIndex(m => m.id === selectedImage.id);
        if (currentIndex > 0) {
          setSelectedImage(filteredMemories[currentIndex - 1]);
        } else if (filteredMemories.length > 0) {
          setSelectedImage(filteredMemories[filteredMemories.length - 1]);
        }
      } else if (e.key === 'ArrowRight') {
        const currentIndex = filteredMemories.findIndex(m => m.id === selectedImage.id);
        if (currentIndex >= 0 && currentIndex < filteredMemories.length - 1) {
          setSelectedImage(filteredMemories[currentIndex + 1]);
        } else if (filteredMemories.length > 0) {
          setSelectedImage(filteredMemories[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, filteredMemories]);

  // Album summary cards grouping with lead/cover photo resolution
  const albumGroups = useMemo(() => {
    const map = new Map<string, MemoryItem[]>();
    memories.forEach(m => {
      const key = m.albumName || (m.tags && m.tags[0]) || m.category || 'General Memories';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    });

    return Array.from(map.entries()).map(([albumName, items]) => {
      const coverItem = items.find(i => i.isCoverPhoto) || items[0];
      return {
        albumName,
        items,
        coverUrl: coverItem?.imageUrl || 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
        count: items.length,
        leadItem: coverItem
      };
    });
  }, [memories]);

  // Check if active selectedFilter is an explicit Album
  const currentActiveAlbum = useMemo(() => {
    if (selectedFilter === 'All') return null;
    return albumGroups.find(a => a.albumName.toLowerCase() === selectedFilter.toLowerCase()) || null;
  }, [selectedFilter, albumGroups]);

  // Open Edit Album Modal
  const handleOpenEditAlbum = (albumName: string) => {
    const items = memories.filter(m => 
      m.albumName?.toLowerCase() === albumName.toLowerCase()
    );

    const lead = items.find(i => i.isCoverPhoto) || items[0];

    setEditingAlbumName(albumName);
    setEditAlbumTitle(albumName);
    setEditAlbumDate(lead?.date || '2024-08-18');
    setEditAlbumTime(lead?.time || '14:30');
    setEditAlbumLocation(lead?.location || '');
    setEditAlbumCategory(lead?.category || 'Family');
    setEditAlbumDescription(lead?.description || '');
    setEditAlbumTags(Array.from(new Set(items.flatMap(i => i.tags || []))).join(', '));
    setEditLeadPhotoId(lead?.id || null);
    setAddedPhotosList([]);
    setNewPhotoUrlInput('');
    setNewPhotoTitleInput('');
    setSelectedVaultPhotoIds([]);
    setEditTab('details');
  };

  // Add URL photo to addedPhotosList inside modal
  const handleAddDirectUrlToModal = () => {
    if (!newPhotoUrlInput.trim()) return;
    const newId = `new-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    setAddedPhotosList(prev => [
      ...prev,
      {
        id: newId,
        url: newPhotoUrlInput.trim(),
        title: newPhotoTitleInput.trim() || `Album Photo #${prev.length + 1}`
      }
    ]);
    setNewPhotoUrlInput('');
    setNewPhotoTitleInput('');
  };

  // Handle local file drop or selection inside edit modal
  const handleEditModalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = () => {
        setAddedPhotosList(prev => [
          ...prev,
          {
            id: `new-file-${Date.now()}-${index}`,
            url: reader.result as string,
            title: file.name.replace(/\.[^/.]+$/, "")
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // Detach photo from album
  const handleDetachPhotoFromAlbum = (photoId: string) => {
    if (!onUpdateMemories) return;
    const updated = memories.map(m => {
      if (m.id === photoId) {
        return {
          ...m,
          albumName: undefined,
          isCoverPhoto: false
        };
      }
      return m;
    });
    onUpdateMemories(updated);
  };

  // Save changes to Album Details, Lead Photo, and Newly Added Items
  const handleSaveAlbumChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbumName || !editAlbumTitle.trim()) return;

    const newTitle = editAlbumTitle.trim();
    const tagArray = editAlbumTags.split(',').map(t => t.trim()).filter(Boolean);

    // Get IDs of memories currently in this album + checked vault photos
    const currentAlbumMemberIds = new Set(
      memories.filter(m => m.albumName?.toLowerCase() === editingAlbumName.toLowerCase()).map(m => m.id)
    );
    
    // Add checked vault photos to target set
    selectedVaultPhotoIds.forEach(id => currentAlbumMemberIds.add(id));

    // Construct newly added memories
    const newlyAddedMemories: MemoryItem[] = addedPhotosList.map((item, idx) => ({
      id: `mem-album-add-${Date.now()}-${idx}`,
      title: item.title || `${newTitle} Photo #${idx + 1}`,
      category: editAlbumCategory,
      date: editAlbumDate || '2024-08-18',
      time: editAlbumTime || '14:30',
      location: editAlbumLocation,
      imageUrl: item.url,
      description: editAlbumDescription || `Added to ${newTitle} album`,
      encryptionLevel: 'Level 5 Protected',
      permawebTxId: `ar_alb_item_${Math.random().toString(36).substring(2, 9)}`,
      tags: Array.from(new Set([...tagArray, 'Album', newTitle])),
      albumName: newTitle,
      isCoverPhoto: editLeadPhotoId === item.id
    }));

    // Update existing memories in the album
    let updatedMemoriesList = memories.map(m => {
      if (currentAlbumMemberIds.has(m.id)) {
        const isLead = m.id === editLeadPhotoId;
        return {
          ...m,
          albumName: newTitle,
          date: editAlbumDate || m.date,
          time: editAlbumTime || m.time,
          location: editAlbumLocation || m.location,
          category: editAlbumCategory || m.category,
          description: editAlbumDescription || m.description,
          tags: Array.from(new Set([...(m.tags || []), ...tagArray, 'Album', newTitle])),
          isCoverPhoto: isLead
        };
      }
      return m;
    });

    // Append newly uploaded photos
    if (newlyAddedMemories.length > 0) {
      updatedMemoriesList = [...newlyAddedMemories, ...updatedMemoriesList];
    }

    if (onUpdateMemories) {
      onUpdateMemories(updatedMemoriesList);
    }

    setCreatedAlbumName(newTitle);
    setShowAlbumCreatedToast(true);
    setEditingAlbumName(null);
    setSelectedFilter(newTitle);
    setTimeout(() => setShowAlbumCreatedToast(false), 5000);
  };

  const handleGroupAlbumSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const albumTitle = newAlbumTitleInput.trim() || `${selectedFilter !== 'All' ? selectedFilter : 'Custom'} Album Collection`;
    
    if (onUpdateMemories && filteredMemories.length > 0) {
      const targetIds = new Set(filteredMemories.map(m => m.id));
      let isFirst = true;
      const updatedList = memories.map(m => {
        if (targetIds.has(m.id)) {
          const isLead = isFirst;
          isFirst = false;
          return {
            ...m,
            albumName: albumTitle,
            tags: Array.from(new Set([...m.tags, 'Album', albumTitle])),
            isCoverPhoto: isLead
          };
        }
        return m;
      });
      onUpdateMemories(updatedList);
    }

    setCreatedAlbumName(albumTitle);
    setShowAlbumCreatedToast(true);
    setIsGroupModalOpen(false);
    setNewAlbumTitleInput('');
    setSelectedFilter(albumTitle);
    setTimeout(() => setShowAlbumCreatedToast(false), 5000);
  };

  // Get current items belonging to the editing album
  const currentEditingItems = useMemo(() => {
    if (!editingAlbumName) return [];
    return memories.filter(m => m.albumName?.toLowerCase() === editingAlbumName.toLowerCase());
  }, [memories, editingAlbumName]);

  // Vault photos not currently in the editing album
  const unassignedVaultMemories = useMemo(() => {
    if (!editingAlbumName) return [];
    return memories.filter(m => m.albumName?.toLowerCase() !== editingAlbumName.toLowerCase());
  }, [memories, editingAlbumName]);

  return (
    <div id="search-view" className="space-y-6 pb-20 text-[#E8DDF5]">
      
      {/* Breadcrumbs & Dynamic High-Contrast Title Header */}
      <div className="space-y-3 bg-[#130A24]/90 p-5 sm:p-6 rounded-3xl border border-[#DFB260]/40 shadow-xl relative overflow-hidden">
        
        {/* Glow ambient background pill */}
        <div className="absolute -top-10 -right-10 w-60 h-60 bg-[#DFB260]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center space-x-2 text-xs text-[#F5D77F] font-mono font-semibold">
          <span 
            onClick={() => onSelectView('dashboard')}
            className="hover:text-[#FFF2A8] cursor-pointer"
          >
            Vault
          </span>
          <span>/</span>
          <span className="text-[#C8B1E4]">Memories</span>
          <span>/</span>
          <span className="text-[#FFF2A8]">
            {activeQuery ? `Search: "${activeQuery}"` : selectedFilter !== 'All' ? `Album: ${selectedFilter}` : 'All Index'}
          </span>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-cinzel font-bold text-[#FFF2A8] tracking-wide drop-shadow-[0_2px_12px_rgba(223,178,96,0.35)] flex items-center gap-2">
              <Images className="w-7 h-7 text-[#F5D77F] flex-shrink-0" />
              <span>
                {activeQuery 
                  ? `Search Results: "${activeQuery}"` 
                  : selectedFilter !== 'All' 
                  ? `Album: ${selectedFilter}` 
                  : 'Vault Memories & Permaweb Albums'}
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-[#C8B1E4] font-medium flex items-center gap-2">
              <span>Showing <strong className="text-[#F5D77F]">{filteredMemories.length}</strong> {filteredMemories.length === 1 ? 'entry' : 'entries'} in live vault index</span>
              <span>•</span>
              <span className="text-[#DFB260]/80">{memories.length} total preserved items</span>
            </p>
          </div>

          <div className="flex items-center space-x-2.5 flex-wrap">
            {/* If an album filter is active, show prominent Edit Album Details & Lead Photo button */}
            {currentActiveAlbum && (
              <button
                onClick={() => handleOpenEditAlbum(currentActiveAlbum.albumName)}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] hover:from-[#F5D77F] hover:to-[#FFF2A8] px-4 py-2.5 rounded-2xl text-xs font-bold cursor-pointer shadow-lg shadow-[#DFB260]/20 transition-all"
              >
                <FolderEdit className="w-4 h-4 text-[#120B21]" />
                <span>Edit Album & Lead Photo</span>
              </button>
            )}

            <button
              onClick={() => {
                setNewAlbumTitleInput(activeQuery ? `${activeQuery} Album Collection` : 'New Album Collection');
                setIsGroupModalOpen(true);
              }}
              disabled={filteredMemories.length === 0}
              className="flex items-center space-x-1.5 gold-beveled-btn px-4 py-2.5 rounded-2xl text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FolderPlus className="w-4 h-4 text-[#F5D77F]" />
              <span>Group ({filteredMemories.length}) into Album</span>
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center space-x-1.5 gold-filled-btn px-5 py-2.5 rounded-2xl text-xs cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Photos / Album</span>
            </button>
          </div>
        </div>

        {/* Live Search Input Bar */}
        <div className="pt-2 flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search by photo title, album, tag, location, date, or story text..."
              className="w-full bg-[#1A0D33] border border-[#DFB260]/40 rounded-2xl pl-10 pr-10 py-3 text-xs sm:text-sm text-[#FFF2A8] placeholder-[#C8B1E4]/50 focus:outline-none focus:border-[#F5D77F] transition-all font-medium shadow-inner"
            />
            <Search className="w-4 h-4 text-[#F5D77F] absolute left-3.5 top-3.5" />
            {localSearch && (
              <button
                onClick={() => handleSearchInput('')}
                className="absolute right-3 top-3 text-[#C8B1E4] hover:text-[#FFF2A8] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(activeQuery || selectedFilter !== 'All') && (
            <button
              onClick={() => {
                handleSearchInput('');
                setSelectedFilter('All');
              }}
              className="px-3.5 py-3 bg-[#1A0D33] hover:bg-[#DFB260] text-[#C8B1E4] hover:text-[#120B21] border border-[#DFB260]/30 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Filters</span>
            </button>
          )}
        </div>

      </div>

      {/* Album Creation / Update Success Toast */}
      {showAlbumCreatedToast && (
        <div className="bg-[#122b1c] border border-emerald-500/50 text-emerald-200 p-4 rounded-2xl text-xs flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>
              Album <strong>"{createdAlbumName || 'Custom Collection'}"</strong> details, lead photo, and item collection updated and sealed!
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950 px-2 py-1 rounded-lg">
            Tx: ar_albm_9982x
          </span>
        </div>
      )}

      {/* Dynamic Suggested Album Titles & Tags Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#F5D77F] flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            <span>Suggested Album Titles & Topics ({dynamicFilterOptions.length - 1})</span>
          </span>
          <span className="text-[10px] text-[#C8B1E4]/70">Click filter to isolate album items</span>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-2 no-scrollbar">
          {dynamicFilterOptions.map((opt) => {
            const isSelected = selectedFilter.toLowerCase() === opt.name.toLowerCase();
            return (
              <button
                key={opt.name}
                onClick={() => setSelectedFilter(opt.name)}
                className={`px-3.5 py-2 rounded-2xl text-xs font-semibold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] font-bold shadow-md shadow-[#DFB260]/20'
                    : 'bg-[#180E2B] text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-[#251543] border border-[#DFB260]/30'
                }`}
              >
                {opt.isAlbum ? (
                  <Layers className={`w-3.5 h-3.5 ${isSelected ? 'text-[#120B21]' : 'text-[#F5D77F]'}`} />
                ) : (
                  <Tag className={`w-3 h-3 ${isSelected ? 'text-[#120B21]' : 'text-[#DFB260]'}`} />
                )}
                <span>{opt.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isSelected ? 'bg-[#120B21]/20 text-[#120B21]' : 'bg-[#DFB260]/20 text-[#F5D77F]'
                }`}>
                  {opt.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Album Cards Row (Top album collections) */}
      {albumGroups.length > 0 && selectedFilter === 'All' && !activeQuery && (
        <div className="space-y-3 pt-1">
          <span className="text-[11px] font-mono uppercase font-bold tracking-wider text-[#F5D77F] block">
            📁 Vault Album Collections ({albumGroups.length})
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {albumGroups.map((ag) => (
              <div
                key={ag.albumName}
                className="bg-[#180E2B] hover:bg-[#23133e] border border-[#DFB260]/30 hover:border-[#F5D77F] rounded-2xl p-3.5 flex items-center justify-between transition-all group shadow-md"
              >
                <div 
                  onClick={() => setSelectedFilter(ag.albumName)}
                  className="flex items-center space-x-3.5 flex-1 min-w-0 cursor-pointer"
                >
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-[#DFB260]/40 flex-shrink-0 bg-[#120B21]">
                    <img src={ag.coverUrl} alt={ag.albumName} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/20"></div>
                    {ag.leadItem?.isCoverPhoto && (
                      <div className="absolute top-1 left-1 bg-[#DFB260] text-[#120B21] p-0.5 rounded-full" title="Lead Photo Set">
                        <Star className="w-2.5 h-2.5 fill-current" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-hidden">
                    <h4 className="text-xs font-bold font-cinzel text-[#FFF2A8] group-hover:text-[#F5D77F] truncate">
                      {ag.albumName}
                    </h4>
                    <p className="text-[10px] text-[#C8B1E4]/70 font-mono mt-0.5">
                      {ag.count} {ag.count === 1 ? 'Item' : 'Items'} • Shared Timestamp
                    </p>
                    <span className="inline-block mt-1 text-[9px] text-[#F5D77F] font-semibold underline group-hover:translate-x-0.5 transition-transform">
                      View Album →
                    </span>
                  </div>
                </div>

                {/* Edit Album Details Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEditAlbum(ag.albumName);
                  }}
                  className="ml-2 p-2 rounded-xl bg-[#120B21] hover:bg-[#DFB260] text-[#F5D77F] hover:text-[#120B21] border border-[#DFB260]/40 transition-colors cursor-pointer flex-shrink-0"
                  title="Edit Album Details, Items & Lead Photo"
                >
                  <FolderEdit className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BENTO GRID GALLERY OF LIVE CONTENT */}
      {filteredMemories.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 auto-rows-[minmax(280px,42vh)] gap-4 pt-2">
          {filteredMemories.map((mem, idx) => {
            const isSelectedInGrid = selectedGridPhotoIds.includes(mem.id);
            return (
              <div
                key={mem.id}
                onClick={(e) => {
                  if (e.shiftKey || e.metaKey || e.ctrlKey) {
                    handleGridPhotoClick(mem, idx, e);
                  } else {
                    setSelectedImage(mem);
                  }
                }}
                className={`group bg-[#180E2B]/90 border rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                  isSelectedInGrid
                    ? 'border-[#DFB260] ring-4 ring-[#DFB260]/50 scale-[1.01] shadow-[#DFB260]/30'
                    : 'border-[#DFB260]/30 hover:border-[#F5D77F] hover:shadow-[#DFB260]/10'
                } ${
                  idx % 7 === 0 && filteredMemories.length > 2 ? 'sm:col-span-2 xl:col-span-2 sm:row-span-2 min-h-[520px]' : idx % 5 === 0 ? 'sm:row-span-2 min-h-[520px]' : 'min-h-[320px]'
                }`}
              >
                {/* Image Container */}
                <div className="relative w-full h-full overflow-hidden bg-[#120B21]">
                  {Boolean(mem.videoUrl) || mem.mediaType === "video" ? (
                    <>
                      <video
                        src={mem.videoUrl}
                        poster={mem.thumbnailUrl || mem.imageUrl}
                        muted
                        playsInline
                        preload="metadata"
                        onClick={(e) => {
                          if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
                            e.stopPropagation();
                            setSelectedImage(mem);
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="w-16 h-16 rounded-full bg-black/65 border-2 border-[#F5D77F] text-[#FFF2A8] flex items-center justify-center shadow-2xl backdrop-blur-md">
                          <Play className="w-7 h-7 fill-current ml-1" />
                        </span>
                      </div>
                    </>
                  ) : (
                    <img
                      src={mem.imageUrl || "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800"}
                      alt={mem.title}
                      referrerPolicy="no-referrer"
                      onClick={(e) => {
                        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
                          e.stopPropagation();
                          setSelectedImage(mem);
                        }
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F081D] via-[#0F081D]/40 to-transparent"></div>

                  {/* Top Badges & Multi-Selection Checkbox */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {/* Checkbox button for Shift-click selection */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGridPhotoClick(mem, idx, e);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono flex items-center space-x-1 transition-all backdrop-blur-md cursor-pointer border ${
                          isSelectedInGrid
                            ? 'bg-[#DFB260] text-[#120B21] border-[#FFF2A8] shadow-lg scale-105'
                            : 'bg-[#120B21]/80 text-[#FFF2A8] border-[#DFB260]/40 hover:bg-[#DFB260] hover:text-[#120B21]'
                        }`}
                        title="Click or Shift+Click to select range"
                      >
                        <CheckSquare className={`w-3.5 h-3.5 ${isSelectedInGrid ? 'fill-current text-[#120B21]' : ''}`} />
                        <span>{isSelectedInGrid ? 'Selected' : 'Select'}</span>
                      </button>

                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#120B21]/80 text-[#F5D77F] font-semibold border border-[#DFB260]/40 backdrop-blur-md">
                        {mem.encryptionLevel}
                      </span>
                      {mem.albumName && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#DFB260]/30 text-[#FFF2A8] font-bold border border-[#DFB260] backdrop-blur-md truncate max-w-[140px]">
                          📁 {mem.albumName}
                        </span>
                      )}
                      {mem.isCoverPhoto && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#DFB260] text-[#120B21] font-bold backdrop-blur-md flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          <span>Lead Photo</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      {mem.albumName && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAlbum(mem.albumName!);
                          }}
                          className="w-8 h-8 rounded-full bg-[#120B21]/80 hover:bg-[#DFB260] text-[#FFF2A8] hover:text-[#120B21] flex items-center justify-center transition-all backdrop-blur-md cursor-pointer border border-[#DFB260]/40"
                          title="Edit Album Details"
                        >
                          <FolderEdit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectView('immortal');
                        }}
                        className="w-8 h-8 rounded-full bg-[#120B21]/80 hover:bg-[#DFB260] text-[#FFF2A8] hover:text-[#120B21] flex items-center justify-center transition-all backdrop-blur-md cursor-pointer border border-[#DFB260]/40"
                        title="Immortal Gateway Independent Viewer"
                      >
                        <Globe className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedImage(mem);
                        }}
                        className="w-8 h-8 rounded-full bg-[#120B21]/80 hover:bg-[#DFB260] text-[#FFF2A8] hover:text-[#120B21] flex items-center justify-center transition-all backdrop-blur-md cursor-pointer border border-[#DFB260]/40"
                        title="View Full Resolution"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={(e) => handleDeleteSingleMemory(mem.id, e)}
                        className="w-8 h-8 rounded-full bg-[#120B21]/80 hover:bg-red-600 text-red-300 hover:text-white flex items-center justify-center transition-all backdrop-blur-md cursor-pointer border border-[#DFB260]/40"
                        title="Delete Memory Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Details Overlay */}
                  <div className="absolute bottom-3 left-3 right-3 space-y-1.5 text-white">
                    <div className="flex items-center space-x-2 text-[11px] text-[#F5D77F] font-mono font-semibold">
                      <Calendar className="w-3 h-3" />
                      <span>{mem.date}</span>
                      {mem.time && (
                        <>
                          <span>•</span>
                          <Clock className="w-3 h-3 text-[#DFB260]" />
                          <span>{mem.time}</span>
                        </>
                      )}
                      {mem.location && (
                        <>
                          <span>•</span>
                          <MapPin className="w-3 h-3 text-[#DFB260]" />
                          <span className="truncate">{mem.location}</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-cinzel font-bold text-base text-[#FFF2A8] group-hover:text-[#F5D77F] transition-colors leading-tight">
                      {mem.title}
                    </h3>

                    <p className="text-xs text-[#C8B1E4]/90 line-clamp-2 font-medium">
                      {mem.description}
                    </p>

                    <div className="flex items-center space-x-1.5 pt-1 flex-wrap gap-y-1">
                      {mem.tags.map((t) => (
                        <span 
                          key={t} 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFilter(t);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-[#120B21]/80 hover:bg-[#DFB260] text-[#FFF2A8] hover:text-[#120B21] border border-[#DFB260]/30 backdrop-blur-md font-medium cursor-pointer transition-colors"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* LIVE EMPTY STATE WHEN NO RESULTS MATCH */
        <div className="cosmic-card-gold p-8 sm:p-12 text-center space-y-5 border border-[#DFB260]">
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#F5D77F] flex items-center justify-center mx-auto">
            <Search className="w-8 h-8" />
          </div>

          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-cinzel font-bold text-2xl text-[#FFF2A8]">
              No Matching Memories Found
            </h3>
            <p className="text-xs text-[#C8B1E4] font-medium leading-relaxed">
              {activeQuery || selectedFilter !== 'All' 
                ? `No entries in your vault index matched "${activeQuery || selectedFilter}". Try resetting your filter or upload new files.`
                : 'Your Vault storage is currently clear. Upload new family photos or restore demo contents.'}
            </p>
          </div>

          <div className="flex items-center justify-center space-x-3 pt-2">
            {(activeQuery || selectedFilter !== 'All') && (
              <button
                onClick={() => {
                  handleSearchInput('');
                  setSelectedFilter('All');
                }}
                className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
              >
                Clear Search Filter
              </button>
            )}

            <button
              onClick={onOpenUpload}
              className="gold-filled-btn px-6 py-2.5 text-xs cursor-pointer flex items-center space-x-2"
            >
              <Upload className="w-4 h-4" />
              <span>Upload New Photos / Album</span>
            </button>

            {memories.length === 0 && onRestoreDemoContent && (
              <button
                onClick={onRestoreDemoContent}
                className="gold-beveled-btn px-5 py-2.5 text-xs text-[#F5D77F] cursor-pointer flex items-center space-x-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restore Sample Memories</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* EDIT ALBUM DETAILS & LEAD PHOTO MODAL */}
      {editingAlbumName && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="cosmic-card-gold max-w-3xl w-full p-6 space-y-5 relative border border-[#DFB260] my-8 shadow-2xl">
            <button
              onClick={() => setEditingAlbumName(null)}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#F5D77F] font-bold uppercase">
                <FolderEdit className="w-4 h-4 text-[#F5D77F]" />
                <span>Album Management & Lead Photo Editor</span>
              </div>
              <h3 className="font-cinzel font-bold text-2xl text-[#FFF2A8]">
                Edit Album: "{editingAlbumName}"
              </h3>
              <p className="text-xs text-[#C8B1E4]">
                Update collection title, shared date, location, lead cover photo, or add new items to this album.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-2 border-b border-[#DFB260]/30 pb-3">
              <button
                type="button"
                onClick={() => setEditTab('details')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1.5 ${
                  editTab === 'details'
                    ? 'bg-[#DFB260] text-[#120B21] font-bold'
                    : 'bg-[#120B21] text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>1. Album Details</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('photos')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1.5 ${
                  editTab === 'photos'
                    ? 'bg-[#DFB260] text-[#120B21] font-bold'
                    : 'bg-[#120B21] text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <Star className="w-3.5 h-3.5" />
                <span>2. Pick Lead Photo ({currentEditingItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setEditTab('add')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center space-x-1.5 ${
                  editTab === 'add'
                    ? 'bg-[#DFB260] text-[#120B21] font-bold'
                    : 'bg-[#120B21] text-[#C8B1E4] hover:text-[#FFF2A8]'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5" />
                <span>3. + Add Items to Album</span>
              </button>
            </div>

            <form onSubmit={handleSaveAlbumChanges} className="space-y-4 text-xs">
              
              {/* TAB 1: ALBUM DETAILS */}
              {editTab === 'details' && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="block text-[#FFF2A8] font-semibold mb-1">
                      Album Collection Title
                    </label>
                    <input
                      type="text"
                      value={editAlbumTitle}
                      onChange={(e) => setEditAlbumTitle(e.target.value)}
                      placeholder="Album Name"
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">
                        Shared Date
                      </label>
                      <input
                        type="date"
                        value={editAlbumDate}
                        onChange={(e) => setEditAlbumDate(e.target.value)}
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">
                        Time
                      </label>
                      <input
                        type="text"
                        value={editAlbumTime}
                        onChange={(e) => setEditAlbumTime(e.target.value)}
                        placeholder="e.g. 14:30"
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">
                        Location / Venue
                      </label>
                      <input
                        type="text"
                        value={editAlbumLocation}
                        onChange={(e) => setEditAlbumLocation(e.target.value)}
                        placeholder="e.g. Honolulu, Hawaii"
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#FFF2A8] font-semibold mb-1">
                        Vault Category
                      </label>
                      <select
                        value={editAlbumCategory}
                        onChange={(e) => setEditAlbumCategory(e.target.value as any)}
                        className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                      >
                        <option value="Personal">Personal</option>
                        <option value="Family">Family</option>
                        <option value="Legal">Legal</option>
                        <option value="Memorial">Memorial</option>
                        <option value="Time Capsule">Time Capsule</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[#FFF2A8] font-semibold mb-1">
                      Album Story & Backstory Description
                    </label>
                    <textarea
                      rows={3}
                      value={editAlbumDescription}
                      onChange={(e) => setEditAlbumDescription(e.target.value)}
                      placeholder="Write a brief story or context for this album collection..."
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#FFF2A8] font-semibold mb-1">
                      Album Tags (comma separated)
                    </label>
                    <input
                      type="text"
                      value={editAlbumTags}
                      onChange={(e) => setEditAlbumTags(e.target.value)}
                      placeholder="Wedding, Summer, Family, Cape Cod"
                      className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
                    />
                  </div>
                </div>
              )}

              {/* TAB 2: PICK LEAD PHOTO */}
              {editTab === 'photos' && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs text-[#C8B1E4]">
                    <p>
                      Select lead photo or <strong className="text-[#F5D77F]">Shift+Click</strong> multiple photos to batch manage.
                    </p>
                    {selectedAlbumItemIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBatchDetachAlbumItems}
                        className="bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-500/40 text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Detach Selected ({selectedAlbumItemIds.length})</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                    {currentEditingItems.map((photo, photoIdx) => {
                      const isLead = editLeadPhotoId === photo.id || (!editLeadPhotoId && photo.isCoverPhoto);
                      const isSelectedAlbumItem = selectedAlbumItemIds.includes(photo.id);
                      return (
                        <div
                          key={photo.id}
                          onClick={(e) => handleAlbumItemClick(photo, photoIdx, e)}
                          className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all ${
                            isLead 
                              ? 'border-[#DFB260] ring-2 ring-[#DFB260]/50 scale-[1.02]' 
                              : isSelectedAlbumItem
                              ? 'border-[#F5D77F] ring-2 ring-[#F5D77F]/60'
                              : 'border-[#DFB260]/20 hover:border-[#DFB260]/60'
                          }`}
                        >
                          <img src={photo.imageUrl} alt={photo.title} className="w-full h-28 object-cover" />
                          <div className="absolute inset-0 bg-black/30"></div>

                          {/* Lead Badge Button */}
                          <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditLeadPhotoId(photo.id);
                              }}
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center space-x-1 ${
                                isLead 
                                  ? 'bg-[#DFB260] text-[#120B21]' 
                                  : 'bg-[#120B21]/80 text-[#FFF2A8] hover:bg-[#DFB260] hover:text-[#120B21]'
                              }`}
                            >
                              <Star className={`w-2.5 h-2.5 ${isLead ? 'fill-current' : ''}`} />
                              <span>{isLead ? 'Lead Photo' : 'Set Lead'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetachPhotoFromAlbum(photo.id);
                              }}
                              className="p-1 rounded-full bg-red-950/80 text-red-300 hover:bg-red-600 hover:text-white transition-colors"
                              title="Detach photo from album"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="absolute bottom-1.5 left-2 right-2 text-[10px] text-[#FFF2A8] truncate font-semibold">
                            {photo.title}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: ADD ITEMS TO ALBUM */}
              {editTab === 'add' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-3">
                    <span className="text-xs font-bold text-[#F5D77F] block">
                      Option A: Add Photo via Web URL
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newPhotoUrlInput}
                        onChange={(e) => setNewPhotoUrlInput(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="flex-1 bg-[#1A0D33] border border-[#DFB260]/40 rounded-xl p-2.5 text-xs text-[#FFF2A8] focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newPhotoTitleInput}
                        onChange={(e) => setNewPhotoTitleInput(e.target.value)}
                        placeholder="Title (optional)"
                        className="w-36 bg-[#1A0D33] border border-[#DFB260]/40 rounded-xl p-2.5 text-xs text-[#FFF2A8] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddDirectUrlToModal}
                        className="gold-filled-btn px-4 py-2.5 text-xs font-bold cursor-pointer"
                      >
                        + Add URL
                      </button>
                    </div>
                  </div>

                  <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2 text-center">
                    <span className="text-xs font-bold text-[#F5D77F] block">
                      Option B: Upload Local Image Files
                    </span>
                    <label className="gold-beveled-btn px-4 py-2.5 text-xs cursor-pointer inline-flex items-center space-x-2">
                      <UploadCloud className="w-4 h-4 text-[#F5D77F]" />
                      <span>Browse Local Photo Files</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleEditModalFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Vault Memory Selector */}
                  <div className="bg-[#120B21] p-4 rounded-2xl border border-[#DFB260]/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#F5D77F] block">
                        Option C: Attach Existing Vault Memories ({unassignedVaultMemories.length} available)
                      </span>
                      <span className="text-[10px] text-[#F5D77F] font-mono">
                        💡 Hold Shift + Click to select range
                      </span>
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1">
                      {unassignedVaultMemories.map((m, idx) => {
                        const isChecked = selectedVaultPhotoIds.includes(m.id);
                        return (
                          <div
                            key={m.id}
                            onClick={(e) => handleVaultPhotoClick(m, idx, e)}
                            className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                              isChecked 
                                ? 'bg-[#DFB260]/20 border-[#DFB260] text-[#FFF2A8]' 
                                : 'bg-[#180E2B] border-[#DFB260]/20 text-[#C8B1E4] hover:border-[#DFB260]/50'
                            }`}
                          >
                            <div className="flex items-center space-x-2 truncate">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                className="accent-[#DFB260] rounded cursor-pointer"
                              />
                              <img src={m.imageUrl} alt={m.title} className="w-7 h-7 rounded-lg object-cover" />
                              <span className="text-xs font-medium truncate">{m.title}</span>
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${isChecked ? 'bg-[#DFB260] text-[#120B21] font-bold' : 'bg-[#120B21] text-[#C8B1E4]'}`}>
                              {isChecked ? 'Selected' : '+ Attach'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* List of Newly Added Photos */}
                  {addedPhotosList.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs font-semibold text-[#FFF2A8]">Newly Staged Photos ({addedPhotosList.length}):</span>
                      <div className="flex items-center space-x-2 overflow-x-auto py-1">
                        {addedPhotosList.map(p => (
                          <div key={p.id} className="relative group w-12 h-12 rounded-xl overflow-hidden border border-[#DFB260] flex-shrink-0">
                            <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setAddedPhotosList(prev => prev.filter(x => x.id !== p.id))}
                              className="absolute top-0 right-0 bg-red-600 text-white p-0.5 rounded-bl-lg text-[9px]"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-[#DFB260]/30">
                <span className="text-[10px] text-[#C8B1E4] font-mono">
                  {currentEditingItems.length + addedPhotosList.length + selectedVaultPhotoIds.length} Total Album Photos
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAlbumName(null)}
                    className="gold-beveled-btn px-4 py-2 text-xs text-[#FFF2A8]"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="gold-filled-btn px-6 py-2 text-xs font-bold uppercase tracking-wider"
                  >
                    Save Album Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* GROUP INTO ALBUM MODAL */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card-gold max-w-md w-full p-6 space-y-4 relative border border-[#DFB260]">
            <button
              onClick={() => setIsGroupModalOpen(false)}
              className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="inline-flex items-center space-x-1.5 text-xs font-mono text-[#F5D77F] font-bold uppercase">
                <FolderPlus className="w-4 h-4 text-[#F5D77F]" />
                <span>Batch Album Creation</span>
              </div>
              <h3 className="font-cinzel font-bold text-2xl text-[#FFF2A8]">
                Group Items Into Album
              </h3>
              <p className="text-xs text-[#C8B1E4]">
                This will group <strong className="text-[#F5D77F]">{filteredMemories.length} visible photos</strong> under a unified Album Title.
              </p>
            </div>

            <form onSubmit={handleGroupAlbumSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">
                  Album Collection Title
                </label>
                <input
                  type="text"
                  value={newAlbumTitleInput}
                  onChange={(e) => setNewAlbumTitleInput(e.target.value)}
                  placeholder="e.g. Cape Cod Family Reunion 2024 Album"
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium"
                  required
                />
              </div>

              <div className="bg-[#120B21] p-3 rounded-2xl border border-[#DFB260]/30 text-[11px] text-[#C8B1E4] space-y-1">
                <div className="text-[#F5D77F] font-semibold">Included Photos Preview:</div>
                <div className="flex items-center space-x-2 overflow-x-auto py-1">
                  {filteredMemories.slice(0, 5).map(m => (
                    <img key={m.id} src={m.imageUrl} alt={m.title} className="w-8 h-8 rounded-lg object-cover border border-[#DFB260]/30" />
                  ))}
                  {filteredMemories.length > 5 && (
                    <span className="text-[10px] text-[#F5D77F] font-mono">+{filteredMemories.length - 5} more</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="gold-beveled-btn px-4 py-2 text-xs text-[#FFF2A8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="gold-filled-btn px-5 py-2 text-xs font-bold uppercase"
                >
                  Seal Into Album
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMAGE VIEWER MODAL WITH ALL DETAILS */}
      {selectedImage && (
        <ImageViewerModal
          image={selectedImage}
          images={filteredMemories.filter(item => Boolean(item.imageUrl || item.videoUrl))}
          onSelectImage={(item) => setSelectedImage(item as MemoryItem)}
          onClose={() => setSelectedImage(null)}
          onPrev={() => {
            const currentIndex = filteredMemories.findIndex(m => m.id === selectedImage.id);
            if (currentIndex > 0) {
              setSelectedImage(filteredMemories[currentIndex - 1]);
            } else {
              setSelectedImage(filteredMemories[filteredMemories.length - 1]);
            }
          }}
          onNext={() => {
            const currentIndex = filteredMemories.findIndex(m => m.id === selectedImage.id);
            if (currentIndex < filteredMemories.length - 1) {
              setSelectedImage(filteredMemories[currentIndex + 1]);
            } else {
              setSelectedImage(filteredMemories[0]);
            }
          }}
          hasPrev={filteredMemories.length > 1}
          hasNext={filteredMemories.length > 1}
          onDelete={(id) => handleDeleteSingleMemory(id)}
          onSelectView={onSelectView}
          onOpenEditAlbum={handleOpenEditAlbum}
        />
      )}









      {/* FLOATING MULTI-SELECTION ACTION BAR */}
      {selectedGridPhotoIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#130A24]/95 border-2 border-[#DFB260] text-[#FFF2A8] px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-4 max-w-2xl w-[92%] sm:w-auto animate-fade-in">
          <div className="flex items-center space-x-2 border-r border-[#DFB260]/40 pr-3">
            <CheckSquare className="w-5 h-5 text-[#F5D77F]" />
            <span className="font-bold text-xs sm:text-sm font-mono whitespace-nowrap">
              {selectedGridPhotoIds.length} Selected
            </span>
            <span className="text-[10px] text-[#F5D77F]/80 hidden md:inline font-mono">
              (Shift + Click range)
            </span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => {
                setNewAlbumTitleInput(`Collection (${selectedGridPhotoIds.length} Photos)`);
                setIsGroupModalOpen(true);
              }}
              className="gold-filled-btn text-xs px-3 py-1.5 whitespace-nowrap cursor-pointer flex items-center space-x-1"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Group to Album</span>
            </button>

            <button
              onClick={() => setIsBatchTagModalOpen(true)}
              className="gold-beveled-btn text-xs px-3 py-1.5 text-[#FFF2A8] whitespace-nowrap cursor-pointer flex items-center space-x-1"
            >
              <Tag className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Tag Selected</span>
            </button>

            <button
              onClick={handleBatchDeleteSelectedGrid}
              className="bg-red-950/80 hover:bg-red-800 text-red-200 border border-red-500/40 text-xs px-3 py-1.5 rounded-xl whitespace-nowrap cursor-pointer flex items-center space-x-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={() => setSelectedGridPhotoIds(filteredMemories.map(m => m.id))}
              className="text-[11px] text-[#C8B1E4] hover:text-[#FFF2A8] underline whitespace-nowrap px-1 cursor-pointer"
            >
              Select All
            </button>

            <button
              onClick={() => setSelectedGridPhotoIds([])}
              className="p-1 text-[#C8B1E4] hover:text-[#FFF2A8] cursor-pointer"
              title="Clear Selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BATCH TAG MODAL */}
      {isBatchTagModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="cosmic-card-gold max-w-md w-full p-6 space-y-4 border border-[#DFB260] shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-cinzel font-bold text-lg text-[#FFF2A8] flex items-center gap-2">
                <Tag className="w-5 h-5 text-[#F5D77F]" />
                <span>Batch Tag {selectedGridPhotoIds.length} Photos</span>
              </h3>
              <button onClick={() => setIsBatchTagModalOpen(false)} className="text-[#C8B1E4] hover:text-[#FFF2A8]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#C8B1E4]">
              Enter tags (comma separated) to attach to all {selectedGridPhotoIds.length} selected items in your vault:
            </p>

            <input
              type="text"
              value={batchTagInput}
              onChange={(e) => setBatchTagInput(e.target.value)}
              placeholder="e.g. Hawaii, Vacation, 2024"
              className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-xs text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F]"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsBatchTagModalOpen(false)}
                className="px-4 py-2 bg-[#120B21] border border-[#DFB260]/30 rounded-xl text-xs text-[#C8B1E4]"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchTagSelectedGrid}
                className="gold-filled-btn px-4 py-2 text-xs font-bold cursor-pointer"
              >
                Apply Tags to {selectedGridPhotoIds.length} Items
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
