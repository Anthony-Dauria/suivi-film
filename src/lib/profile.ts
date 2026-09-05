import { genreName } from "./genres";
import type { LibraryEntry, MediaType } from "./types";

export interface Weighted {
  id: number;
  name: string;
  /** Score cumulé, positif = affinité, négatif = rejet. */
  score: number;
  /** Nombre d'œuvres vues qui alimentent ce score. */
  count: number;
}

/** Un genre appartient à un type d'œuvre : le même identifiant y change de sens. */
export interface WeightedGenre extends Weighted {
  mediaType: MediaType;
  key: string;
}

export interface TasteProfile {
  /** Œuvres vues, de la plus appréciée à la moins appréciée. */
  liked: { entry: LibraryEntry; weight: number }[];
  genres: WeightedGenre[];
  people: Weighted[];
  keywords: Weighted[];
  decades: { decade: number; count: number; score: number }[];
  averageRating: number | null;
  seenCount: number;
  movieCount: number;
  seriesCount: number;
  /** true dès qu'il y a assez de matière pour recommander finement. */
  isRich: boolean;
}

/**
 * Poids d'une œuvre dans le profil de goût.
 * Note 5 -> +1, note 3 -> 0 (neutre), note 1 -> -1.
 * Une œuvre vue mais non notée compte comme un signal positif faible.
 */
export function entryWeight(entry: LibraryEntry): number {
  let weight = entry.rating === null ? 0.35 : (entry.rating - 3) / 2;
  if (entry.favorite) weight += 0.35;
  if (entry.rewatchCount > 0) weight += Math.min(0.3, entry.rewatchCount * 0.15);
  return Math.max(-1.2, Math.min(1.4, weight));
}

function accumulate(map: Map<number, Weighted>, id: number, name: string, weight: number): void {
  const current = map.get(id);
  if (current) {
    current.score += weight;
    current.count += 1;
  } else {
    map.set(id, { id, name, score: weight, count: 1 });
  }
}

function sortWeighted<T extends Weighted>(map: Map<unknown, T>): T[] {
  return [...map.values()].sort((a, b) => b.score - a.score);
}

/** Construit le profil de goût à partir des œuvres marquées comme vues. */
export function buildProfile(entries: LibraryEntry[]): TasteProfile {
  const seen = entries.filter((entry) => entry.status === "seen");

  const genres = new Map<string, WeightedGenre>();
  const people = new Map<number, Weighted>();
  const keywords = new Map<number, Weighted>();
  const decades = new Map<number, { decade: number; count: number; score: number }>();

  const liked = seen
    .map((entry) => ({ entry, weight: entryWeight(entry) }))
    .sort((a, b) => b.weight - a.weight);

  for (const { entry, weight } of liked) {
    const mediaType = entry.mediaType;
    for (const genreId of entry.media.genreIds ?? []) {
      const key = `${mediaType}:${genreId}`;
      const current = genres.get(key);
      if (current) {
        current.score += weight;
        current.count += 1;
      } else {
        genres.set(key, {
          key,
          id: genreId,
          mediaType,
          name: genreName(genreId, mediaType),
          score: weight,
          count: 1,
        });
      }
    }
    // Un réalisateur ou créateur pèse plus qu'un acteur secondaire.
    for (const director of entry.media.directors ?? []) {
      accumulate(people, director.id, director.name, weight * 1.4);
    }
    for (const [index, actor] of (entry.media.cast ?? []).entries()) {
      accumulate(people, actor.id, actor.name, weight * (index < 2 ? 1 : 0.6));
    }
    for (const keyword of entry.media.keywords ?? []) {
      accumulate(keywords, keyword.id, keyword.name, weight);
    }

    const year = Number(entry.media.releaseDate?.slice(0, 4));
    if (Number.isFinite(year)) {
      const decade = Math.floor(year / 10) * 10;
      const current = decades.get(decade) ?? { decade, count: 0, score: 0 };
      current.count += 1;
      current.score += weight;
      decades.set(decade, current);
    }
  }

  const rated = seen.filter((entry) => entry.rating !== null);

  return {
    liked,
    genres: sortWeighted(genres),
    people: sortWeighted(people).filter((person) => person.count > 1 || person.score >= 1),
    keywords: sortWeighted(keywords).filter((keyword) => keyword.count > 1),
    decades: [...decades.values()].sort((a, b) => b.count - a.count),
    averageRating: rated.length
      ? rated.reduce((total, entry) => total + (entry.rating ?? 0), 0) / rated.length
      : null,
    seenCount: seen.length,
    movieCount: seen.filter((entry) => entry.mediaType === "movie").length,
    seriesCount: seen.filter((entry) => entry.mediaType === "tv").length,
    isRich: seen.length >= 3,
  };
}

/**
 * Affinité normalisée par genre, dans [-1, 1], indexée par `type:identifiant`.
 *
 * On divise par le score du genre le plus apprécié afin que le barème reste
 * comparable quelle que soit la taille de la bibliothèque.
 */
export function genreAffinity(profile: TasteProfile): Map<string, number> {
  const maximum = Math.max(1, ...profile.genres.map((genre) => Math.abs(genre.score)));
  return new Map(profile.genres.map((genre) => [genre.key, genre.score / maximum]));
}
