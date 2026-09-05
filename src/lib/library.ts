/**
 * Actions de suivi appelées par l'interface.
 *
 * Une entrée de bibliothèque conserve un instantané de l'œuvre (genres, équipe,
 * mots-clés) qui alimente le profil de goût : quand un film ou une série est
 * ajouté depuis une simple vignette, on récupère d'abord sa fiche complète.
 */

import {
  deleteEntry,
  getEntry,
  updateEntry,
  upsertEntry,
  type EntryPatch,
} from "./store";
import { getDetails, toSnapshot } from "./tmdb";
import type { LibraryEntry, MediaType, WatchStatus } from "./types";

/** Crée ou met à jour l'entrée d'une œuvre, en complétant la fiche si besoin. */
export async function saveMedia(
  mediaType: MediaType,
  id: number,
  patch: EntryPatch = {},
): Promise<LibraryEntry> {
  if (getEntry(mediaType, id)) {
    const updated = updateEntry(mediaType, id, patch);
    if (updated) return updated;
  }

  const details = await getDetails(mediaType, id);
  return upsertEntry(toSnapshot(details), patch);
}

/** Bascule un statut : re-cliquer sur le statut actif retire l'œuvre. */
export async function toggleStatus(
  mediaType: MediaType,
  id: number,
  status: WatchStatus,
): Promise<LibraryEntry | null> {
  if (getEntry(mediaType, id)?.status === status) {
    deleteEntry(mediaType, id);
    return null;
  }
  return saveMedia(mediaType, id, { status });
}

export function removeMedia(mediaType: MediaType, id: number): void {
  deleteEntry(mediaType, id);
}

export type { EntryPatch };
