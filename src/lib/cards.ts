import type { LibraryEntry, TmdbMovieSummary } from "./types";

/** Adapte un résultat TMDB au format attendu par `MovieCard`. */
export function summaryToCard(movie: TmdbMovieSummary) {
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
  };
}

/** Adapte une entrée de bibliothèque au format attendu par `MovieCard`. */
export function entryToCard(entry: LibraryEntry) {
  return {
    id: entry.id,
    title: entry.movie.title,
    posterPath: entry.movie.posterPath,
    releaseDate: entry.movie.releaseDate,
    voteAverage: entry.movie.voteAverage,
  };
}
