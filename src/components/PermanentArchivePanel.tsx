import React,{useEffect,useState} from "react";
import { Archive,ExternalLink,RefreshCw,ShieldCheck,UploadCloud } from "lucide-react";
import { queuePermanentArchive, verifyAndDecryptArchive } from "../lib/permanentArchive";

export function PermanentArchivePanel(){
  const [file,setFile]=useState<File|null>(null);
  const [passphrase,setPassphrase]=useState("");
  const [progress,setProgress]=useState(0);
  const [message,setMessage]=useState("");
  const [data,setData]=useState<any>({jobs:[],configured:false});
  const load=async()=>{const response=await fetch("/api/arweave/archive/jobs");if(response.ok)setData(await response.json());};
  useEffect(()=>{void load();const timer=window.setInterval(load,10000);return()=>window.clearInterval(timer);},[]);
  const recover=async(job:any)=>{const secret=window.prompt("Enter the archival passphrase to verify and decrypt this file:");if(!secret)return;try{const blob=await verifyAndDecryptArchive(job,secret);const url=URL.createObjectURL(blob);const anchor=document.createElement("a");anchor.href=url;anchor.download=job.name;anchor.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Gateway hash verified and decrypted file downloaded.");}catch(error){setMessage(error instanceof Error?error.message:"Recovery failed.");}};
    const submit=async()=>{if(!file)return;setMessage("");try{const result=await queuePermanentArchive(file,passphrase,setProgress);setMessage("Encrypted archive queued. Save your passphrase securely; Aeterna does not store it. Job "+result.jobId);setFile(null);setPassphrase("");await load();}catch(error){setMessage(error instanceof Error?error.message:"Archive failed.");}};
  return <article className="cosmic-card rounded-2xl p-5">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="flex gap-2 font-cinzel text-lg text-[#FFF2A8]"><Archive className="w-5 h-5"/>Permanent Arweave Archive</h2><p className="text-xs text-[#C8B1E4] mt-2">Proof workflow: encrypt one file in this browser, stage ciphertext in R2, then submit it to Arweave.</p></div><span className={`h-fit rounded-full px-3 py-1 text-[10px] ${data.configured?"bg-emerald-500/20 text-emerald-200":"bg-amber-500/20 text-amber-100"}`}>{data.configured?"Mainnet wallet configured":"Awaiting funded service wallet"}</span></div>
    <div className="grid sm:grid-cols-2 gap-3 mt-5"><input type="file" accept="image/*,application/pdf" onChange={event=>setFile(event.target.files?.[0]||null)} className="text-xs text-[#C8B1E4]"/><input type="password" value={passphrase} onChange={event=>setPassphrase(event.target.value)} placeholder="Archival passphrase (12+ characters)" className="bg-[#120B21] border border-[#DFB260]/30 rounded-xl p-3 text-xs"/></div>
    <p className="text-[10px] text-amber-100 mt-3">Maximum 10 MB for this direct-transaction proof. Only encrypted bytes are sent to permanent storage. Losing the passphrase makes the archive unrecoverable.</p>
    {progress>0&&progress<100&&<div className="h-2 rounded-full bg-black/40 mt-4 overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B77A2D] to-[#FFF2A8]" style={{width:progress+"%"}}/></div>}
    <button disabled={!file||passphrase.length<12||progress>0&&progress<100} onClick={submit} className="gold-filled-btn px-4 py-2 text-xs mt-4 flex gap-2"><UploadCloud className="w-4 h-4"/>Encrypt and queue test archive</button>
    {message&&<p className="mt-3 rounded-xl bg-[#120B21] p-3 text-xs text-[#FFF2A8]">{message}</p>}
    <div className="space-y-2 mt-5">{(data.jobs||[]).slice(0,10).map((job:any)=><div key={job.id} className="rounded-xl bg-[#120B21] p-3 flex items-center justify-between gap-3"><div className="min-w-0"><p className="text-xs text-[#FFF2A8] truncate">{job.name}</p><p className="text-[10px] text-[#C8B1E4]">{job.status} · {Math.ceil(Number(job.sizeBytes||0)/1024)} KB{job.confirmations?` · ${job.confirmations} confirmations`:""}</p>{job.error&&<p className="text-[10px] text-rose-300">{job.error}</p>}</div>{job.transactionId?<div className="flex gap-2"><button onClick={()=>recover(job)} className="text-[10px] text-emerald-200">Verify & decrypt</button><a href={"https://arweave.net/"+job.transactionId} target="_blank" rel="noreferrer" className="text-[#F5D77F]" title="Open Arweave transaction"><ExternalLink className="w-4 h-4"/></a></div>:job.status==="confirmed"?<ShieldCheck className="text-emerald-300 w-4 h-4"/>:<RefreshCw className="text-[#F5D77F] w-4 h-4"/>}</div>)}</div>
  </article>;
}
