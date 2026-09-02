import { genreName } from "./genres";
import type { LibraryEntry } from "./types";

export interface LibraryStats {
  seen: number;
  watchlist: number;
  dismissed: number;
  favorites: number;
  ratedCount: number;
  averageRating: number | null;
  totalMinutes: number;
  watchlistMinutes: number;
  topGenres: { id: number; name: string; count: number }[];
  topDirectors: { id: number; name: string; count: number }[];
  topActors: { id: number; name: string; count: number }[];
  perDecade: { decade: number; count: number }[];
  perYearWatched: { year: number; count: number }[];
  ratingHistogram: { rating: number; count: number }[];
  bestRated: LibraryEntry[];
}

function tally<T>(items: T[], key: (item: T) => { id: number; name: string }[]) {
  const map = new Map<number, { id: number; name: string; count: number }>();
  for (const item of items) {
    for (const { id, name } of key(item)) {
      const current = map.get(id);
      if (current) current.count += 1;
      else map.set(id, { id, name, count: 1 });
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
}

export function computeStats(entries: LibraryEntry[]): LibraryStats {
  const seen = entries.filter((entry) => entry.status === "seen");
  const watchlist = entries.filter((entry) => entry.status === "watchlist");
  const rated = seen.filter((entry) => entry.rating !== null);

  const perDecade = new Map<number, number>();
  const perYearWatched = new Map<number, number>();

  for (const entry of seen) {
    const year = Number(entry.movie.releaseDate?.slice(0, 4));
    if (Number.isFinite(year)) {
      const decade = Math.floor(year / 10) * 10;
      perDecade.set(decade, (perDecade.get(decade) ?? 0) + 1);
    }
    const watchedYear = Number(entry.watchedAt?.slice(0, 4));
    if (Number.isFinite(watchedYear)) {
      perYearWatched.set(watchedYear, (perYearWatched.get(watchedYear) ?? 0) + 1);
    }
  }

  const ratingHistogram = Array.from({ length: 10 }, (_, index) => {
    const rating = (index + 1) / 2;
    return {
      rating,
      count: rated.filter((entry) => entry.rating === rating).length,
    };
  });

  const runtimeOf = (entry: LibraryEntry) =>
    entry.movie.runtime ?? 0 ? (entry.movie.runtime as number) : 0;

  return {
    seen: seen.length,
    watchlist: watchlist.length,
    dismissed: entries.filter((entry) => entry.status === "dismissed").length,
    favorites: entries.filter((entry) => entry.favorite).length,
    ratedCount: rated.length,
    averageRating: rated.length
      ? rated.reduce((total, entry) => total + (entry.rating ?? 0), 0) / rated.length
      : null,
    totalMinutes: seen.reduce(
      (total, entry) => total + runtimeOf(entry) * (1 + entry.rewatchCount),
      0,
    ),
    watchlistMinutes: watchlist.reduce((total, entry) => total + runtimeOf(entry), 0),
    topGenres: tally(seen, (entry) =>
      (entry.movie.genreIds ?? []).map((id) => ({ id, name: genreName(id) })),
    ).slice(0, 8),
    topDirectors: tally(seen, (entry) => entry.movie.directors ?? []).slice(0, 6),
    topActors: tally(seen, (entry) => entry.movie.cast ?? []).slice(0, 8),
    perDecade: [...perDecade.entries()]
      .map(([decade, count]) => ({ decade, count }))
      .sort((a, b) => a.decade - b.decade),
    perYearWatched: [...perYearWatched.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year),
    ratingHistogram,
    bestRated: rated
      .slice()
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 10),
  };
}
