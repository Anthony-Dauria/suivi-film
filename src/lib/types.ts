/** Types partagés entre le client TMDB, le stockage local et l'interface. */

export type WatchStatus = "seen" | "watchlist" | "dismissed";

/** Films et séries sont suivis côte à côte, avec des routes TMDB distinctes. */
export type MediaType = "movie" | "tv";

export interface NamedEntity {
  id: number;
  name: string;
}

/**
 * Instantané d'une œuvre conservé en local pour afficher la bibliothèque sans
 * appel réseau, et pour alimenter le profil de goût.
 */
export interface MediaSnapshot {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  backdropPath: string | null;
  /** Sortie du film, ou première diffusion de la série. */
  releaseDate: string | null;
  genreIds: number[];
  voteAverage: number;
  /** Durée du film, ou durée moyenne d'un épisode. */
  runtime: number | null;
  overview: string;
  /** Réalisation pour un film, création pour une série. */
  directors: NamedEntity[];
  cast: NamedEntity[];
  keywords: NamedEntity[];
  /** Séries uniquement. */
  seasonCount?: number;
  episodeCount?: number;
}

/** Une entrée de la bibliothèque personnelle. */
export interface LibraryEntry {
  id: number;
  mediaType: MediaType;
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
  media: MediaSnapshot;
}

export interface Settings {
  /** Identifiants TMDB des plateformes auxquelles l'utilisateur est abonné. */
  providers: number[];
  /** Pays des disponibilités de streaming et des dates de sortie (ISO 3166-1). */
  region: string;
  /** Langue des fiches (ISO 639-1 tiret ISO 3166-1). */
  language: string;
  /** N'afficher en recommandation que les œuvres disponibles sur mes plateformes. */
  onlyMyProviders: boolean;
}

export interface Database {
  version: number;
  entries: Record<string, LibraryEntry>;
  settings: Settings;
}

/* -------------------------------------------------------------------------- */
/* Réponses TMDB (champs réellement utilisés)                                  */
/* -------------------------------------------------------------------------- */

/**
 * Résultat de liste TMDB, normalisé : l'API nomme `title`/`release_date` pour
 * les films et `name`/`first_air_date` pour les séries.
 */
export interface MediaSummary {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  genreIds: number[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
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

export interface Season {
  id: number;
  seasonNumber: number;
  name: string;
  episodeCount: number;
  airDate: string | null;
  posterPath: string | null;
  overview: string;
}

/** Fiche complète d'un film ou d'une série, normalisée pour l'interface. */
export interface MediaDetails {
  id: number;
  mediaType: MediaType;
  title: string;
  originalTitle: string;
  tagline: string | null;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  /** Durée du film, ou durée moyenne d'un épisode. */
  runtime: number | null;
  status: string | null;
  genres: NamedEntity[];
  voteAverage: number;
  voteCount: number;
  popularity: number;
  homepage: string | null;
  imdbId: string | null;
  originalLanguage: string | null;
  spokenLanguages: string[];
  productionCountries: string[];
  productionCompanies: string[];
  certification: string | null;
  /** Réalisation (film) ou création (série). */
  directors: TmdbCredit[];
  writers: TmdbCredit[];
  cast: TmdbCredit[];
  trailer: TmdbVideo | null;
  providers: WatchProviders;
  keywords: NamedEntity[];
  similar: MediaSummary[];
  recommendations: MediaSummary[];

  /** Films uniquement. */
  budget?: number;
  revenue?: number;
  collection?: { id: number; name: string; posterPath: string | null } | null;

  /** Séries uniquement. */
  seasonCount?: number;
  episodeCount?: number;
  lastAirDate?: string | null;
  inProduction?: boolean;
  networks?: string[];
  seasons?: Season[];
}
