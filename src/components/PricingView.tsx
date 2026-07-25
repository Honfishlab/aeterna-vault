import React, { useState } from 'react';
import { ViewMode } from '../types';
import { 
  Check, 
  ShieldCheck, 
  Sparkles, 
  Award, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Database,
  Lock,
  Zap
} from 'lucide-react';

interface PricingViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  onSelectView,
  onOpenUpload,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "What happens if I stop paying my subscription?",
      a: "Unlike traditional subscription apps that purge your data, Aeterna Vault relies on Arweave endowment storage. All data already written to the permaweb remains accessible and permanently preserved forever, even if you pause subscription features like new AI Concierge queries."
    },
    {
      q: "How secure is my data against future quantum threats?",
      a: "Your files are encrypted on your device prior to broadcast using 256-bit AES client-side keys and post-quantum multi-sig thresholds. Only holders of your master seed key can decrypt the content."
    },
    {
      q: "How do my heirs access the vault when the time comes?",
      a: "You configure designated Trustees in your Legacy Locker settings. If our automated proof-of-life protocol records inactivity for your chosen duration (e.g. 180 days), encrypted shard keys are dispatched to your verified heirs."
    },
    {
      q: "Can I transfer large photo and raw video archives?",
      a: "Yes. The Family Legacy and Eternal Estate tiers support high-throughput chunked uploads up to 5 TB per vault."
    }
  ];

  return (
    <div id="pricing-view" className="space-y-12 pb-20 text-[#E8DDF5]">
      
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-[#DFB260]/20 border border-[#DFB260]/40 text-[#FFF2A8] text-xs font-semibold rounded-full">
          <Award className="w-3.5 h-3.5 text-[#F5D77F]" />
          <span>Sovereign Storage Plans</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-cinzel font-bold text-[#FFF2A8] tracking-tight">
          Preserve Your Life's Work
        </h1>
        <p className="text-[#C8B1E4]/80 text-sm sm:text-base leading-relaxed font-medium">
          Simple, transparent, and permanent. Choose how you want to be remembered across generations with decentralized permaweb guarantees.
        </p>

        {/* Billing Switcher Toggle */}
        <div className="flex items-center justify-center pt-4">
          <div className="bg-[#120B21]/90 p-1.5 rounded-2xl border border-[#DFB260]/30 flex items-center space-x-1 text-xs font-semibold">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                billingCycle === 'monthly' ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer ${
                billingCycle === 'annual' ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
              }`}
            >
              <span>Annual</span>
              <span className="text-[10px] bg-[#120B21] text-[#F5D77F] font-bold px-2 py-0.5 rounded-full ml-1 border border-[#DFB260]/40">Save 20%</span>
            </button>
            <button
              onClick={() => setBillingCycle('lifetime')}
              className={`px-4 py-2 rounded-xl transition-all cursor-pointer ${
                billingCycle === 'lifetime' ? 'bg-[#DFB260] text-[#120B21] font-bold shadow-md' : 'text-[#C8B1E4]/80 hover:text-[#FFF2A8]'
              }`}
            >
              Lifetime Endowment
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Tier 1: Essential Safekeeping */}
        <div className="cosmic-card p-8 flex flex-col justify-between hover:border-[#DFB260] transition-all space-y-6 shadow-xl">
          <div className="space-y-4">
            <h3 className="text-xl font-cinzel font-bold text-[#FFF2A8]">Essential Safekeeping</h3>
            <p className="text-xs text-[#C8B1E4]/80 font-medium">Personal Life Archive for key documents and essential memories.</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-bold font-cinzel text-[#FFF2A8]">$0</span>
              <span className="text-xs text-[#C8B1E4]/70 font-mono font-medium">/ forever free</span>
            </div>

            <div className="pt-4 border-t border-[#DFB260]/20 space-y-3 text-xs text-[#E8DDF5] font-medium">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>10 GB Permaweb Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Standard Client Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Universal Web Access</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Basic AI Search Tagging</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="gold-beveled-btn w-full py-3.5 text-xs text-[#FFF2A8] font-bold uppercase cursor-pointer"
          >
            Start Free Vault
          </button>
        </div>

        {/* Tier 2: Family Legacy (RECOMMENDED) */}
        <div className="cosmic-card-gold p-8 flex flex-col justify-between shadow-2xl shadow-[#DFB260]/10 relative space-y-6 border-2 border-[#DFB260]">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#DFB260] text-[#120B21] text-[11px] font-bold uppercase tracking-wider px-3.5 py-1 rounded-full shadow-md">
            Most Popular
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-cinzel font-bold text-[#FFF2A8]">Family Legacy</h3>
            <p className="text-xs text-[#C8B1E4]/90 font-medium">Comprehensive multi-generational vault with AI Concierge.</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-5xl font-bold font-cinzel text-[#FFF2A8]">
                {billingCycle === 'monthly' ? '$24' : billingCycle === 'annual' ? '$19' : '$490'}
              </span>
              <span className="text-xs text-[#C8B1E4]/80 font-mono font-medium">
                {billingCycle === 'lifetime' ? 'one-time fee' : '/ month'}
              </span>
            </div>

            <div className="pt-4 border-t border-[#DFB260]/30 space-y-3 text-xs text-[#FFF2A8] font-medium">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>1 TB Permaweb Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Full AI Concierge Assistant (Gemini 2.5)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Smart Inheritance Protocol (5 Heirs)</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Level 5 Vault Encryption</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Interactive Video & Journal Time Capsules</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="gold-filled-btn w-full py-4 text-xs uppercase tracking-wider cursor-pointer shadow-[0_0_20px_rgba(245,215,127,0.3)]"
          >
            Preserve Family Legacy
          </button>
        </div>

        {/* Tier 3: Eternal Estate */}
        <div className="cosmic-card p-8 flex flex-col justify-between hover:border-[#DFB260] transition-all space-y-6 shadow-xl">
          <div className="space-y-4">
            <h3 className="text-xl font-cinzel font-bold text-[#FFF2A8]">Eternal Estate</h3>
            <p className="text-xs text-[#C8B1E4]/80 font-medium">Maximum capacity and quantum-proof estate protection.</p>
            <div className="flex items-baseline space-x-1">
              <span className="text-4xl font-bold font-cinzel text-[#FFF2A8]">
                {billingCycle === 'monthly' ? '$59' : billingCycle === 'annual' ? '$49' : '$1,250'}
              </span>
              <span className="text-xs text-[#C8B1E4]/70 font-mono font-medium">
                {billingCycle === 'lifetime' ? 'one-time endowment' : '/ month'}
              </span>
            </div>

            <div className="pt-4 border-t border-[#DFB260]/20 space-y-3 text-xs text-[#E8DDF5] font-medium">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>5 TB Permaweb Storage</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Unlimited Designated Heirs</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>Quantum-Proof Multi-Sig Sharding</span>
              </div>
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-[#F5D77F] flex-shrink-0" />
                <span>White-Glove Digitization Support</span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenUpload}
            className="gold-beveled-btn w-full py-3.5 text-xs text-[#FFF2A8] font-bold uppercase cursor-pointer"
          >
            Contact Sovereign Archival
          </button>
        </div>

      </div>

      {/* FAQ Accordion Section */}
      <div className="cosmic-card p-8 md:p-12 space-y-6 shadow-xl">
        <div className="flex items-center space-x-3 text-[#FFF2A8]">
          <HelpCircle className="w-5 h-5 text-[#F5D77F]" />
          <h2 className="text-3xl font-cinzel font-bold text-[#FFF2A8]">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-[#120B21]/80 border border-[#DFB260]/30 rounded-2xl transition-all overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-semibold text-[#FFF2A8] hover:text-[#F5D77F] transition-colors cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-[#F5D77F]" /> : <ChevronDown className="w-4 h-4 text-[#C8B1E4]/70" />}
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 text-xs text-[#C8B1E4]/90 leading-relaxed border-t border-[#DFB260]/20 pt-3 font-medium">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
