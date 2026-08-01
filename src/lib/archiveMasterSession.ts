const SESSION_KEY="aeterna.permanent-vault.master";
export function getArchiveMasterPassphrase(){if(typeof window==="undefined")return "";return window.sessionStorage.getItem(SESSION_KEY)||"";}
export function setArchiveMasterPassphrase(value:string){if(typeof window==="undefined")return;if(value)window.sessionStorage.setItem(SESSION_KEY,value);else window.sessionStorage.removeItem(SESSION_KEY);window.dispatchEvent(new CustomEvent("aeterna:archive-master-change",{detail:{active:Boolean(value)}}));}
export function clearArchiveMasterPassphrase(){setArchiveMasterPassphrase("");}
