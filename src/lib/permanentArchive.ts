const toBase64=(bytes:Uint8Array)=>{let value="";bytes.forEach(byte=>{value+=String.fromCharCode(byte);});return btoa(value);};
const hex=(buffer:ArrayBuffer)=>Array.from(new Uint8Array(buffer)).map(byte=>byte.toString(16).padStart(2,"0")).join("");

export async function queuePermanentArchive(file:File,passphrase:string,onProgress?:(value:number)=>void,mediaId?:string){
  if(passphrase.length<12)throw new Error("Use an archival passphrase of at least 12 characters.");
  if(file.size>10*1024*1024-32)throw new Error("The first direct-Arweave proof is limited to files smaller than 10 MB.");
  onProgress?.(5);
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt"]);
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,await file.arrayBuffer());
  const payloadHash=hex(await crypto.subtle.digest("SHA-256",cipher));
  onProgress?.(30);
  const authorization=await fetch("/api/arweave/archive/presign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:file.name,contentType:file.type||"application/octet-stream",size:cipher.byteLength,payloadHash,mediaId,encryptionMetadata:{algorithm:"AES-256-GCM",kdf:"PBKDF2-SHA256",iterations:310000,iv:toBase64(iv),salt:toBase64(salt)}})});
  const authorized=await authorization.json();
  if(!authorization.ok)throw new Error(authorized.error||"Archive staging failed.");
  onProgress?.(40);
  await new Promise<void>((resolve,reject)=>{
    const request=new XMLHttpRequest();
    request.open("PUT",authorized.uploadUrl);
    request.setRequestHeader("Content-Type","application/octet-stream");
    request.upload.onprogress=event=>{if(event.lengthComputable)onProgress?.(40+Math.round(event.loaded/event.total*45));};
    request.onload=()=>request.status>=200&&request.status<300?resolve():reject(new Error("Encrypted staging upload failed."));
    request.onerror=()=>reject(new Error("Encrypted staging upload was interrupted."));
    request.send(cipher);
  });
  const completion=await fetch("/api/arweave/archive/complete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jobId:authorized.jobId})});
  const completed=await completion.json();
  if(!completion.ok)throw new Error(completed.error||"Archive queueing failed.");
  onProgress?.(100);
  return {jobId:authorized.jobId,payloadHash,encryptionMetadata:{iv:toBase64(iv),salt:toBase64(salt),iterations:310000}};
}


export async function verifyAndDecryptArchive(job:any,passphrase:string){
  const verification=await fetch("/api/arweave/archive/verify/"+encodeURIComponent(job.id));
  const verified=await verification.json();
  if(!verification.ok||!verified.verified)throw new Error(verified.error||"Gateway payload hash verification failed.");
  const response=await fetch("https://arweave.net/"+encodeURIComponent(job.transactionId));
  if(!response.ok)throw new Error("Confirmed archive could not be downloaded.");
  const cipher=await response.arrayBuffer();
  if(hex(await crypto.subtle.digest("SHA-256",cipher))!==job.payloadHash)throw new Error("Downloaded archive hash mismatch.");
  const decode=(value:string)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
  const metadata=job.encryptionMetadata||{};
  const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(passphrase),"PBKDF2",false,["deriveKey"]);
  const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:decode(metadata.salt),iterations:Number(metadata.iterations||310000),hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["decrypt"]);
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(metadata.iv)},key,cipher);
  return new Blob([plain],{type:job.contentType||"application/octet-stream"});
}
