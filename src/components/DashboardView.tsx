import React, { useState } from 'react';
import { ViewMode, MemoryItem, UserProfile, MemorialShrine, Heir } from '../types';
import { StorageUsageDashboard } from './StorageUsageDashboard';
import { Archive, ArrowRight, BookOpen, Check, CheckCircle2, Circle, FileText, Images, Plus, RotateCcw, Sparkles, Trash2, Users, Video } from 'lucide-react';

interface DashboardViewProps {
  onSelectView: (view: ViewMode) => void;
  onOpenUpload: () => void;
  onOpenVideoRecorder?: () => void;
  onOpenConcierge: () => void;
  memories: MemoryItem[];
  memorials?: MemorialShrine[];
  heirs?: Heir[];
  currentUser: UserProfile | null;
  onClearDemoContent?: () => void;
  onRestoreDemoContent?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectView,onOpenUpload,onOpenVideoRecorder,memories,memorials=[],heirs=[],currentUser,onClearDemoContent,onRestoreDemoContent }) => {
  const [showConfirmClear,setShowConfirmClear]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const firstName=currentUser?.name.split(' ')[0]||'there';
  const clear=()=>{onClearDemoContent?.();setShowConfirmClear(false);setNotice('Sample content removed. Your vault is ready for your memories.');};
  const restore=()=>{onRestoreDemoContent?.();setNotice('Sample content restored.');};
  const cards=[
    {id:'search' as ViewMode,title:'Memories',description:'Photos, videos, and the stories that give them meaning.',meta:`${memories.length} items`,icon:Images},
    {id:'legacy' as ViewMode,title:'Letters',description:'Write messages and time capsules for loved ones.',meta:'Write for later',icon:BookOpen},
    {id:'memorials' as ViewMode,title:'Memorials',description:'Honor family members and preserve their stories.',meta:`${memorials.length} memorials`,icon:Sparkles},
    {id:'locker' as ViewMode,title:'Important Documents',description:'Keep essential records together with your legacy.',meta:'Review documents',icon:FileText},
    {id:'inheritance' as ViewMode,title:'Family Access',description:'Invite trusted people and plan future access.',meta:`${heirs.length} people`,icon:Users},
    {id:'immortal' as ViewMode,title:'Permanent Archive',description:'Review files submitted for permanent storage.',meta:'View archive',icon:Archive},
  ];
  const setupSteps=[
    {done:memories.length>0,label:'Add your first memory',action:onOpenUpload},
    {done:memories.some(memory=>Boolean(memory.albumName)),label:'Create an album',action:()=>onSelectView('search')},
    {done:heirs.length>0,label:'Invite a trusted family member',action:()=>onSelectView('inheritance')},
  ];
  const completedSteps=setupSteps.filter(step=>step.done).length;
  return <div id="dashboard-view" className="space-y-8 pb-28 text-[#E8DDF5] md:pb-16">
    {notice&&<div role="status" className="flex items-center justify-between rounded-2xl border border-emerald-500/40 bg-emerald-950/80 p-4 text-sm text-emerald-100"><span className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5"/>{notice}</span><button onClick={()=>setNotice(null)} className="min-h-11 px-3 underline">Dismiss</button></div>}

    <section className="rounded-3xl border border-[#DFB260]/40 bg-[#160D27]/95 p-6 shadow-2xl sm:p-8" aria-labelledby="welcome-title">
      <p className="mb-2 text-sm font-semibold text-[#F5D77F]">Your family vault</p>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div><h1 id="welcome-title" className="text-3xl font-bold text-[#FFF2A8] sm:text-4xl">Welcome back, {firstName}</h1><p className="mt-3 max-w-2xl text-base leading-7 text-[#D8CCE8]">Add a memory, continue a letter, or review anything that needs your attention. Permanent archive status is shown only when it can be verified.</p></div>
        <div className="flex flex-wrap gap-3"><button id="btn-dashboard-new-entry" onClick={onOpenUpload} className="flex min-h-12 items-center gap-2 rounded-xl bg-[#F5D77F] px-5 font-bold text-[#120B21] hover:bg-[#FFF2A8]"><Plus className="h-5 w-5"/>Add a memory</button>{onOpenVideoRecorder&&<button id="btn-dashboard-record-video" onClick={onOpenVideoRecorder} className="flex min-h-12 items-center gap-2 rounded-xl border border-[#DFB260]/50 bg-[#28134D] px-5 font-semibold text-white"><Video className="h-5 w-5"/>Record a story</button>}</div>
      </div>
    </section>

    {completedSteps < setupSteps.length && <section aria-labelledby="setup-title" className="rounded-2xl border border-[#DFB260]/30 bg-[#160D27]/92 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#F5D77F]">Getting started</p><h2 id="setup-title" className="mt-1 text-xl font-bold text-[#FFF2A8]">Set up your family vault</h2><p className="mt-2 text-sm text-[#D8CCE8]">{completedSteps} of {setupSteps.length} complete</p></div><div className="h-2 w-40 overflow-hidden rounded-full bg-black/30" aria-hidden="true"><div className="h-full bg-[#F5D77F]" style={{width:`${completedSteps/setupSteps.length*100}%`}}/></div></div><div className="mt-5 grid gap-2 sm:grid-cols-3">{setupSteps.map(step=><button key={step.label} onClick={step.action} className="flex min-h-14 items-center gap-3 rounded-xl border border-[#DFB260]/25 px-4 text-left text-sm hover:border-[#F5D77F]">{step.done?<Check className="h-5 w-5 text-emerald-300"/>:<Circle className="h-5 w-5 text-[#C8B1E4]"/>}<span className={step.done?'text-[#C8B1E4] line-through':'font-semibold text-[#FFF2A8]'}>{step.label}</span></button>)}</div></section>}

    <section aria-labelledby="vault-title"><div className="mb-4 flex flex-wrap items-end justify-between gap-2"><div><p className="text-sm font-semibold text-[#F5D77F]">Everything in one place</p><h2 id="vault-title" className="text-2xl font-bold text-[#FFF2A8]">Your Vault</h2></div><button onClick={()=>onSelectView('search')} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#FFF2A8] hover:bg-white/5">Browse all memories →</button></div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(card=>{const Icon=card.icon;return <button key={card.id} id={`vault-card-${card.id}`} onClick={()=>onSelectView(card.id)} className="group min-h-48 rounded-2xl border border-[#DFB260]/30 bg-[#160D27]/92 p-5 text-left shadow-lg transition hover:-translate-y-0.5 hover:border-[#F5D77F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FFF2A8]"><div className="flex items-start justify-between"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#DFB260]/15 text-[#F5D77F]"><Icon className="h-5 w-5"/></span><ArrowRight className="h-5 w-5 text-[#F5D77F] transition group-hover:translate-x-1"/></div><h3 className="mt-5 text-xl font-bold text-[#FFF2A8]">{card.title}</h3><p className="mt-2 text-sm leading-6 text-[#D8CCE8]">{card.description}</p><p className="mt-4 text-sm font-semibold text-[#F5D77F]">{card.meta}</p></button>})}</div>
    </section>

    <section aria-labelledby="attention-title" className="grid gap-5 lg:grid-cols-[1fr_2fr]">
      <div className="rounded-2xl border border-[#DFB260]/30 bg-[#160D27]/92 p-6"><p className="text-sm font-semibold text-[#F5D77F]">Next step</p><h2 id="attention-title" className="mt-1 text-xl font-bold text-[#FFF2A8]">Complete your family plan</h2><p className="mt-3 text-sm leading-6 text-[#D8CCE8]">Add a trusted family member, then decide which memories and letters they may receive later.</p><button onClick={()=>onSelectView('inheritance')} className="mt-5 min-h-11 rounded-xl border border-[#DFB260]/45 px-4 text-sm font-bold text-[#FFF2A8]">Review family access</button></div>
      <div className="rounded-2xl border border-[#DFB260]/30 bg-[#160D27]/92 p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#F5D77F]">Storage summary</p><h2 className="mt-1 text-xl font-bold text-[#FFF2A8]">Verified archive activity</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#D8CCE8]">Confirmed, pending, and failed archive jobs are reported from your account records. If records cannot be loaded, the status is shown as unavailable.</p></div><button onClick={()=>onSelectView('imports')} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-[#FFF2A8]">View activity →</button></div></div>
    </section>

    <details className="rounded-2xl border border-[#7353A0]/35 bg-[#120B21]/90"><summary className="cursor-pointer px-6 py-5 text-base font-bold text-[#FFF2A8]">Advanced storage details</summary><div className="border-t border-[#7353A0]/25 p-4 sm:p-6"><StorageUsageDashboard memories={memories}/></div></details>

    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DFB260]/20 pt-5 text-sm text-[#C8B1E4]"><span>Using sample content? You can clear it whenever you are ready.</span>{memories.length>0?<button onClick={()=>setShowConfirmClear(true)} className="min-h-11 rounded-xl px-4 text-red-200 hover:bg-red-950/50"><Trash2 className="mr-2 inline h-4 w-4"/>Clear sample content</button>:<button onClick={restore} className="min-h-11 rounded-xl px-4 text-[#FFF2A8] hover:bg-white/5"><RotateCcw className="mr-2 inline h-4 w-4"/>Restore sample content</button>}</div>

    {showConfirmClear&&<div className="fixed inset-0 z-[70] grid place-items-center bg-black/70 p-4"><div role="dialog" aria-modal="true" aria-labelledby="clear-title" className="w-full max-w-md rounded-3xl border border-red-500/40 bg-[#160D27] p-6"><h2 id="clear-title" className="text-2xl font-bold text-[#FFF2A8]">Clear sample content?</h2><p className="mt-3 text-base leading-6 text-[#D8CCE8]">This removes only the sample memories, letters, and memorials shown in the demo.</p><div className="mt-6 flex justify-end gap-3"><button onClick={()=>setShowConfirmClear(false)} className="min-h-11 rounded-xl px-4">Cancel</button><button onClick={clear} className="min-h-11 rounded-xl bg-red-800 px-4 font-bold text-white">Clear samples</button></div></div></div>}
  </div>;
};
