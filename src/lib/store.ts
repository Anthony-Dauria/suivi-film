import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Database, LibraryEntry, MovieSnapshot, Settings, WatchStatus } from "./types";

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.join(process.cwd(), "data", "bibliotheque.json");

const DEFAULT_SETTINGS: Settings = {
  providers: [],
  region: process.env.TMDB_REGION?.trim() || "FR",
  onlyMyProviders: false,
};

const EMPTY_DATABASE: Database = { version: 1, entries: {}, settings: DEFAULT_SETTINGS };

/**
 * Cache mémoire invalide par la date de modification du fichier.
 *
 * En production, chaque route Next.js est compilee dans son propre bundle : un
 * cache purement mémoire ne serait pas partagé entre une ecriture faite par une
 * route API et une lecture faite par une page. On vérifie donc l'horodatage du
 * fichier à chaque accès, ce qui reste négligeable pour un fichier de cette
 * taille tout en garantissant des données fraiches.
 */
let cache: { data: Database; mtimeMs: number; size: number } | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

function normalise(raw: unknown): Database {
  if (!raw || typeof raw !== "object") return structuredClone(EMPTY_DATABASE);
  const data = raw as Partial<Database>;
  return {
    version: 1,
    entries: data.entries && typeof data.entries === "object" ? data.entries : {},
    settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
  };
}

async function readFromDisk(): Promise<{ data: Database; mtimeMs: number; size: number }> {
  try {
    const [content, info] = await Promise.all([readFile(DATA_FILE, "utf8"), stat(DATA_FILE)]);
    return { data: normalise(JSON.parse(content)), mtimeMs: info.mtimeMs, size: info.size };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code && code !== "ENOENT") {
      console.error(`Lecture de ${DATA_FILE} impossible, démarrage sur une base vide.`, error);
    }
    return { data: structuredClone(EMPTY_DATABASE), mtimeMs: 0, size: 0 };
  }
}

async function load(): Promise<Database> {
  if (cache) {
    try {
      const info = await stat(DATA_FILE);
      if (info.mtimeMs === cache.mtimeMs && info.size === cache.size) return cache.data;
    } catch {
      // Fichier supprimé entre-temps : on relit (et on repart d'une base vide).
    }
  }
  cache = await readFromDisk();
  return cache.data;
}

/** Écriture atomique : fichier temporaire puis renommage. */
async function persist(database: Database): Promise<void> {
  await mkdir(path.dirname(DATA_FILE), { recursive: true });
  const temporary = `${DATA_FILE}.${randomUUID()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(database, null, 2)}\n`, "utf8");
  await rename(temporary, DATA_FILE);
  try {
    const info = await stat(DATA_FILE);
    cache = { data: database, mtimeMs: info.mtimeMs, size: info.size };
  } catch {
    cache = null;
  }
}

async function mutate<T>(mutation: (database: Database) => T | Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    // Relecture systématique : une autre route a pu écrire depuis notre dernier accès.
    const { data: database } = await readFromDisk();
    const result = await mutation(database);
    await persist(database);
    return result;
  };
  const chained = writeQueue.then(run, run);
  // On garde la file vivante même si une mutation echoue.
  writeQueue = chained.catch(() => undefined);
  return chained;
}

/* -------------------------------------------------------------------------- */
/* Lecture                                                                     */
/* -------------------------------------------------------------------------- */

export async function getAllEntries(): Promise<LibraryEntry[]> {
  const database = await load();
  return Object.values(database.entries).sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  );
}

export async function getEntry(movieId: number): Promise<LibraryEntry | null> {
  const database = await load();
  return database.entries[String(movieId)] ?? null;
}

export async function getEntriesByStatus(status: WatchStatus): Promise<LibraryEntry[]> {
  return (await getAllEntries()).filter((entry) => entry.status === status);
}

export async function getSettings(): Promise<Settings> {
  return (await load()).settings;
}

/* -------------------------------------------------------------------------- */
/* Écriture                                                                    */
/* -------------------------------------------------------------------------- */

export interface UpsertInput {
  status?: WatchStatus;
  rating?: number | null;
  favorite?: boolean;
  watchedAt?: string | null;
  notes?: string;
  rewatchCount?: number;
  movie: MovieSnapshot;
}

/** Arrondit une note à un pas de 0,5 dans l'intervalle [0,5 ; 5]. */
function sanitiseRating(rating: number | null | undefined): number | null {
  if (rating === null || rating === undefined || Number.isNaN(rating)) return null;
  const rounded = Math.round(rating * 2) / 2;
  return Math.min(5, Math.max(0.5, rounded));
}

export async function upsertEntry(input: UpsertInput): Promise<LibraryEntry> {
  return mutate((database) => {
    const key = String(input.movie.id);
    const now = new Date().toISOString();
    const existing = database.entries[key];
    const status = input.status ?? existing?.status ?? "watchlist";

    const entry: LibraryEntry = {
      id: input.movie.id,
      status,
      rating: input.rating !== undefined ? sanitiseRating(input.rating) : (existing?.rating ?? null),
      favorite: input.favorite ?? existing?.favorite ?? false,
      watchedAt:
        input.watchedAt !== undefined
          ? input.watchedAt
          : (existing?.watchedAt ??
            (status === "seen" ? now.slice(0, 10) : null)),
      addedAt: existing?.addedAt ?? now,
      updatedAt: now,
      notes: input.notes !== undefined ? input.notes : (existing?.notes ?? ""),
      rewatchCount: input.rewatchCount ?? existing?.rewatchCount ?? 0,
      movie: { ...(existing?.movie ?? {}), ...input.movie },
    };

    // Passage à "vu" sans date : on date au jour du clic.
    if (entry.status === "seen" && !entry.watchedAt) entry.watchedAt = now.slice(0, 10);
    // Un film non vu ne conservé pas de note personnelle.
    if (entry.status !== "seen") entry.rating = null;

    database.entries[key] = entry;
    return entry;
  });
}

export async function updateEntry(
  movieId: number,
  patch: Omit<Partial<UpsertInput>, "movie">,
): Promise<LibraryEntry | null> {
  return mutate((database) => {
    const key = String(movieId);
    const existing = database.entries[key];
    if (!existing) return null;

    const status = patch.status ?? existing.status;
    const updated: LibraryEntry = {
      ...existing,
      status,
      rating: patch.rating !== undefined ? sanitiseRating(patch.rating) : existing.rating,
      favorite: patch.favorite ?? existing.favorite,
      watchedAt: patch.watchedAt !== undefined ? patch.watchedAt : existing.watchedAt,
      notes: patch.notes !== undefined ? patch.notes : existing.notes,
      rewatchCount: patch.rewatchCount ?? existing.rewatchCount,
      updatedAt: new Date().toISOString(),
    };

    if (updated.status === "seen" && !updated.watchedAt) {
      updated.watchedAt = new Date().toISOString().slice(0, 10);
    }
    if (updated.status !== "seen") updated.rating = null;

    database.entries[key] = updated;
    return updated;
  });
}

export async function deleteEntry(movieId: number): Promise<boolean> {
  return mutate((database) => {
    const key = String(movieId);
    if (!database.entries[key]) return false;
    delete database.entries[key];
    return true;
  });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return mutate((database) => {
    database.settings = { ...database.settings, ...patch };
    return database.settings;
  });
}

/** Remplace toute la bibliothèque (import d'une sauvegarde). */
export async function replaceDatabase(raw: unknown): Promise<Database> {
  const next = normalise(raw);
  return mutate((database) => {
    database.entries = next.entries;
    database.settings = next.settings;
    return { version: 1, entries: database.entries, settings: database.settings };
  });
}

export async function exportDatabase(): Promise<Database> {
  const database = await load();
  return structuredClone(database);
}
