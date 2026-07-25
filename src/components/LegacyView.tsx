import React, { useState } from 'react';
import { ViewMode, LegacyLetter } from '../types';
import { 
  BookOpen, 
  PenTool, 
  Video, 
  Key, 
  Sparkles, 
  Bot, 
  Clock, 
  Users, 
  ShieldCheck, 
  Plus, 
  Send, 
  CheckCircle2, 
  Lock,
  ArrowRight,
  Trash2
} from 'lucide-react';

interface LegacyViewProps {
  onSelectView: (view: ViewMode) => void;
  letters: LegacyLetter[];
  onAddLetter: (letter: LegacyLetter) => void;
  onDeleteLetter?: (id: string) => void;
  onOpenConcierge: () => void;
}

export const LegacyView: React.FC<LegacyViewProps> = ({
  onSelectView,
  letters,
  onAddLetter,
  onDeleteLetter,
  onOpenConcierge,
}) => {
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [recipient, setRecipient] = useState('Great-Grandchildren');
  const [title, setTitle] = useState('A Message for the Future');
  const [releaseDate, setReleaseDate] = useState('2074-12-24');
  const [content, setContent] = useState('');
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);

  const handleAiStoryAssist = async () => {
    setIsGeneratingStory(true);
    try {
      const res = await fetch('/api/ai/story-helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: title || 'Family values and life wisdom',
          recipient,
          tone: 'Warm, sovereign, inspiring'
        })
      });
      const data = await res.json();
      if (data.story) {
        setContent(data.story);
      }
    } catch (e) {
      setContent(`Dearest ${recipient},\n\nAs I reflect upon life, I leave you these truths: value kindness, honor craftsmanship, and cherish every sunrise. The world moves fast, but character endures.`);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const handleSaveLetter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    const newLetter: LegacyLetter = {
      id: `let-${Date.now()}`,
      title,
      recipient,
      releaseDate: new Date(releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: 'Permanent',
      content,
      attachmentsCount: 1,
      heirsCount: 2,
      arweaveId: `ar_L3tt3r_${Math.random().toString(36).substring(2, 8)}`
    };

    onAddLetter(newLetter);
    setShowComposeModal(false);
    setContent('');
    setTitle('A Message for the Future');
  };

  return (
    <div id="legacy-view" className="space-y-8 pb-20 text-[#2E2342]">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white border border-purple-100/90 rounded-3xl p-8 shadow-sm">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-600 mb-2">
            <BookOpen className="w-4 h-4" />
            <span>Time Capsule Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2E2342]">
            Your Eternal Narrative
          </h1>
          <p className="text-[#6B5E85] text-sm mt-1 max-w-2xl font-medium">
            A place to curate memories, wisdom, and gifts for the generations that follow. Sealed on Arweave permaweb.
          </p>
        </div>

        <button
          id="btn-compose-letter"
          onClick={() => setShowComposeModal(true)}
          className="flex items-center space-x-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-2xl shadow-md shadow-emerald-500/15 transition-all cursor-pointer"
        >
          <PenTool className="w-4 h-4" />
          <span>+ Compose Legacy Letter</span>
        </button>
      </div>

      {/* Main Grid: Primary Action Cards & Timeline list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Action Cards & Active Capsules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Action Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Action 1: Write a Letter */}
            <div 
              onClick={() => setShowComposeModal(true)}
              className="bg-white hover:bg-purple-50/50 border border-purple-100 rounded-3xl p-6 cursor-pointer transition-all space-y-3 group shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-2xl flex items-center justify-center">
                <PenTool className="w-5 h-5 text-purple-700" />
              </div>
              <h3 className="font-serif font-bold text-[#2E2342] text-xl group-hover:text-purple-700 transition-colors">
                Write a Letter
              </h3>
              <p className="text-xs text-[#6B5E85] leading-relaxed font-medium">
                Seal your wisdom, personal reflections, and values in time. Choose release triggers for future generations.
              </p>
              <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 uppercase pt-1">
                <span>Compose now</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

            {/* Action 2: Record a Video */}
            <div 
              onClick={() => {
                alert("Simulated Video Recording Studio initialized. Voice & Video frames ready for Arweave block sealing.");
              }}
              className="bg-white hover:bg-purple-50/50 border border-purple-100 rounded-3xl p-6 cursor-pointer transition-all space-y-3 group shadow-sm hover:shadow-md"
            >
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center">
                <Video className="w-5 h-5 text-emerald-700" />
              </div>
              <h3 className="font-serif font-bold text-[#2E2342] text-xl group-hover:text-emerald-700 transition-colors">
                Record a Video Log
              </h3>
              <p className="text-xs text-[#6B5E85] leading-relaxed font-medium">
                A moving audio-visual memory for the future. Capture your voice, facial expressions, and personal warmth.
              </p>
              <div className="flex items-center space-x-1 text-xs font-semibold text-emerald-600 uppercase pt-1">
                <span>Launch Studio</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
              </div>
            </div>

          </div>

          {/* Active Capsules Timeline */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <h3 className="font-serif font-bold text-[#2E2342] text-xl">Active Time Capsules</h3>
              <span className="text-xs text-[#6B5E85] font-semibold">{letters.length} Sealed Entries</span>
            </div>

            <div className="space-y-4">
              {letters.map((letter) => (
                <div 
                  key={letter.id}
                  className="bg-purple-50/50 border border-purple-100 rounded-2xl p-5 space-y-3 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {letter.status}
                        </span>
                        <span className="text-xs text-[#6B5E85]">To: <strong className="text-[#2E2342]">{letter.recipient}</strong></span>
                      </div>
                      <h4 className="text-lg font-serif font-bold text-[#2E2342] mt-1">{letter.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-[#2E2342] font-mono font-semibold bg-white px-2.5 py-1 rounded-xl border border-purple-100 flex items-center gap-1 shadow-xs">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        {letter.releaseDate}
                      </span>
                      {onDeleteLetter && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete the letter "${letter.title}"?`)) {
                              onDeleteLetter(letter.id);
                            }
                          }}
                          className="p-1.5 rounded-xl bg-white hover:bg-red-50 text-red-400 hover:text-red-600 border border-purple-100 transition-colors cursor-pointer"
                          title="Delete Letter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#6B5E85] italic line-clamp-2 bg-white p-3 rounded-xl border border-purple-100/80 font-medium">
                    "{letter.content}"
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-[#6B5E85] font-mono pt-2 border-t border-purple-100">
                    <span className="text-emerald-600 font-bold">TX: {letter.arweaveId}</span>
                    <div className="flex items-center space-x-3 font-semibold">
                      <span>📎 {letter.attachmentsCount} Attachments</span>
                      <span>👥 {letter.heirsCount} Designated Heirs</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column: AI Storytelling Assistant */}
        <div className="space-y-6">
          <div className="bg-purple-950 text-white border border-purple-900 rounded-3xl p-6 space-y-4 shadow-xl shadow-purple-950/10">
            <div className="flex items-center space-x-3 border-b border-purple-800 pb-3">
              <div className="w-9 h-9 bg-[#10B981] text-white rounded-2xl flex items-center justify-center font-bold shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-white">AI Storytelling Assistant</h3>
                <span className="text-[11px] text-emerald-400 font-mono font-semibold tracking-wide">Autobiography Assistant</span>
              </div>
            </div>

            <div className="bg-purple-900/60 p-4 rounded-2xl border border-purple-800/60 text-xs text-purple-100 space-y-3 font-sans">
              <p className="leading-relaxed italic font-serif text-sm text-purple-100">
                "I've noticed you shared many memories from your garden this summer. Would you like me to draft a story outline titled 'The Harvest of 2024'?"
              </p>
              <div className="space-y-2 pt-1 font-semibold text-xs">
                <button
                  onClick={onOpenConcierge}
                  className="w-full bg-[#10B981] hover:bg-[#059669] text-white py-2.5 rounded-2xl transition-all shadow-sm cursor-pointer"
                >
                  Yes, help me write that
                </button>
                <button
                  onClick={onOpenConcierge}
                  className="w-full bg-purple-900 hover:bg-purple-800 text-purple-200 py-2.5 rounded-2xl border border-purple-700/60 transition-colors cursor-pointer"
                >
                  Show me more suggestions
                </button>
              </div>
            </div>

            {/* Archival Progress Meter */}
            <div className="pt-4 border-t border-purple-800 space-y-2 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-purple-300 font-semibold uppercase">Archival Progress</span>
                <span className="text-emerald-400 font-bold">75% Preserved</span>
              </div>
              <div className="w-full bg-purple-900/80 rounded-full h-2 p-0.5 border border-purple-800 overflow-hidden">
                <div className="bg-emerald-500 rounded-full h-full w-[75%]"></div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Compose Letter Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 z-50 bg-[#2E2342]/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-purple-100 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-purple-100 pb-3">
              <div className="flex items-center space-x-2">
                <PenTool className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-[#2E2342] text-xl">Compose Time Capsule Letter</h3>
              </div>
              <button 
                onClick={() => setShowComposeModal(false)}
                className="text-[#6B5E85] hover:text-[#2E2342] p-1.5 rounded-full hover:bg-purple-50 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLetter} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#2E2342] font-semibold mb-1">Letter Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Reflections on Family & Crafts"
                  className="w-full bg-purple-50/50 border border-purple-100 rounded-2xl p-3 text-[#2E2342] focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#2E2342] font-semibold mb-1">Recipient(s)</label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="e.g. Great-Grandchildren"
                    className="w-full bg-purple-50/50 border border-purple-100 rounded-2xl p-3 text-[#2E2342] focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#2E2342] font-semibold mb-1">Target Release Date</label>
                  <input
                    type="date"
                    value={releaseDate}
                    onChange={(e) => setReleaseDate(e.target.value)}
                    className="w-full bg-purple-50/50 border border-purple-100 rounded-2xl p-3 text-[#2E2342] focus:outline-none focus:border-emerald-500 focus:bg-white font-medium transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[#2E2342] font-semibold">Message Content</label>
                  <button
                    type="button"
                    onClick={handleAiStoryAssist}
                    disabled={isGeneratingStory}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold text-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isGeneratingStory ? "Generating with Gemini..." : "AI Auto-Draft Letter"}</span>
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your story, advice, and thoughts for the future..."
                  className="w-full bg-purple-50/50 border border-purple-100 rounded-2xl p-3 text-[#2E2342] focus:outline-none focus:border-emerald-500 focus:bg-white leading-relaxed font-medium transition-all"
                  required
                ></textarea>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3 font-semibold">
                <button
                  type="button"
                  onClick={() => setShowComposeModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-purple-100 text-[#2E2342] hover:bg-purple-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#10B981] hover:bg-[#059669] text-white shadow-md shadow-emerald-500/15 transition-all"
                >
                  Seal on Arweave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
