/** Types partages entre le client TMDB, le stockage local et l'interface. */

export type WatchStatus = "seen" | "watchlist" | "dismissed";

/** Instantané d'un film conservé en local pour afficher la bibliothèque hors ligne. */
export interface MovieSnapshot {
  id: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genreIds: number[];
  voteAverage: number;
  runtime: number | null;
  overview: string;
  directors: NamedEntity[];
  cast: NamedEntity[];
  keywords: NamedEntity[];
}

export interface NamedEntity {
  id: number;
  name: string;
}

/** Une entrée de la bibliothèque personnelle. */
export interface LibraryEntry {
  id: number;
  status: WatchStatus;
  /** Note personnelle sur 5, par pas de 0,5. `null` si non notée. */
  rating: number | null;
  favorite: boolean;
  /** Date de visionnage (AAAA-MM-JJ). */
  watchedAt: string | null;
  addedAt: string;
  updatedAt: string;
  notes: string;
  rewatchCount: number;
  movie: MovieSnapshot;
}

export interface Settings {
  /** Identifiants TMDB des plateformes auxquelles l'utilisateur est abonné. */
  providers: number[];
  region: string;
  /** N'afficher en recommandation que les films disponibles sur mes plateformes. */
  onlyMyProviders: boolean;
}

export interface Database {
  version: number;
  entries: Record<string, LibraryEntry>;
  settings: Settings;
}

/* -------------------------------------------------------------------------- */
/* Réponses TMDB (champs réellement utilises)                                  */
/* -------------------------------------------------------------------------- */

export interface TmdbMovieSummary {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult?: boolean;
}

export interface TmdbCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  department?: string;
  profile_path: string | null;
  order?: number;
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority?: number;
}

export interface WatchProviders {
  link: string | null;
  flatrate: TmdbProvider[];
  rent: TmdbProvider[];
  buy: TmdbProvider[];
  ads: TmdbProvider[];
  free: TmdbProvider[];
}

/** Fiche complète d'un film, normalisée pour l'interface. */
export interface MovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  tagline: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  status: string | null;
  genres: { id: number; name: string }[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdbId: string | null;
  originalLanguage: string | null;
  spokenLanguages: string[];
  productionCountries: string[];
  productionCompanies: string[];
  collection: { id: number; name: string; posterPath: string | null } | null;
  certification: string | null;
  directors: TmdbCredit[];
  writers: TmdbCredit[];
  cast: TmdbCredit[];
  trailer: TmdbVideo | null;
  videos: TmdbVideo[];
  providers: WatchProviders;
  keywords: { id: number; name: string }[];
  similar: TmdbMovieSummary[];
  recommendations: TmdbMovieSummary[];
}

export interface Recommendation {
  movie: TmdbMovieSummary;
  score: number;
  reasons: string[];
}
