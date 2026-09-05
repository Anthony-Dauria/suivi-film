import type { LibraryEntry, MediaSummary } from "./types";

export interface CardData {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage?: number;
  seasonCount?: number;
}

/** Adapte un résultat TMDB au format attendu par `MediaCard`. */
export function summaryToCard(media: MediaSummary): CardData {
  return {
    id: media.id,
    mediaType: media.mediaType,
    title: media.title,
    posterPath: media.posterPath,
    releaseDate: media.releaseDate,
    voteAverage: media.voteAverage,
  };
}

/** Adapte une entrée de bibliothèque au format attendu par `MediaCard`. */
export function entryToCard(entry: LibraryEntry): CardData {
  return {
    id: entry.id,
    mediaType: entry.mediaType,
    title: entry.media.title,
    posterPath: entry.media.posterPath,
    releaseDate: entry.media.releaseDate,
    voteAverage: entry.media.voteAverage,
    seasonCount: entry.media.seasonCount,
  };
}

/** Adresse de la fiche : les films et les séries ont leur propre route. */
export function mediaHref(mediaType: "movie" | "tv", id: number): string {
  return mediaType === "tv" ? `/serie/?id=${id}` : `/film/?id=${id}`;
}
