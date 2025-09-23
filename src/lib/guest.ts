// Client-only guest session helpers

export type GuestSession = {
  id: string;
  createdAt: number;
  usedAnalyses: number;
};

const STORAGE_KEY = "eatwise_guest_session";
const STORAGE_ANALYSES_KEY = "eatwise_guest_analyses";
const MAX_FREE_ANALYSES = 5;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

export function getGuestSession(): GuestSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestSession;
    if (!parsed || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

function generateGuestId(): string {
  try {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    return `guest_${Date.now().toString(36)}_${hex}`;
  } catch {
    return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function ensureGuestSession(): GuestSession {
  if (!isBrowser()) {
    return { id: "guest_server", createdAt: Date.now(), usedAnalyses: 0 };
  }
  const existing = getGuestSession();
  if (existing) return existing;
  const created: GuestSession = {
    id: generateGuestId(),
    createdAt: Date.now(),
    usedAnalyses: 0,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(created));
  return created;
}

export function incrementGuestAnalyses(): GuestSession | null {
  if (!isBrowser()) return null;
  const current = ensureGuestSession();
  const next = { ...current, usedAnalyses: Math.max(0, (current.usedAnalyses || 0) + 1) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function clearGuestSession(): void {
  if (!isBrowser()) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function isGuestActive(): boolean {
  return Boolean(getGuestSession());
}

export function canGuestAnalyze(max: number = MAX_FREE_ANALYSES): { ok: boolean; remaining: number } {
  const s = getGuestSession();
  const used = s?.usedAnalyses || 0;
  const remaining = Math.max(0, max - used);
  return { ok: remaining > 0, remaining };
}

export function getRemainingAnalyses(max: number = MAX_FREE_ANALYSES): number {
  return canGuestAnalyze(max).remaining;
}

export function getGuestHeaders(): Record<string, string> {
  const s = getGuestSession();
  if (!s) return {};
  return {
    "x-guest": "1",
    "x-guest-session": s.id,
  };
}

export { MAX_FREE_ANALYSES };

// --- Guest analyses storage ---
export type GuestAnalysis = {
  id: string; // timestamp-based id
  createdAt: number;
  ingredients: string[];
  allergens: string[];
  possibleAllergens?: string[];
  nutrition?: Record<string, any>;
  health_analysis?: string;
  grade?: string | null;
};

export function getGuestAnalyses(): GuestAnalysis[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_ANALYSES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveGuestAnalysis(a: Omit<GuestAnalysis, 'id' | 'createdAt'>): GuestAnalysis | null {
  if (!isBrowser()) return null;
  const session = ensureGuestSession();
  const { ok } = canGuestAnalyze();
  if (!ok) return null;
  const current = getGuestAnalyses();
  const entry: GuestAnalysis = { id: `ga_${Date.now()}`, createdAt: Date.now(), ...a };
  const next = [entry, ...current].slice(0, MAX_FREE_ANALYSES);
  try {
    localStorage.setItem(STORAGE_ANALYSES_KEY, JSON.stringify(next));
  } catch {}
  // Keep counter in sync
  incrementGuestAnalyses();
  return entry;
}

export function clearGuestAnalyses(): void {
  if (!isBrowser()) return;
  try { localStorage.removeItem(STORAGE_ANALYSES_KEY); } catch {}
}



