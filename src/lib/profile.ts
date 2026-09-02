import { genreName } from "./genres";
import type { LibraryEntry } from "./types";

export interface Weighted {
  id: number;
  name: string;
  /** Score cumulé, positif = affinité, negatif = rejet. */
  score: number;
  /** Nombre de films vus qui alimentent ce score. */
  count: number;
}

export interface TasteProfile {
  /** Films vus triés du plus apprécié au moins apprécié. */
  liked: { entry: LibraryEntry; weight: number }[];
  genres: Weighted[];
  people: Weighted[];
  keywords: Weighted[];
  decades: { decade: number; count: number; score: number }[];
  averageRating: number | null;
  seenCount: number;
  /** true des qu'il y a assez de matière pour recommander finement. */
  isRich: boolean;
}

/**
 * Poids d'un film dans le profil de goût.
 * Note 5 -> +1, note 3 -> 0 (neutre), note 1 -> -1.
 * Un film vu mais non noté compte comme un signal positif faible.
 */
export function entryWeight(entry: LibraryEntry): number {
  let weight = entry.rating === null ? 0.35 : (entry.rating - 3) / 2;
  if (entry.favorite) weight += 0.35;
  if (entry.rewatchCount > 0) weight += Math.min(0.3, entry.rewatchCount * 0.15);
  return Math.max(-1.2, Math.min(1.4, weight));
}

function accumulate(
  map: Map<number, Weighted>,
  id: number,
  name: string,
  weight: number,
): void {
  const current = map.get(id);
  if (current) {
    current.score += weight;
    current.count += 1;
  } else {
    map.set(id, { id, name, score: weight, count: 1 });
  }
}

function sortWeighted(map: Map<number, Weighted>): Weighted[] {
  return [...map.values()].sort((a, b) => b.score - a.score);
}

/** Construit le profil de goût à partir des films marqués comme vus. */
export function buildProfile(entries: LibraryEntry[]): TasteProfile {
  const seen = entries.filter((entry) => entry.status === "seen");

  const genres = new Map<number, Weighted>();
  const people = new Map<number, Weighted>();
  const keywords = new Map<number, Weighted>();
  const decades = new Map<number, { decade: number; count: number; score: number }>();

  const liked = seen
    .map((entry) => ({ entry, weight: entryWeight(entry) }))
    .sort((a, b) => b.weight - a.weight);

  for (const { entry, weight } of liked) {
    for (const genreId of entry.movie.genreIds ?? []) {
      accumulate(genres, genreId, genreName(genreId), weight);
    }
    // Un réalisateur pèse plus qu'un acteur secondaire.
    for (const director of entry.movie.directors ?? []) {
      accumulate(people, director.id, director.name, weight * 1.4);
    }
    for (const [index, actor] of (entry.movie.cast ?? []).entries()) {
      accumulate(people, actor.id, actor.name, weight * (index < 2 ? 1 : 0.6));
    }
    for (const keyword of entry.movie.keywords ?? []) {
      accumulate(keywords, keyword.id, keyword.name, weight);
    }

    const year = Number(entry.movie.releaseDate?.slice(0, 4));
    if (Number.isFinite(year)) {
      const decade = Math.floor(year / 10) * 10;
      const current = decades.get(decade) ?? { decade, count: 0, score: 0 };
      current.count += 1;
      current.score += weight;
      decades.set(decade, current);
    }
  }

  const rated = seen.filter((entry) => entry.rating !== null);
  const averageRating = rated.length
    ? rated.reduce((total, entry) => total + (entry.rating ?? 0), 0) / rated.length
    : null;

  return {
    liked,
    genres: sortWeighted(genres),
    people: sortWeighted(people).filter((person) => person.count > 1 || person.score >= 1),
    keywords: sortWeighted(keywords).filter((keyword) => keyword.count > 1),
    decades: [...decades.values()].sort((a, b) => b.count - a.count),
    averageRating,
    seenCount: seen.length,
    isRich: seen.length >= 3,
  };
}

/**
 * Affinité normalisée pour un genre, dans [-1, 1].
 * On divise par le score du genre le plus apprécié afin que le barème reste
 * comparable quelle que soit la taille de la bibliothèque.
 */
export function genreAffinity(profile: TasteProfile): Map<number, number> {
  const maximum = Math.max(1, ...profile.genres.map((genre) => Math.abs(genre.score)));
  return new Map(profile.genres.map((genre) => [genre.id, genre.score / maximum]));
}
