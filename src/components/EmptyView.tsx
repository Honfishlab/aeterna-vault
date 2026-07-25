import React from 'react';
import { ViewMode } from '../types';
import { 
  Sparkles, 
  Upload, 
  Mic, 
  ShieldCheck, 
  ArrowRight, 
  PlusCircle, 
  Lock, 
  CheckCircle2, 
  Database 
} from 'lucide-react';

interface EmptyViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
}

export const EmptyView: React.FC<EmptyViewProps> = ({
  onSelectView,
  onOpenUpload,
}) => {
  return (
    <div id="empty-view" className="space-y-8 pb-20 text-[#2E2342]">
      
      {/* Search & Header Bar */}
      <div className="flex items-center justify-between bg-white border border-purple-100 rounded-2xl p-4 shadow-sm">
        <h2 className="font-serif font-bold text-[#2E2342] text-lg">Your Sovereign Vault</h2>
        <span className="text-xs font-mono font-semibold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
          Clean Slate Mode
        </span>
      </div>

      {/* Hero Card: A new beginning */}
      <div className="bg-white border border-purple-100 rounded-3xl p-8 md:p-12 text-center space-y-6 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-purple-700" />
        </div>

        <div className="space-y-2 max-w-xl mx-auto">
          <span className="text-emerald-600 text-xs font-semibold uppercase tracking-wider font-mono">A New Beginning</span>
          <h1 className="text-3xl font-serif font-bold text-[#2E2342]">
            Starting Your Legacy
          </h1>
          <p className="text-sm text-[#6B5E85] leading-relaxed font-medium">
            Your vault is empty, but it won't be for long. Follow our guided setup steps below to store your first permanent memory on the Arweave permaweb.
          </p>
        </div>

        <button
          onClick={onOpenUpload}
          className="inline-flex items-center space-x-2 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-8 py-3.5 rounded-2xl shadow-md shadow-emerald-500/15 text-xs transition-all cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Start Guided Setup</span>
        </button>
      </div>

      {/* Next Steps Grid */}
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-[#2E2342] text-base">Next Recommended Steps</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Step 1 */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 hover:border-purple-200 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Upload className="w-5 h-5 text-purple-700" />
            </div>
            <h4 className="font-serif font-bold text-[#2E2342] text-base">Upload your first photo</h4>
            <p className="text-xs text-[#6B5E85] font-medium">Add a precious family portrait or heirloom memory to seed your vault.</p>
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold hover:underline"
            >
              <span>Let's go</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 2 */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 hover:border-purple-200 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <Mic className="w-5 h-5 text-purple-700" />
            </div>
            <h4 className="font-serif font-bold text-[#2E2342] text-base">Record a voice greeting</h4>
            <p className="text-xs text-[#6B5E85] font-medium">Capture your vocal reflection so future generations can hear your voice.</p>
            <button
              onClick={() => onSelectView('legacy')}
              className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold hover:underline"
            >
              <span>Open Recorder</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Step 3 */}
          <div className="bg-white border border-purple-100 rounded-3xl p-6 space-y-4 hover:border-purple-200 transition-all shadow-sm">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-700" />
            </div>
            <h4 className="font-serif font-bold text-[#2E2342] text-base">Set up inheritance trigger</h4>
            <p className="text-xs text-[#6B5E85] font-medium">Designate trusted heirs who will receive decryption keys when conditions pass.</p>
            <button
              onClick={() => onSelectView('locker')}
              className="inline-flex items-center space-x-1.5 text-xs text-emerald-600 font-semibold hover:underline"
            >
              <span>Configure Access</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
