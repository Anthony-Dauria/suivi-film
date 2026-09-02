/**
 * Actions de suivi appelées par l'interface.
 *
 * Une entrée de bibliothèque conserve un instantané du film (genres, équipe,
 * mots-clés) qui alimente le profil de goût : quand un film est ajouté depuis
 * une simple vignette, on récupère d'abord sa fiche complète auprès de TMDB.
 */

import {
  deleteEntry,
  getEntry,
  updateEntry,
  upsertEntry,
  type EntryPatch,
} from "./store";
import { getMovieDetails, toSnapshot } from "./tmdb";
import type { LibraryEntry, WatchStatus } from "./types";

/** Crée ou met à jour l'entrée d'un film, en complétant la fiche si besoin. */
export async function saveMovie(movieId: number, patch: EntryPatch = {}): Promise<LibraryEntry> {
  const existing = getEntry(movieId);
  if (existing) {
    const updated = updateEntry(movieId, patch);
    if (updated) return updated;
  }

  const details = await getMovieDetails(movieId);
  return upsertEntry(toSnapshot(details), patch);
}

/** Bascule un statut : re-cliquer sur le statut actif retire le film. */
export async function toggleStatus(
  movieId: number,
  status: WatchStatus,
): Promise<LibraryEntry | null> {
  if (getEntry(movieId)?.status === status) {
    deleteEntry(movieId);
    return null;
  }
  return saveMovie(movieId, { status });
}

export function removeMovie(movieId: number): void {
  deleteEntry(movieId);
}

export type { EntryPatch };

