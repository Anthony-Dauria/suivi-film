/**
 * Bibliothèque personnelle, stockée dans le navigateur.
 *
 * Le site étant publié en statique (GitHub Pages), il n'y a pas de serveur pour
 * conserver les données : tout vit dans `localStorage`, sur la machine de
 * l'utilisateur. Les composants s'abonnent aux changements via `subscribe`, et
 * l'evenement `storage` propage les modifications entre onglets.
 */

import type { Database, LibraryEntry, MovieSnapshot, Settings, WatchStatus } from "./types";

const STORAGE_KEY = "suivi-film:bibliotheque";
/** La clé API est stockée à part pour ne jamais partir dans un export partagé. */
const API_KEY_STORAGE_KEY = "suivi-film:cle-api";

export const DEFAULT_SETTINGS: Settings = {
  providers: [],
  region: "FR",
  language: "fr-FR",
  onlyMyProviders: false,
};

const EMPTY_DATABASE: Database = { version: 1, entries: {}, settings: DEFAULT_SETTINGS };

const listeners = new Set<() => void>();
let cache: Database | null = null;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function normalise(raw: unknown): Database {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY_DATABASE);
  const data = raw as Partial<Database>;
  return {
    version: 1,
    entries: data.entries && typeof data.entries === "object" ? data.entries : {},
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
  };
}

/** Lecture synchrone : le rendu peut s'appuyer dessus sans etat de chargement. */
export function getDatabase(): Database {
  if (cache) return cache;
  if (!isBrowser()) return EMPTY_DATABASE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    cache = raw ? normalise(JSON.parse(raw)) : structuredClone(EMPTY_DATABASE);
  } catch {
    cache = structuredClone(EMPTY_DATABASE);
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

export function getEntry(movieId: number): LibraryEntry | null {
  return getDatabase().entries[String(movieId)] ?? null;
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
  // Un film non vu ne conserve pas de note personnelle.
  if (result.status !== "seen") result.rating = null;
  return result;
}

export function upsertEntry(movie: MovieSnapshot, patch: EntryPatch = {}): LibraryEntry {
  const database = getDatabase();
  const key = String(movie.id);
  const now = new Date().toISOString();
  const existing = database.entries[key];
  const status = patch.status ?? existing?.status ?? "watchlist";

  const entry = finalise({
    id: movie.id,
    status,
    rating: patch.rating !== undefined ? sanitiseRating(patch.rating) : (existing?.rating ?? null),
    favorite: patch.favorite ?? existing?.favorite ?? false,
    watchedAt: patch.watchedAt !== undefined ? patch.watchedAt : (existing?.watchedAt ?? null),
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
    notes: patch.notes !== undefined ? patch.notes : (existing?.notes ?? ""),
    rewatchCount: patch.rewatchCount ?? existing?.rewatchCount ?? 0,
    movie: { ...(existing?.movie ?? {}), ...movie },
  });

  commit({ ...database, entries: { ...database.entries, [key]: entry } });
  return entry;
}

export function updateEntry(movieId: number, patch: EntryPatch): LibraryEntry | null {
  const database = getDatabase();
  const key = String(movieId);
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

export function deleteEntry(movieId: number): boolean {
  const database = getDatabase();
  const key = String(movieId);
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
  const next = normalise(raw);
  commit(next);
  return next;
}

/** Sauvegarde téléchargeable (sans la clé API). */
export function exportDatabase(): Database {
  return structuredClone(getDatabase());
}
