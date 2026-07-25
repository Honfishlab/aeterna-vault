import React, { useState } from 'react';
import { ViewMode, MemorialShrine } from '../types';
import { 
  Sparkles, 
  Flame, 
  Heart, 
  Plus, 
  Share2, 
  BookOpen, 
  CheckCircle2, 
  Users,
  Trash2
} from 'lucide-react';

interface MemorialsViewProps {
  onSelectView: (view: ViewMode) => void;
  memorials: MemorialShrine[];
  onToggleCandle: (id: string) => void;
  onDeleteMemorial?: (id: string) => void;
}

export const MemorialsView: React.FC<MemorialsViewProps> = ({
  onSelectView,
  memorials,
  onToggleCandle,
  onDeleteMemorial,
}) => {
  const [selectedShrine, setSelectedShrine] = useState<MemorialShrine | null>(null);

  return (
    <div id="memorials-view" className="space-y-8 pb-20 text-[#2E2342]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-purple-100/90 rounded-3xl p-8 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-600 mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Zone 02: Digital Ancestral Shrines</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2E2342]">
            Digital Memorial Shrines
          </h1>
          <p className="text-[#6B5E85] text-sm mt-1 max-w-2xl font-medium">
            Honoring ancestors and loved ones with gold-trimmed digital shrines, permanent video archives, and eternal tribute flames.
          </p>
        </div>

        <button
          onClick={() => {
            alert("New Memorial Shrine Creation Wizard initialized.");
          }}
          className="flex items-center space-x-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-2xl shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create New Shrine</span>
        </button>
      </div>

      {/* Shrines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {memorials.map((shrine) => (
          <div
            key={shrine.id}
            className="bg-white border border-purple-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all space-y-5 relative group"
          >
            {onDeleteMemorial && (
              <button
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete the memorial shrine for "${shrine.name}"?`)) {
                    onDeleteMemorial(shrine.id);
                  }
                }}
                className="absolute top-4 right-4 p-2 rounded-xl bg-purple-50 hover:bg-red-50 text-purple-400 hover:text-red-600 transition-colors cursor-pointer"
                title="Delete Shrine"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {/* Avatar Photo */}
            <div className="relative w-32 h-32 mx-auto p-1 bg-purple-50 rounded-2xl border border-purple-100 overflow-hidden">
              <img
                src={shrine.imageUrl}
                alt={shrine.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-xl"
              />
              
              {/* Flame Badge */}
              <div className="absolute -bottom-2 -right-2 bg-purple-900 p-2 rounded-xl border border-purple-800 shadow-sm">
                <Flame className={`w-5 h-5 ${shrine.candleLitToday ? 'text-emerald-400 animate-pulse' : 'text-purple-400'}`} />
              </div>
            </div>

            {/* Name & Motto */}
            <div className="text-center space-y-1">
              <h3 className="font-serif font-bold text-2xl text-[#2E2342] group-hover:text-purple-700 transition-colors">
                {shrine.name}
              </h3>
              <p className="text-xs font-mono font-bold text-emerald-600 uppercase tracking-wider">{shrine.years}</p>
              <p className="text-xs text-[#6B5E85] font-medium">{shrine.relationship}</p>
            </div>

            {/* Quote / Motto */}
            <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-100/80 text-xs text-[#2E2342] italic text-center font-serif">
              "{shrine.motto}"
            </div>

            {/* Actions */}
            <div className="pt-2 border-t border-purple-100 flex items-center justify-between gap-2 text-xs font-semibold">
              <button
                onClick={() => onToggleCandle(shrine.id)}
                className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-2xl transition-all cursor-pointer ${
                  shrine.candleLitToday
                    ? 'bg-[#10B981] text-white shadow-sm'
                    : 'bg-purple-100 hover:bg-purple-200 text-purple-900'
                }`}
              >
                <Flame className={`w-4 h-4 ${shrine.candleLitToday ? 'text-white' : 'text-emerald-600'}`} />
                <span>{shrine.candleLitToday ? 'Flame Lit Today' : 'Light Flame'}</span>
              </button>

              <button
                onClick={() => setSelectedShrine(shrine)}
                className="px-3.5 py-2.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-2xl transition-colors cursor-pointer"
              >
                Tributes ({shrine.tributesCount})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tribute Stories Modal */}
      {selectedShrine && (
        <div className="fixed inset-0 z-50 bg-[#2E2342]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-purple-100 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedShrine(null)}
              className="absolute top-4 right-4 text-[#6B5E85] hover:text-[#2E2342] p-1.5 rounded-full hover:bg-purple-50 transition-colors"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3">
              <img src={selectedShrine.imageUrl} className="w-12 h-12 object-cover rounded-xl border border-purple-100" />
              <div>
                <h3 className="font-serif font-bold text-[#2E2342] text-xl">{selectedShrine.name}</h3>
                <span className="text-xs text-emerald-600 font-mono font-semibold uppercase">{selectedShrine.years}</span>
              </div>
            </div>

            <div className="space-y-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-xs text-[#2E2342] max-h-60 overflow-y-auto">
              <div className="border-b border-purple-100 pb-2">
                <p className="font-bold uppercase text-[#2E2342]">Clara Pendelton (Niece):</p>
                <p className="italic text-[#6B5E85] mt-1 font-medium">"Grandmother's piano melodies still linger in our holiday memories. Her wisdom remains our guiding beacon."</p>
              </div>
              <div>
                <p className="font-bold uppercase text-[#2E2342]">Arthur Pendelton II:</p>
                <p className="italic text-[#6B5E85] mt-1 font-medium">"Remembering our summer hikes across the Green Mountains. Rest in peace."</p>
              </div>
            </div>

            <button
              onClick={() => {
                alert("Tribute logged to permanent Arweave block history!");
                setSelectedShrine(null);
              }}
              className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold py-3 rounded-2xl text-xs transition-all shadow-md shadow-emerald-500/15 cursor-pointer"
            >
              + Add Family Tribute Story
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
