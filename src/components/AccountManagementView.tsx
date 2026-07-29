import React, { useEffect, useState } from "react";
import { PermanentArchivePanel } from "./PermanentArchivePanel";
import { Download, KeyRound, Laptop, Link2, ShieldCheck, Trash2, User } from "lucide-react";

export function AccountManagementView({ onSignedOut }: { onSignedOut: () => void }) {
  const [data,setData] = useState<any>(null);
  const [message,setMessage] = useState("");
  const [name,setName] = useState("");
  const [currentPassword,setCurrentPassword] = useState("");
  const [password,setPassword] = useState("");
  const load = async () => { const response=await fetch("/api/account"); if(response.ok){const result=await response.json();setData(result);setName(result.account?.name||"");} };
  useEffect(()=>{void load();},[]);
  const post = async (url:string,body:any) => {
    const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    const result=await response.json(); setMessage(result.message||result.error||(response.ok?"Saved.":"Action failed."));
    if(response.ok) void load(); return response.ok;
  };
  const downloadExport=async()=>{const response=await fetch("/api/account/export");if(!response.ok)return;const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=`aeterna-vault-export-${Date.now()}.json`;anchor.click();URL.revokeObjectURL(url);};
  const deleteAccount=async()=>{const confirmation=window.prompt("Type DELETE to confirm account deletion.");if(confirmation!=="DELETE")return;const pass=window.prompt("Enter your password.");if(pass&&await post("/api/account/delete",{password:pass}))onSignedOut();};
  return <section className="space-y-6 pb-16">
    <div className="cosmic-card p-6 sm:p-8 rounded-3xl"><p className="text-xs font-mono text-[#F5D77F] uppercase tracking-widest">Identity and security</p><h1 className="font-cinzel text-3xl text-[#FFF2A8] font-bold mt-2">Account Management</h1><p className="text-sm text-[#C8B1E4] mt-2">Profile, password, devices, connected providers, export, and account lifecycle controls.</p>{message&&<p className="mt-4 rounded-xl bg-[#120B21] p-3 text-xs text-[#FFF2A8]">{message}</p>}</div>
    <div className="grid lg:grid-cols-2 gap-5">
      <article className="cosmic-card rounded-2xl p-5"><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><User className="w-5 h-5"/>Profile</h2><label className="text-xs block mt-4">Display name</label><input value={name} onChange={event=>setName(event.target.value)} className="w-full mt-1 bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-3"/><p className="text-xs text-[#C8B1E4] mt-3">{data?.account?.email} · {data?.account?.role} · {data?.account?.plan} plan</p><button onClick={()=>post("/api/account/profile",{name})} className="gold-filled-btn px-4 py-2 text-xs mt-4">Save profile</button></article>
      <article className="cosmic-card rounded-2xl p-5"><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><ShieldCheck className="w-5 h-5"/>Email verification</h2><p className="text-sm text-[#C8B1E4] mt-4">{data?.account?.emailVerifiedAt?"Verified":"Not yet verified"}</p>{!data?.account?.emailVerifiedAt&&<button onClick={()=>post("/api/auth/request-verification",{})} className="gold-filled-btn px-4 py-2 text-xs mt-4">Send verification email</button>}</article>
      <article className="cosmic-card rounded-2xl p-5"><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><KeyRound className="w-5 h-5"/>Change password</h2><input type="password" placeholder="Current password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} className="w-full mt-4 bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-3"/><input type="password" placeholder="New password (12+ characters)" value={password} onChange={e=>setPassword(e.target.value)} className="w-full mt-3 bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-3"/><button onClick={async()=>{if(await post("/api/account/password",{currentPassword,password}))onSignedOut();}} className="gold-filled-btn px-4 py-2 text-xs mt-4">Change password and sign out devices</button></article>
      <article className="cosmic-card rounded-2xl p-5"><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><Link2 className="w-5 h-5"/>Connected accounts</h2>{(data?.providers||[]).map((provider:any)=><div key={provider.provider} className="mt-3 rounded-xl bg-[#120B21] p-3 text-xs"><strong>{provider.provider}</strong><span className="block text-[#C8B1E4]">{provider.email||"Connected"}</span></div>)}{!(data?.providers||[]).length&&<p className="text-sm text-[#C8B1E4] mt-4">No cloud accounts connected.</p>}</article>
    </div>
    <article className="cosmic-card rounded-2xl p-5"><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><Laptop className="w-5 h-5"/>Active devices</h2><div className="space-y-3 mt-4">{(data?.sessions||[]).map((session:any)=><div key={session.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#120B21] p-3"><div className="min-w-0"><p className="text-xs text-[#FFF2A8] truncate">{session.userAgent||"Unknown browser"}</p><p className="text-[10px] text-[#C8B1E4]">Last active {new Date(session.lastSeenAt).toLocaleString()} · {session.ipAddress||"IP unavailable"}</p></div><button onClick={()=>post("/api/account/session/revoke",{id:session.id})} className="text-xs text-rose-300">Revoke</button></div>)}</div></article>
    <PermanentArchivePanel />
    <div className="flex flex-wrap gap-3"><button onClick={downloadExport} className="gold-beveled-btn px-4 py-2 text-xs flex gap-2"><Download className="w-4 h-4"/>Download account export</button><button onClick={deleteAccount} className="px-4 py-2 rounded-xl border border-rose-500/50 text-xs text-rose-300 flex gap-2"><Trash2 className="w-4 h-4"/>Delete account</button></div>
  </section>;
}
