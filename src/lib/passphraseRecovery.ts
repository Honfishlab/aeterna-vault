const ITERATIONS=310000;
const encoder=new TextEncoder();
const toBase64=(value:Uint8Array)=>btoa(String.fromCharCode(...value));
const fromBase64=(value:string)=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));

export interface PassphraseEnvelope { ciphertext:string; salt:string; iv:string; iterations:number; }
async function recoveryKey(secret:string,salt:Uint8Array,iterations:number,usage:KeyUsage[]){const material=await crypto.subtle.importKey("raw",encoder.encode(secret),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,usage);}
export async function encryptRecoveredPassphrase(passphrase:string,recoveryKeyText:string):Promise<PassphraseEnvelope>{const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));const key=await recoveryKey(recoveryKeyText,salt,ITERATIONS,["encrypt"]);const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},key,encoder.encode(passphrase)));return {ciphertext:toBase64(ciphertext),salt:toBase64(salt),iv:toBase64(iv),iterations:ITERATIONS};}
export async function decryptRecoveredPassphrase(envelope:PassphraseEnvelope,recoveryKeyText:string){const salt=fromBase64(envelope.salt),iv=fromBase64(envelope.iv),ciphertext=fromBase64(envelope.ciphertext);const key=await recoveryKey(recoveryKeyText,salt,envelope.iterations,["decrypt"]);const plaintext=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,ciphertext);return new TextDecoder().decode(plaintext);}
export function generateRecoveryKey(){const bytes=crypto.getRandomValues(new Uint8Array(24));return Array.from(bytes,value=>value.toString(16).padStart(2,"0")).join("").match(/.{1,8}/g)!.join("-");}
