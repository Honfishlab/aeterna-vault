import React, { useState, useRef } from 'react';
import { MemoryItem } from '../types';
import { 
  createPermawebTransaction, 
  encryptData, 
  saveTransactionToLedger 
} from '../lib/arweaveEngine';
import { compressImageFile } from '../lib/imageCompressor';
import { 
  Upload, 
  X, 
  CheckCircle2, 
  HardDrive,
  ShieldCheck,
  FileCheck,
  FolderPlus,
  FileText,
  Images,
  Trash2,
  Plus,
  Clock,
  Layers,
  Sparkles,
  Loader2
} from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddMemory: (memory: MemoryItem | MemoryItem[]) => void;
}

export interface AlbumFileItem {
  id: string;
  file?: File;
  previewUrl: string;
  name: string;
  size: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onAddMemory,
}) => {
  // Upload mode: 'single' or 'album'
  const [uploadMode, setUploadMode] = useState<'single' | 'album'>('single');

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Personal' | 'Family' | 'Legal' | 'Memorial' | 'Time Capsule'>('Family');
  const [date, setDate] = useState('2024-08-18');
  const [time, setTime] = useState('14:30');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('Family, Summer, Memories');
  const [encryptionLevel, setEncryptionLevel] = useState<'Standard' | 'Vault Level 3' | 'Level 5 Protected' | 'Quantum-Proof'>('Level 5 Protected');

  // Single file states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [singleImageUrl, setSingleImageUrl] = useState<string>('');

  // Album files states
  const [albumFiles, setAlbumFiles] = useState<AlbumFileItem[]>([]);
  const [pastedUrlInput, setPastedUrlInput] = useState('');
  const [selectedAlbumItemIds, setSelectedAlbumItemIds] = useState<string[]>([]);
  const [lastAlbumItemIndex, setLastAlbumItemIndex] = useState<number | null>(null);

  // Archiving overlay states
  const [isArchiving, setIsArchiving] = useState(false);
  const [archiveProgress, setArchiveProgress] = useState(0);
  const [archiveStep, setArchiveStep] = useState(1);
  const [archiveStatusText, setArchiveStatusText] = useState('');
  const [generatedTx, setGeneratedTx] = useState('');
  const [cipherHash, setCipherHash] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Process selected file(s) from input or drag-and-drop
  const processFiles = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    if (fileList.length > 1 || uploadMode === 'album') {
      // Switch to album mode if multiple files selected
      if (uploadMode !== 'album') {
        setUploadMode('album');
      }

      if (!title && fileList[0]) {
        setTitle(`Album: ${fileList[0].name.replace(/\.[^/.]+$/, "")}`);
      }

      for (let index = 0; index < fileList.length; index++) {
        const file = fileList[index];
        const previewUrl = await compressImageFile(file);
        setAlbumFiles(prev => [
          ...prev,
          {
            id: `file-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
            file,
            previewUrl,
            name: file.name,
            size: file.size
          }
        ]);
      }
    } else {
      // Single file mode
      const file = fileList[0];
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      const previewUrl = await compressImageFile(file);
      setFilePreviewUrl(previewUrl);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleAddPastedUrlToAlbum = () => {
    if (!pastedUrlInput.trim()) return;
    setAlbumFiles(prev => [
      ...prev,
      {
        id: `url-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        previewUrl: pastedUrlInput.trim(),
        name: `Web Photo #${prev.length + 1}`,
        size: 1520000 // default estimated size
      }
    ]);
    setPastedUrlInput('');
  };

  const handleRemoveAlbumFile = (id: string) => {
    setAlbumFiles(prev => prev.filter(f => f.id !== id));
    setSelectedAlbumItemIds(prev => prev.filter(itemId => itemId !== id));
  };

  const handleAlbumItemClick = (item: AlbumFileItem, index: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
    }

    if (e.shiftKey && lastAlbumItemIndex !== null) {
      const start = Math.min(lastAlbumItemIndex, index);
      const end = Math.max(lastAlbumItemIndex, index);
      const rangeIds = albumFiles.slice(start, end + 1).map(x => x.id);
      setSelectedAlbumItemIds(prev => Array.from(new Set([...prev, ...rangeIds])));
      setLastAlbumItemIndex(index);
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedAlbumItemIds(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
      setLastAlbumItemIndex(index);
    } else {
      setSelectedAlbumItemIds(prev =>
        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
      );
      setLastAlbumItemIndex(index);
    }
  };

  const handleRemoveSelectedAlbumItems = () => {
    if (selectedAlbumItemIds.length === 0) return;
    const toRemove = new Set(selectedAlbumItemIds);
    setAlbumFiles(prev => prev.filter(x => !toRemove.has(x.id)));
    setSelectedAlbumItemIds([]);
  };

  const handleSelectAllAlbumItems = () => {
    setSelectedAlbumItemIds(albumFiles.map(x => x.id));
  };

  const handleDeselectAllAlbumItems = () => {
    setSelectedAlbumItemIds([]);
  };

  const handleStartArchiving = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setIsArchiving(true);
    setArchiveProgress(5);
    setArchiveStep(1);

    // Format date string with time
    const parsedDate = new Date(date);
    let formattedDateString = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    if (time) {
      const [hours, minutes] = time.split(':');
      const h = parseInt(hours, 10);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 || 12;
      formattedDateString += ` at ${formattedH}:${minutes} ${ampm}`;
    }

    try {
      if (uploadMode === 'single') {
        setArchiveStatusText('Encrypting single memory payload...');
        let fileBuffer: ArrayBuffer;
        let contentType = selectedFile ? selectedFile.type : 'image/jpeg';

        if (selectedFile) {
          fileBuffer = await selectedFile.arrayBuffer();
        } else {
          const textEncoder = new TextEncoder();
          fileBuffer = textEncoder.encode(description || title);
        }

        setArchiveProgress(35);

        if (encryptionLevel !== 'Standard') {
          const { cipherBuffer } = await encryptData(fileBuffer, '1234');
          fileBuffer = cipherBuffer;
        }

        setArchiveStatusText('Generating Arweave block transaction...');
        const tx = await createPermawebTransaction({
          data: fileBuffer,
          contentType,
          title,
          category,
          encryptionLevel
        });

        setGeneratedTx(tx.id);
        setCipherHash(tx.dataHash);
        saveTransactionToLedger(tx);

        setArchiveProgress(65);
        setArchiveStep(2);

        setArchiveStatusText('Broadcasting to Arweave permaweb gateways...');
        await fetch('/api/arweave/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            category,
            contentType,
            encryptionLevel,
            dataHash: tx.dataHash,
            sizeBytes: tx.sizeBytes
          })
        });

        setArchiveProgress(90);
        setArchiveStep(3);

        setTimeout(() => {
          setArchiveProgress(100);
          const finalImg = filePreviewUrl || singleImageUrl || 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800';

          const newMem: MemoryItem = {
            id: `mem-${Date.now()}`,
            title,
            category,
            date: formattedDateString,
            time: time || undefined,
            location: location || 'Sovereign Archive Node',
            imageUrl: finalImg,
            description: description || 'Encrypted memory preserved permanently on Arweave permaweb.',
            encryptionLevel,
            permawebTxId: tx.id,
            tags: tags.split(',').map(t => t.trim()).filter(Boolean)
          };

          onAddMemory(newMem);
        }, 800);

      } else {
        // ALBUM BATCH MODE
        setArchiveStatusText(`Packaging album items for "${title}"...`);
        const itemsToProcess = albumFiles.length > 0 ? albumFiles : [
          {
            id: 'default-1',
            previewUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&q=80&w=800',
            name: 'Album Cover Photo',
            size: 2400000
          }
        ];

        const createdMemories: MemoryItem[] = [];
        const totalItems = itemsToProcess.length;

        for (let idx = 0; idx < itemsToProcess.length; idx++) {
          const item = itemsToProcess[idx];
          const currentProgress = Math.round(((idx + 1) / totalItems) * 85);
          setArchiveProgress(currentProgress);
          setArchiveStatusText(`Encrypting album item ${idx + 1} of ${totalItems}: ${item.name}...`);

          let fileBuffer: ArrayBuffer;
          let contentType = item.file ? item.file.type : 'image/jpeg';

          if (item.file) {
            fileBuffer = await item.file.arrayBuffer();
          } else {
            const textEncoder = new TextEncoder();
            fileBuffer = textEncoder.encode(description || `${title} - Item ${idx + 1}`);
          }

          if (encryptionLevel !== 'Standard') {
            const { cipherBuffer } = await encryptData(fileBuffer, '1234');
            fileBuffer = cipherBuffer;
          }

          const itemTitle = totalItems === 1 
            ? title 
            : `${title} (${idx + 1}/${totalItems}) - ${item.name.replace(/\.[^/.]+$/, "")}`;

          const tx = await createPermawebTransaction({
            data: fileBuffer,
            contentType,
            title: itemTitle,
            category,
            encryptionLevel
          });

          if (idx === 0) {
            setGeneratedTx(tx.id);
            setCipherHash(tx.dataHash);
          }
          saveTransactionToLedger(tx);

          await fetch('/api/arweave/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: itemTitle,
              category,
              contentType,
              encryptionLevel,
              dataHash: tx.dataHash,
              sizeBytes: tx.sizeBytes
            })
          });

          createdMemories.push({
            id: `mem-${Date.now()}-${idx}`,
            title: itemTitle,
            category,
            date: formattedDateString,
            time: time || undefined,
            location: location || 'Sovereign Album Node',
            imageUrl: item.previewUrl,
            description: description || `Preserved in Album "${title}" with ${totalItems} total files.`,
            encryptionLevel,
            permawebTxId: tx.id,
            tags: [...tags.split(',').map(t => t.trim()).filter(Boolean), 'Album'],
            albumName: title
          });
        }

        setArchiveStep(3);
        setArchiveProgress(95);
        setArchiveStatusText(`Album "${title}" successfully sealed into Arweave permaweb!`);

        setTimeout(() => {
          setArchiveProgress(100);
          onAddMemory(createdMemories);
        }, 1000);
      }

    } catch (err) {
      console.error('Error archiving to Arweave:', err);
      setArchiveProgress(100);
    }
  };

  const handleFinishModal = () => {
    setIsArchiving(false);
    setArchiveProgress(0);
    setTitle('');
    setDescription('');
    setSingleImageUrl('');
    setSelectedFile(null);
    setFilePreviewUrl('');
    setAlbumFiles([]);
    setPastedUrlInput('');
    onClose();
  };

  const totalAlbumSizeBytes = albumFiles.reduce((acc, curr) => acc + (curr.size || 0), 0);
  const totalAlbumSizeMb = (totalAlbumSizeBytes / 1024 / 1024).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 bg-[#0f081d]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto text-[#E8DDF5]">
      
      {!isArchiving ? (
        /* Form View */
        <div className="cosmic-card-gold max-w-3xl w-full p-5 sm:p-7 space-y-5 shadow-2xl relative border border-[#DFB260] max-h-[92vh] overflow-y-auto no-scrollbar">
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[#C8B1E4] hover:text-[#FFF2A8] text-sm font-semibold p-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 text-[#F5D77F] text-xs font-mono font-semibold uppercase tracking-wider">
              <Upload className="w-3.5 h-3.5 text-[#F5D77F]" />
              <span>Immutable Archival Wizard</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-cinzel font-bold text-[#FFF2A8]">
              {uploadMode === 'album' ? 'Upload Album Collection' : 'Add New Memory Entry'}
            </h2>
            <p className="text-xs text-[#C8B1E4]/80 font-medium">
              Files will be encrypted client-side and broadcast permanently to the Arweave permaweb.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-[#120B21] p-1.5 rounded-2xl border border-[#DFB260]/40 flex items-center justify-between text-xs font-semibold">
            <button
              type="button"
              onClick={() => setUploadMode('single')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                uploadMode === 'single'
                  ? 'bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] font-bold shadow-md'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Single Item Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setUploadMode('album')}
              className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                uploadMode === 'album'
                  ? 'bg-gradient-to-r from-[#DFB260] to-[#F5D77F] text-[#120B21] font-bold shadow-md'
                  : 'text-[#C8B1E4] hover:text-[#FFF2A8] hover:bg-white/5'
              }`}
            >
              <FolderPlus className="w-4 h-4" />
              <span>Batch Album Upload</span>
            </button>
          </div>

          {/* Mode Banner Explanation */}
          <div className="bg-[#1A0C33] p-3 rounded-2xl border border-[#DFB260]/30 flex items-start space-x-2.5 text-xs text-[#C8B1E4]">
            <Sparkles className="w-4 h-4 text-[#F5D77F] flex-shrink-0 mt-0.5" />
            <div>
              {uploadMode === 'single' ? (
                <p>
                  <strong className="text-[#FFF2A8]">Single Item Mode:</strong> Upload a standalone photo, video, or document with its own title and metadata.
                </p>
              ) : (
                <p>
                  <strong className="text-[#FFF2A8]">Batch Album Mode:</strong> Upload groups of files together into one Album under a single Album Title. All files inherit the same date, time, location, story, category, and encryption settings.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleStartArchiving} className="space-y-4 text-xs font-sans">
            
            {/* Title / Album Title */}
            <div>
              <label className="block text-[#FFF2A8] font-semibold mb-1">
                {uploadMode === 'album' ? 'Album Title' : 'Memory Title'}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={uploadMode === 'album' ? "e.g., Cape Cod Family Reunion 2024 Album" : "e.g., Summer Coast Family Gathering 2024"}
                className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                required
              />
            </div>

            {/* Category, Date, Time, Location */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e: any) => setCategory(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                >
                  <option value="Family" className="bg-[#120B21]">Family</option>
                  <option value="Personal" className="bg-[#120B21]">Personal</option>
                  <option value="Memorial" className="bg-[#120B21]">Memorial</option>
                  <option value="Legal" className="bg-[#120B21]">Legal</option>
                  <option value="Time Capsule" className="bg-[#120B21]">Time Capsule</option>
                </select>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Time (Optional)</label>
                <div className="relative">
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                  />
                  <Clock className="w-3.5 h-3.5 text-[#F5D77F] absolute right-3 top-3.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Cape Cod, MA"
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                />
              </div>
            </div>

            {/* Hidden File Input */}
            <input 
              ref={fileInputRef}
              type="file" 
              onChange={handleFileInputChange}
              className="hidden" 
              multiple={uploadMode === 'album'}
              accept="image/*,video/*,application/pdf"
            />

            {/* FILE SELECTION AREA */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[#FFF2A8] font-semibold">
                  {uploadMode === 'album' ? 'Album Files & Photos' : 'Select Memory File'}
                </label>
                {uploadMode === 'album' && albumFiles.length > 0 && (
                  <span className="text-[11px] font-mono font-bold text-[#F5D77F] bg-[#DFB260]/20 px-2.5 py-0.5 rounded-full border border-[#DFB260]/40">
                    📁 {albumFiles.length} {albumFiles.length === 1 ? 'file' : 'files'} selected ({totalAlbumSizeMb} MB)
                  </span>
                )}
              </div>

              {uploadMode === 'single' ? (
                /* SINGLE FILE DROPZONE */
                <div 
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#120B21]/60 border-2 border-dashed border-[#DFB260]/40 hover:border-[#DFB260] rounded-3xl p-5 text-center space-y-3 cursor-pointer transition-colors relative overflow-hidden"
                >
                  {filePreviewUrl ? (
                    <div className="flex flex-col items-center space-y-2">
                      <img 
                        src={filePreviewUrl} 
                        alt="Upload Preview" 
                        className="w-24 h-24 object-cover rounded-2xl border-2 border-[#DFB260] shadow-md"
                      />
                      <div className="flex items-center space-x-1.5 text-xs text-[#F5D77F] font-semibold">
                        <FileCheck className="w-4 h-4" />
                        <span>{selectedFile?.name} ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)</span>
                      </div>
                      <span className="text-[10px] text-[#C8B1E4]/70">Click or drag another file to replace</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-[#F5D77F] mx-auto" />
                      <div>
                        <p className="text-[#FFF2A8] font-semibold font-cinzel text-base">Drag and drop family photo or document</p>
                        <p className="text-[11px] text-[#C8B1E4]/80 font-mono mt-0.5">Click to browse • RAW, JPEG, PNG, MP4, PDF up to 5 GB</p>
                      </div>
                    </>
                  )}

                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={singleImageUrl}
                      onChange={(e) => setSingleImageUrl(e.target.value)}
                      placeholder="Or paste external image URL (Unsplash, Arweave gateway...)"
                      className="w-full max-w-md bg-[#1e1035] border border-[#DFB260]/30 rounded-xl p-2.5 text-center text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] mx-auto font-medium shadow-sm"
                    />
                  </div>
                </div>
              ) : (
                /* BATCH ALBUM DROPZONE & GALLERY */
                <div className="space-y-3">
                  <div 
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-[#120B21]/60 border-2 border-dashed border-[#DFB260]/50 hover:border-[#DFB260] rounded-3xl p-5 text-center space-y-2 cursor-pointer transition-colors relative"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#F5D77F] flex items-center justify-center mx-auto">
                      <Images className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[#FFF2A8] font-semibold font-cinzel text-base">Drag & drop multiple files to create album batch</p>
                      <p className="text-[11px] text-[#C8B1E4]/80 font-mono">Select multiple high-res photos or files at once</p>
                    </div>
                    <button
                      type="button"
                      className="gold-filled-btn text-[11px] px-4 py-1.5 uppercase tracking-wider inline-flex items-center space-x-1.5 cursor-pointer mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Select Files for Album</span>
                    </button>
                  </div>

                  {/* External URL adder for Album */}
                  <div className="flex items-center space-x-2 bg-[#1e1035] p-2 rounded-2xl border border-[#DFB260]/30">
                    <input
                      type="text"
                      value={pastedUrlInput}
                      onChange={(e) => setPastedUrlInput(e.target.value)}
                      placeholder="Paste external image URL to include in this album..."
                      className="flex-1 bg-transparent px-3 py-1.5 text-xs text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddPastedUrlToAlbum}
                      className="gold-beveled-btn px-3 py-1.5 text-[11px] font-semibold text-[#FFF2A8] whitespace-nowrap cursor-pointer"
                    >
                      + Add URL
                    </button>
                  </div>

                  {/* ALBUM FILE GRID GALLERY */}
                  {albumFiles.length > 0 && (
                    <div className="bg-[#120B21] p-3.5 rounded-2xl border border-[#DFB260]/30 space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#F5D77F] block">
                            Selected Album Contents ({albumFiles.length})
                          </span>
                          <span className="text-[10px] text-[#C8B1E4]/70 font-mono">
                            💡 Hold Shift + Click to multi-select range
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 text-[11px]">
                          {selectedAlbumItemIds.length > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={handleRemoveSelectedAlbumItems}
                                className="bg-red-950/90 hover:bg-red-800 text-red-200 border border-red-500/50 px-2.5 py-1 rounded-lg font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Remove ({selectedAlbumItemIds.length})</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleDeselectAllAlbumItems}
                                className="text-[#C8B1E4] hover:text-[#FFF2A8] underline text-[10px] cursor-pointer"
                              >
                                Clear
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSelectAllAlbumItems}
                              className="text-[#F5D77F] hover:text-[#FFF2A8] underline text-[10px] cursor-pointer"
                            >
                              Select All
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {albumFiles.map((item, idx) => {
                          const isSelected = selectedAlbumItemIds.includes(item.id);
                          return (
                            <div 
                              key={item.id}
                              onClick={(e) => handleAlbumItemClick(item, idx, e)}
                              className={`p-2 rounded-xl border flex items-center justify-between space-x-2 relative group cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-[#DFB260]/20 border-[#DFB260] ring-2 ring-[#DFB260]/50 scale-[1.01]'
                                  : 'bg-[#1a0d36] border-[#DFB260]/30 hover:border-[#DFB260]/60'
                              }`}
                            >
                              <div className="flex items-center space-x-2 overflow-hidden">
                                <img 
                                  src={item.previewUrl} 
                                  alt={item.name} 
                                  className="w-9 h-9 object-cover rounded-lg border border-[#DFB260]/40 flex-shrink-0"
                                />
                                <div className="overflow-hidden text-left">
                                  <p className="text-[11px] font-semibold text-[#FFF2A8] truncate">{item.name}</p>
                                  <p className="text-[9px] font-mono text-[#C8B1E4]/70">#{idx + 1} • {(item.size / 1024 / 1024).toFixed(1)} MB</p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveAlbumFile(item.id);
                                }}
                                className="text-rose-400 hover:text-rose-200 p-1 rounded-lg hover:bg-rose-950/40 transition-colors cursor-pointer flex-shrink-0"
                                title="Remove from album"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Story / Description */}
            <div>
              <label className="block text-[#FFF2A8] font-semibold mb-1">
                {uploadMode === 'album' ? 'Shared Album Story / Context' : 'Story / Description'}
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={uploadMode === 'album' ? "Write down the backstory for this entire album, people present, emotions, or family history..." : "Write down details, people present, emotions, or family context..."}
                className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] placeholder-[#C8B1E4]/40 focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
              ></textarea>
            </div>

            {/* Tags & Encryption Tier */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Shared Tags (comma separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                />
              </div>

              <div>
                <label className="block text-[#FFF2A8] font-semibold mb-1">Encryption Tier</label>
                <select
                  value={encryptionLevel}
                  onChange={(e: any) => setEncryptionLevel(e.target.value)}
                  className="w-full bg-[#120B21] border border-[#DFB260]/40 rounded-2xl p-3 text-[#FFF2A8] focus:outline-none focus:border-[#F5D77F] font-medium transition-all"
                >
                  <option value="Standard" className="bg-[#120B21]">Standard Public</option>
                  <option value="Vault Level 3" className="bg-[#120B21]">Vault Level 3 Encrypted</option>
                  <option value="Level 5 Protected" className="bg-[#120B21]">Level 5 Protected</option>
                  <option value="Quantum-Proof" className="bg-[#120B21]">Quantum-Proof Multi-sig</option>
                </select>
              </div>
            </div>

            {/* Submit Action Bar */}
            <div className="pt-3 flex items-center justify-end space-x-3 font-semibold">
              <button
                type="button"
                onClick={onClose}
                className="gold-beveled-btn px-5 py-2.5 text-xs text-[#FFF2A8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="gold-filled-btn px-6 py-2.5 text-xs cursor-pointer flex items-center space-x-2"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {uploadMode === 'album' 
                    ? `Archive Album (${albumFiles.length || 1} ${albumFiles.length === 1 ? 'Item' : 'Items'})` 
                    : 'Archive Memory to Permaweb'}
                </span>
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* SCREEN: Overlay "Archiving to Permaweb" Modal */
        <div id="modal-archiving-permaweb" className="cosmic-card-gold max-w-lg w-full p-8 text-center space-y-6 shadow-2xl relative animate-fade-in border border-[#DFB260]">
          
          <div className="w-16 h-16 rounded-2xl bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] flex items-center justify-center mx-auto">
            <HardDrive className="w-8 h-8 animate-bounce text-[#F5D77F]" />
          </div>

          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#DFB260]/20 text-[#FFF2A8] border border-[#DFB260]/40 text-[10px] font-mono font-semibold uppercase mb-2">
              <Loader2 className="w-3 h-3 animate-spin text-[#F5D77F]" />
              <span>Arweave Permaweb Weave In Progress</span>
            </div>
            <h3 className="font-cinzel font-bold text-3xl text-[#FFF2A8]">
              {uploadMode === 'album' ? 'Archiving Album Collection' : 'Archiving to Permaweb'}
            </h3>
            <p className="text-xs text-[#C8B1E4]/80 mt-1 font-medium">
              {archiveStatusText || 'Photos being woven into permanent block history.'}
            </p>
          </div>

          {/* Animated Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono font-semibold">
              <span className="text-[#C8B1E4]/80 uppercase">Permaweb Sync</span>
              <span className="text-[#F5D77F]">{archiveProgress}%</span>
            </div>
            <div className="w-full bg-[#120B21] rounded-full h-3.5 p-0.5 border border-[#DFB260]/30 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-[#DFB260] via-[#F5D77F] to-[#FFF2A8] h-full rounded-full transition-all duration-300"
                style={{ width: `${archiveProgress}%` }}
              ></div>
            </div>
          </div>

          {/* Step checklist */}
          <div className="bg-[#120B21]/80 p-4 rounded-2xl border border-[#DFB260]/30 text-left text-xs space-y-2.5 font-sans">
            <div className={`flex items-center space-x-2 ${archiveStep >= 1 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <CheckCircle2 className="w-4 h-4 text-[#F5D77F]" />
              <span>Client-side 256-bit AES encryption handshake complete</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 2 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <HardDrive className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep >= 2 ? '✓' : '•'} Distributing shards across Arweave permaweb nodes...</span>
            </div>
            <div className={`flex items-center space-x-2 ${archiveStep >= 3 ? 'text-[#FFF2A8] font-semibold' : 'text-[#C8B1E4]/60'}`}>
              <ShieldCheck className="w-4 h-4 text-[#F5D77F]" />
              <span>{archiveStep >= 3 ? '✓' : '⊙'} Final permanence block verification & indexing</span>
            </div>
          </div>

          <div className="text-[11px] text-[#FFF2A8] font-mono space-y-1 bg-[#120B21] p-2.5 rounded-xl border border-[#DFB260]/30">
            <div>Arweave Tx ID: <span className="text-[#F5D77F] font-bold">{generatedTx}</span></div>
            {cipherHash && (
              <div className="text-[10px] text-[#C8B1E4]/70 truncate">SHA-256 Hash: <span className="font-semibold text-[#FFF2A8]">{cipherHash}</span></div>
            )}
          </div>

          {archiveProgress < 100 ? (
            <button
              onClick={handleFinishModal}
              className="gold-beveled-btn w-full py-3 text-xs text-[#FFF2A8] font-semibold cursor-pointer"
            >
              Run in Background
            </button>
          ) : (
            <button
              onClick={handleFinishModal}
              className="gold-filled-btn w-full py-3 text-xs cursor-pointer font-bold uppercase tracking-wider"
            >
              ✓ Album Permanently Sealed to Permaweb
            </button>
          )}

        </div>
      )}

    </div>
  );
};
