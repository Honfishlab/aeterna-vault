export interface CollectionArchive {
  id: string;
  name: string;
  transactionId: string;
  payloadHash: string;
  contentType: string;
  sizeBytes: number;
  encryptionMetadata: { algorithm?: string; kdf?: string; iterations?: number; iv?: string; salt?: string };
}

function safeJson(value: unknown) {
  return JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");
}

export function buildArweaveCollectionHtml(input: { title: string; createdAt: string; archives: CollectionArchive[] }) {
  const manifest=safeJson({schema:1,title:input.title,createdAt:input.createdAt,archives:input.archives});
  const title=input.title.replace(/[<>&"']/g,character=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[character]||character));
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · Aeterna Vault</title>
<style>:root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#08040f;color:#eee3ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#291440,#08040f 55%);min-height:100vh}.wrap{max-width:1180px;margin:auto;padding:32px 18px 80px}header,.card{border:1px solid #b98b45;background:rgba(20,10,35,.92);border-radius:20px;box-shadow:0 18px 60px #0008}header{padding:26px}h1,h2{font-family:Georgia,serif;color:#fff0a8;margin:.2rem 0}.muted{color:#bda8d7}.notice{margin-top:14px;padding:12px;border-radius:12px;background:#e0ae4b18;color:#ffe4a0;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:20px}.card{padding:16px}.meta{font:11px ui-monospace,monospace;color:#d9bb77;overflow-wrap:anywhere}.preview{height:230px;border-radius:14px;background:#050208;display:grid;place-items:center;overflow:hidden;margin:12px 0}.preview img,.preview video{width:100%;height:100%;object-fit:contain}.controls{display:flex;gap:8px}.controls input{min-width:0;flex:1;background:#090412;color:#fff;border:1px solid #77558f;border-radius:10px;padding:11px}.controls button,.download{border:0;border-radius:10px;padding:11px 14px;background:linear-gradient(90deg,#efd58f,#bd8737);color:#160c20;font-weight:700;cursor:pointer}.controls button:disabled{opacity:.5}.status{min-height:20px;margin-top:9px;font-size:12px;color:#cab6df}.ok{color:#7ef0b0}.bad{color:#ff9aaa}@media(max-width:520px){.controls{flex-direction:column}}</style></head>
<body><div class="wrap"><header><div class="meta">AETERNA VAULT · ARWEAVE COLLECTION</div><h1>${title}</h1><p class="muted">${input.archives.length} encrypted permanent ${input.archives.length===1?"item":"items"} · published ${input.createdAt}</p><div class="notice">This page and every encrypted payload are served from Arweave. Passphrases never leave this browser. Each payload is SHA-256 verified before decryption.</div></header><main id="grid" class="grid"></main></div>
<script id="manifest" type="application/json">${manifest}</script><script>
const manifest=JSON.parse(document.getElementById("manifest").textContent),grid=document.getElementById("grid");
const decode=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
const hex=buffer=>Array.from(new Uint8Array(buffer)).map(byte=>byte.toString(16).padStart(2,"0")).join("");
const escapeHtml=value=>String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;","'":"&#39;"}[c]));
for(const item of manifest.archives){const card=document.createElement("article");card.className="card";card.innerHTML='<h2>'+escapeHtml(item.name)+'</h2><div class="meta">'+escapeHtml(item.contentType)+' · '+Math.ceil(item.sizeBytes/1024)+' KB</div><div class="meta">TX '+escapeHtml(item.transactionId)+'</div><div class="preview"><span class="muted">Encrypted media</span></div><div class="controls"><input type="password" autocomplete="off" placeholder="Archival passphrase"><button>Verify & decrypt</button></div><div class="status"></div>';
const input=card.querySelector("input"),button=card.querySelector("button"),preview=card.querySelector(".preview"),status=card.querySelector(".status");
button.onclick=async()=>{if(!input.value)return;button.disabled=true;status.className="status";status.textContent="Downloading encrypted payload from Arweave…";try{const response=await fetch("https://arweave.net/"+encodeURIComponent(item.transactionId));if(!response.ok)throw new Error("Gateway returned HTTP "+response.status);const cipher=await response.arrayBuffer(),digest=hex(await crypto.subtle.digest("SHA-256",cipher));if(digest!==item.payloadHash)throw new Error("Ciphertext hash mismatch");const metadata=item.encryptionMetadata||{},material=await crypto.subtle.importKey("raw",new TextEncoder().encode(input.value),"PBKDF2",false,["deriveKey"]);const key=await crypto.subtle.deriveKey({name:"PBKDF2",salt:decode(metadata.salt),iterations:Number(metadata.iterations||310000),hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["decrypt"]);const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(metadata.iv)},key,cipher),blob=new Blob([plain],{type:item.contentType||"application/octet-stream"}),url=URL.createObjectURL(blob);preview.innerHTML="";if(item.contentType.startsWith("image/")){const media=document.createElement("img");media.src=url;media.alt=item.name;preview.append(media)}else if(item.contentType.startsWith("video/")){const media=document.createElement("video");media.src=url;media.controls=true;preview.append(media)}else{const link=document.createElement("a");link.className="download";link.href=url;link.download=item.name;link.textContent="Download decrypted file";preview.append(link)}status.className="status ok";status.textContent="Verified and decrypted locally."}catch(error){status.className="status bad";status.textContent="Unable to decrypt. Check the passphrase and try again."}finally{button.disabled=false}};grid.append(card)}
</script></body></html>`;
}
