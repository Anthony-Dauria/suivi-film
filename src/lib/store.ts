/**
 * Bibliothèque personnelle, stockée dans le navigateur.
 *
 * Le site étant publié en statique (GitHub Pages), il n'y a pas de serveur pour
 * conserver les données : tout vit dans `localStorage`, sur la machine de
 * l'utilisateur. Les composants s'abonnent aux changements via `subscribe`, et
 * l'evenement `storage` propage les modifications entre onglets.
 */

import type {
  Database,
  LibraryEntry,
  MediaSnapshot,
  MediaType,
  Settings,
  WatchStatus,
} from "./types";

const STORAGE_KEY = "suivi-film:bibliotheque";
/** La clé API est stockée à part pour ne jamais partir dans un export partagé. */
const API_KEY_STORAGE_KEY = "suivi-film:cle-api";

export const DEFAULT_SETTINGS: Settings = {
  providers: [],
  region: "FR",
  language: "fr-FR",
  onlyMyProviders: false,
};

const EMPTY_DATABASE: Database = { version: 2, entries: {}, settings: DEFAULT_SETTINGS };

/**
 * Clé d'une œuvre dans la bibliothèque.
 *
 * Films et séries ont des identifiants TMDB indépendants : « 1399 » désigne un
 * film et une série différents. Le type fait donc partie de la clé.
 */
export function entryKey(mediaType: MediaType, id: number): string {
  return `${mediaType}:${id}`;
}

const listeners = new Set<() => void>();
let cache: Database | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Reprend une sauvegarde d'une version antérieure : avant l'ajout des séries,
 * les entrées étaient rangées sous leur seul identifiant et portaient un champ
 * `movie`. On les convertit sans perte.
 */
function migrateEntry(key: string, value: unknown): [string, LibraryEntry] | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as LibraryEntry & { movie?: MediaSnapshot };
  const media = raw.media ?? raw.movie;
  if (!media || typeof media.id !== "number") return null;

  const mediaType: MediaType = raw.mediaType ?? media.mediaType ?? "movie";
  const entry: LibraryEntry = {
    ...raw,
    id: media.id,
    mediaType,
    media: { ...media, id: media.id, mediaType },
  };
  delete (entry as { movie?: unknown }).movie;

  return [key.includes(":") ? key : entryKey(mediaType, media.id), entry];
}

/** `changed` signale une sauvegarde d'une version antérieure, à réécrire. */
function normalise(raw: unknown): { data: Database; changed: boolean } {
  if (!raw || typeof raw !== "object") {
    return { data: structuredClone(EMPTY_DATABASE), changed: false };
  }
  const data = raw as Partial<Database>;

  const entries: Record<string, LibraryEntry> = {};
  let changed = data.version !== 2;
  for (const [key, value] of Object.entries(data.entries ?? {})) {
    const migrated = migrateEntry(key, value);
    if (!migrated) {
      changed = true;
      continue;
    }
    if (migrated[0] !== key) changed = true;
    entries[migrated[0]] = migrated[1];
  }

  return {
    data: {
      version: 2,
      entries,
      settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
    },
    changed,
  };
}

/** Lecture synchrone : le rendu peut s'appuyer dessus sans état de chargement. */
export function getDatabase(): Database {
  if (cache) return cache;
  if (!isBrowser()) return EMPTY_DATABASE;

  let migrated = false;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const result = normalise(JSON.parse(raw));
      cache = result.data;
      migrated = result.changed;
    } else {
      cache = structuredClone(EMPTY_DATABASE);
    }
  } catch {
    cache = structuredClone(EMPTY_DATABASE);
  }

  // Une sauvegarde d'une version antérieure est réécrite au format courant dès
  // la première lecture, plutôt qu'à la prochaine modification.
  if (migrated) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // Sans place pour réécrire, la conversion reste faite en mémoire.
    }
  }

  return cache;
}

function commit(next: Database): void {
  cache = next;
  if (isBrowser()) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (error) {
      console.error("Sauvegarde impossible : espace de stockage insuffisant.", error);
    }
  }
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (isBrowser()) {
  // Un autre onglet a modifié la bibliothèque : on relit et on prévient l'interface.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    listeners.forEach((listener) => listener());
  });
}

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export function getAllEntries(): LibraryEntry[] {
  return Object.values(getDatabase().entries).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export function getEntry(mediaType: MediaType, id: number): LibraryEntry | null {
  return getDatabase().entries[entryKey(mediaType, id)] ?? null;
}

export function getSettings(): Settings {
  return getDatabase().settings;
}

/* -------------------------------------------------------------------------- */
/* Clé API                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Clé saisie par l'utilisateur. Elle a la priorité sur la clé éventuellement
 * intégrée au build (`NEXT_PUBLIC_TMDB_API_KEY`), ce qui permet à chacun
 * d'utiliser la sienne sur un site public.
 */
export function getStoredApiKey(): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(API_KEY_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(key: string | null): void {
  if (!isBrowser()) return;
  try {
    if (key) window.localStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
    else window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error("Enregistrement de la clé API impossible.", error);
  }
  listeners.forEach((listener) => listener());
}

/* -------------------------------------------------------------------------- */
/* Écriture                                                                    */
/* -------------------------------------------------------------------------- */

export interface EntryPatch {
  status?: WatchStatus;
  rating?: number | null;
  favorite?: boolean;
  watchedAt?: string | null;
  notes?: string;
  rewatchCount?: number;
}

/** Arrondit une note à un pas de 0,5 dans l'intervalle [0,5 ; 5]. */
function sanitiseRating(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return null;
  return Math.min(5, Math.max(0.5, Math.round(rating * 2) / 2));
}

/** Applique les règles métier communes à la création et à la mise à jour. */
function finalise(entry: LibraryEntry): LibraryEntry {
  const result = { ...entry };
  if (result.status === "seen" && !result.watchedAt) {
    result.watchedAt = new Date().toISOString().slice(0, 10);
  }
  // Une œuvre non vue ne conserve pas de note personnelle.
  if (result.status !== "seen") result.rating = null;
  return result;
}

export function upsertEntry(media: MediaSnapshot, patch: EntryPatch = {}): LibraryEntry {
  const database = getDatabase();
  const key = entryKey(media.mediaType, media.id);
  const now = new Date().toISOString();
  const existing = database.entries[key];
  const status = patch.status ?? existing?.status ?? "watchlist";

  const entry = finalise({
    id: media.id,
    mediaType: media.mediaType,
    status,
    rating: patch.rating !== undefined ? sanitiseRating(patch.rating) : (existing?.rating ?? null),
    favorite: patch.favorite ?? existing?.favorite ?? false,
    watchedAt: patch.watchedAt !== undefined ? patch.watchedAt : (existing?.watchedAt ?? null),
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
    notes: patch.notes !== undefined ? patch.notes : (existing?.notes ?? ""),
    rewatchCount: patch.rewatchCount ?? existing?.rewatchCount ?? 0,
    media: { ...(existing?.media ?? {}), ...media },
  });

  commit({ ...database, entries: { ...database.entries, [key]: entry } });
  return entry;
}

export function updateEntry(
  mediaType: MediaType,
  id: number,
  patch: EntryPatch,
): LibraryEntry | null {
  const database = getDatabase();
  const key = entryKey(mediaType, id);
  const existing = database.entries[key];
  if (!existing) return null;

  const entry = finalise({
    ...existing,
    status: patch.status ?? existing.status,
    rating: patch.rating !== undefined ? sanitiseRating(patch.rating) : existing.rating,
    favorite: patch.favorite ?? existing.favorite,
    watchedAt: patch.watchedAt !== undefined ? patch.watchedAt : existing.watchedAt,
    notes: patch.notes !== undefined ? patch.notes : existing.notes,
    rewatchCount: patch.rewatchCount ?? existing.rewatchCount,
    updatedAt: new Date().toISOString(),
  });

  commit({ ...database, entries: { ...database.entries, [key]: entry } });
  return entry;
}

export function deleteEntry(mediaType: MediaType, id: number): boolean {
  const database = getDatabase();
  const key = entryKey(mediaType, id);
  if (!database.entries[key]) return false;

  const entries = { ...database.entries };
  delete entries[key];
  commit({ ...database, entries });
  return true;
}

export function updateSettings(patch: Partial<Settings>): Settings {
  const database = getDatabase();
  const settings = { ...database.settings, ...patch };
  commit({ ...database, settings });
  return settings;
}

/** Remplace toute la bibliothèque (import d'une sauvegarde). */
export function replaceDatabase(raw: unknown): Database {
  const next = normalise(raw).data;
  commit(next);
  return next;
}

/** Sauvegarde téléchargeable (sans la clé API). */
export function exportDatabase(): Database {
  return structuredClone(getDatabase());
}
