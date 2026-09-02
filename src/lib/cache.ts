/**
 * Cache de reponses HTTP cote navigateur.
 *
 * L'export statique n'a plus de serveur pour mettre les reponses TMDB en cache :
 * on le fait ici, en memoire pour la session courante et dans `localStorage`
 * pour survivre a un rechargement. Les requetes identiques lancees en parallele
 * sont mutualisees, et le nombre d'appels simultanes est plafonne pour rester
 * sous les limites de TMDB.
 */

const STORAGE_PREFIX = "suivi-film:cache:";
const MAX_STORED_ENTRIES = 400;
const MAX_CONCURRENT_REQUESTS = 6;

interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

const memory = new Map<string, CacheRecord<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

let running = 0;
const waiting: (() => void)[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStored<T>(key: string): CacheRecord<T> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheRecord<T>;
  } catch {
    return null;
  }
}

/** Supprime les entrees expirees, puis les plus anciennes si le quota deborde. */
function prune(): void {
  if (!isBrowser()) return;
  const now = Date.now();
  const records: { key: string; expiresAt: number }[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(STORAGE_PREFIX)) continue;
    try {
      const record = JSON.parse(window.localStorage.getItem(key) ?? "{}") as CacheRecord<unknown>;
      if (!record.expiresAt || record.expiresAt < now) window.localStorage.removeItem(key);
      else records.push({ key, expiresAt: record.expiresAt });
    } catch {
      window.localStorage.removeItem(key);
    }
  }

  if (records.length > MAX_STORED_ENTRIES) {
    records
      .sort((a, b) => a.expiresAt - b.expiresAt)
      .slice(0, records.length - MAX_STORED_ENTRIES)
      .forEach((record) => window.localStorage.removeItem(record.key));
  }
}

function writeStored<T>(key: string, record: CacheRecord<T>): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(record));
  } catch {
    // Quota atteint : on fait de la place et on retente une seule fois.
    prune();
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(record));
    } catch {
      // Le cache reste alors purement en memoire.
    }
  }
}

/** Attend qu'un creneau de requete se libere. */
async function acquireSlot(): Promise<void> {
  if (running < MAX_CONCURRENT_REQUESTS) {
    running += 1;
    return;
  }
  await new Promise<void>((resolve) => waiting.push(resolve));
  running += 1;
}

function releaseSlot(): void {
  running -= 1;
  waiting.shift()?.();
}

/**
 * Execute `loader` en respectant le cache, la mutualisation des requetes
 * identiques et le plafond de requetes simultanees.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const now = Date.now();

  const fromMemory = memory.get(key) as CacheRecord<T> | undefined;
  if (fromMemory && fromMemory.expiresAt > now) return fromMemory.value;

  const fromStorage = readStored<T>(key);
  if (fromStorage && fromStorage.expiresAt > now) {
    memory.set(key, fromStorage);
    return fromStorage.value;
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const request = (async () => {
    await acquireSlot();
    try {
      const value = await loader();
      const record: CacheRecord<T> = { value, expiresAt: Date.now() + ttlMs };
      memory.set(key, record);
      writeStored(key, record);
      return value;
    } finally {
      releaseSlot();
      inFlight.delete(key);
    }
  })();

  inFlight.set(key, request);
  return request;
}

/** Vide le cache des reponses TMDB (utile apres un changement de cle ou de pays). */
export function clearCache(): void {
  memory.clear();
  inFlight.clear();
  if (!isBrowser()) return;
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}
