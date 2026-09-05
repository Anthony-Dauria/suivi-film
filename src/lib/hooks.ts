"use client";

import { useMemo, useSyncExternalStore } from "react";

import { DEFAULT_SETTINGS, entryKey, getDatabase, getStoredApiKey, subscribe } from "./store";
import type { Database, LibraryEntry, MediaType, Settings } from "./types";

/** Instantané utilisé pendant le pré-rendu, avant que le navigateur ne prenne le relais. */
const SERVER_DATABASE: Database = { version: 2, entries: {}, settings: DEFAULT_SETTINGS };

export function useDatabase(): Database {
  return useSyncExternalStore(subscribe, getDatabase, () => SERVER_DATABASE);
}

/** Entrées de la bibliothèque, les plus récemment modifiées d'abord. */
export function useEntries(): LibraryEntry[] {
  const database = useDatabase();
  return useMemo(
    () =>
      Object.values(database.entries).sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
      ),
    [database],
  );
}

export function useEntry(mediaType: MediaType, id: number): LibraryEntry | null {
  const database = useDatabase();
  return database.entries[entryKey(mediaType, id)] ?? null;
}

export function useSettings(): Settings {
  return useDatabase().settings;
}

export function useApiKey(): string | null {
  return useSyncExternalStore(subscribe, getStoredApiKey, () => null);
}

/**
 * `true` dès qu'une clé API est disponible (saisie par l'utilisateur ou intégrée
 * au build).
 *
 * On passe obligatoirement par `useApiKey` : lire `localStorage` directement
 * pendant le rendu ferait diverger la première passe du client du HTML
 * pré-rendu, et provoquerait une erreur d'hydratation.
 */
export function useIsConfigured(): boolean {
  const stored = useApiKey();
  return Boolean(stored) || Boolean(process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim());
}
