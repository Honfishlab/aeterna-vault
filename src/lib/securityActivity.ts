export interface SecurityActivityItem { id: string; action: string; detail: string; createdAt: string }

const KEY = 'aeterna_security_activity';

export function recordSecurityActivity(action: string, detail: string) {
  if (typeof window === 'undefined') return;
  try {
    const items = JSON.parse(localStorage.getItem(KEY) || '[]') as SecurityActivityItem[];
    items.unshift({ id: crypto.randomUUID(), action, detail, createdAt: new Date().toISOString() });
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 50)));
    window.dispatchEvent(new Event('aeterna:security-activity'));
  } catch { /* Activity logging must never block a security action. */ }
}

export function getSecurityActivity(): SecurityActivityItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as SecurityActivityItem[]; }
  catch { return []; }
}
