type UsabilityEvent = 'memory_selected' | 'album_flow_opened' | 'album_created' | 'album_updated';

const STORAGE_KEY = 'aeterna_usability_counts';

// Aggregate counts remain on this device; no memory content or account data is recorded.
export function recordUsabilityEvent(event: UsabilityEvent) {
  if (typeof window === 'undefined') return;
  try {
    const counts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, number>;
    counts[event] = (counts[event] || 0) + 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Measurement must never interrupt a vault action.
  }
}
