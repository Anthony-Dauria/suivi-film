import "server-only";

import type {
  MovieDetails,
  TmdbCredit,
  TmdbMovieSummary,
  TmdbProvider,
  TmdbVideo,
  WatchProviders,
} from "./types";

const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_URL = "https://image.tmdb.org/t/p";

export const REGION = process.env.TMDB_REGION?.trim() || "FR";
export const LANGUAGE = process.env.TMDB_LANGUAGE?.trim() || "fr-FR";

/** Erreur remontée jusqu'aux routes API pour produire un message lisible. */
export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

export function getApiKey(): string | null {
  const key = process.env.TMDB_API_KEY?.trim();
  return key ? key : null;
}

export function isConfigured(): boolean {
  return getApiKey() !== null;
}

/**
 * TMDB accepte deux formats d'authentification : la clé v3 (paramètre `api_key`)
 * et le jeton v4 (en-tête `Authorization: Bearer`, format JWT). On détecté le
 * format automatiquement pour que l'utilisateur puisse coller l'un ou l'autre.
 */
function isV4Token(key: string): boolean {
  return key.startsWith("ey") && key.split(".").length === 3;
}

interface TmdbFetchOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Durée de cache en secondes (cache HTTP de Next.js). */
  revalidate?: number;
}

async function tmdbFetch<T>(path: string, options: TmdbFetchOptions = {}): Promise<T> {
  const key = getApiKey();
  if (!key) {
    throw new TmdbError(
      "Clé API TMDB manquante. Renseignez TMDB_API_KEY dans votre fichier .env.local.",
      503,
    );
  }

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("language", LANGUAGE);
  for (const [name, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  }

  const headers: Record<string, string> = { accept: "application/json" };
  if (isV4Token(key)) headers.Authorization = `Bearer ${key}`;
  else url.searchParams.set("api_key", key);

  let response: Response;
  try {
    response = await fetch(url, {
      headers,
      next: { revalidate: options.revalidate ?? 3600 },
    });
  } catch {
    throw new TmdbError("Impossible de joindre TMDB. Vérifiez votre connexion réseau.", 502);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new TmdbError("Clé API TMDB invalide ou expirée.", 401);
    }
    if (response.status === 404) {
      throw new TmdbError("Ressource introuvable sur TMDB.", 404);
    }
    if (response.status === 429) {
      throw new TmdbError("Trop de requêtes envoyées à TMDB. Réessayez dans un instant.", 429);
    }
    throw new TmdbError(`TMDB a répondu avec le code ${response.status}.`, 502);
  }

  return (await response.json()) as T;
}

/** Variante tolérante : renvoie `fallback` au lieu de propager l'erreur. */
async function tmdbFetchSafe<T>(
  path: string,
  options: TmdbFetchOptions,
  fallback: T,
): Promise<T> {
  try {
    return await tmdbFetch<T>(path, options);
  } catch {
    return fallback;
  }
}

/* -------------------------------------------------------------------------- */
/* Images                                                                      */
/* -------------------------------------------------------------------------- */

type PosterSize = "w154" | "w185" | "w342" | "w500" | "original";
type BackdropSize = "w780" | "w1280" | "original";
type ProfileSize = "w45" | "w185" | "h632";
type LogoSize = "w45" | "w92" | "w154";

export function posterUrl(path: string | null, size: PosterSize = "w342"): string | null {
  return path ? `${IMAGE_URL}/${size}${path}` : null;
}

export function backdropUrl(path: string | null, size: BackdropSize = "w1280"): string | null {
  return path ? `${IMAGE_URL}/${size}${path}` : null;
}

export function profileUrl(path: string | null, size: ProfileSize = "w185"): string | null {
  return path ? `${IMAGE_URL}/${size}${path}` : null;
}

export function logoUrl(path: string | null, size: LogoSize = "w92"): string | null {
  return path ? `${IMAGE_URL}/${size}${path}` : null;
}

/* -------------------------------------------------------------------------- */
/* Recherche et listes                                                         */
/* -------------------------------------------------------------------------- */

interface PagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export async function searchMovies(query: string, page = 1) {
  const trimmed = query.trim();
  if (!trimmed) return { page: 1, results: [], total_pages: 0, total_results: 0 };

  return tmdbFetch<PagedResponse<TmdbMovieSummary>>("/search/movie", {
    params: { query: trimmed, page, include_adult: false, region: REGION },
    revalidate: 600,
  });
}

export async function getTrending(window: "day" | "week" = "week") {
  const data = await tmdbFetch<PagedResponse<TmdbMovieSummary>>(`/trending/movie/${window}`, {
    revalidate: 3600,
  });
  return data.results;
}

export async function getNowPlaying() {
  const data = await tmdbFetch<PagedResponse<TmdbMovieSummary>>("/movie/now_playing", {
    params: { region: REGION, page: 1 },
    revalidate: 3600 * 6,
  });
  return data.results;
}

export async function getTopRated() {
  const data = await tmdbFetch<PagedResponse<TmdbMovieSummary>>("/movie/top_rated", {
    params: { region: REGION, page: 1 },
    revalidate: 3600 * 24,
  });
  return data.results;
}

export interface DiscoverParams {
  withGenres?: string;
  withoutGenres?: string;
  withKeywords?: string;
  withCast?: string;
  withCrew?: string;
  withCompanies?: string;
  withWatchProviders?: string;
  sortBy?: string;
  voteCountGte?: number;
  voteAverageGte?: number;
  releaseDateGte?: string;
  releaseDateLte?: string;
  runtimeLte?: number;
  page?: number;
}

export async function discoverMovies(params: DiscoverParams) {
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    "/discover/movie",
    {
      params: {
        include_adult: false,
        include_video: false,
        region: REGION,
        watch_region: REGION,
        sort_by: params.sortBy ?? "popularity.desc",
        with_genres: params.withGenres,
        without_genres: params.withoutGenres,
        with_keywords: params.withKeywords,
        with_cast: params.withCast,
        with_crew: params.withCrew,
        with_companies: params.withCompanies,
        with_watch_providers: params.withWatchProviders,
        "vote_count.gte": params.voteCountGte ?? 100,
        "vote_average.gte": params.voteAverageGte,
        "primary_release_date.gte": params.releaseDateGte,
        "primary_release_date.lte": params.releaseDateLte,
        "with_runtime.lte": params.runtimeLte,
        page: params.page ?? 1,
      },
      revalidate: 3600 * 6,
    },
    { page: 1, results: [], total_pages: 0, total_results: 0 },
  );
  return data.results;
}

export async function getMovieRecommendations(movieId: number) {
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    `/movie/${movieId}/recommendations`,
    { revalidate: 3600 * 24 },
    { page: 1, results: [], total_pages: 0, total_results: 0 },
  );
  return data.results;
}

export async function getSimilarMovies(movieId: number) {
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    `/movie/${movieId}/similar`,
    { revalidate: 3600 * 24 },
    { page: 1, results: [], total_pages: 0, total_results: 0 },
  );
  return data.results;
}

export async function getGenres(): Promise<{ id: number; name: string }[]> {
  const data = await tmdbFetchSafe<{ genres: { id: number; name: string }[] }>(
    "/genre/movie/list",
    { revalidate: 3600 * 24 * 7 },
    { genres: [] },
  );
  return data.genres;
}

export async function getAvailableProviders(): Promise<TmdbProvider[]> {
  const data = await tmdbFetchSafe<{ results: TmdbProvider[] }>(
    "/watch/providers/movie",
    { params: { watch_region: REGION }, revalidate: 3600 * 24 * 7 },
    { results: [] },
  );
  return data.results
    .slice()
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999));
}

/* -------------------------------------------------------------------------- */
/* Fiche détaillée                                                             */
/* -------------------------------------------------------------------------- */

interface RawMovieDetails {
  id: number;
  title: string;
  original_title: string;
  tagline: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  status: string | null;
  genres: { id: number; name: string }[];
  vote_average: number;
  vote_count: number;
  popularity: number;
  budget: number;
  revenue: number;
  homepage: string | null;
  imdb_id: string | null;
  original_language: string | null;
  spoken_languages: { english_name: string; name: string }[];
  production_countries: { iso_3166_1: string; name: string }[];
  production_companies: { id: number; name: string }[];
  belongs_to_collection: { id: number; name: string; poster_path: string | null } | null;
  credits?: { cast: TmdbCredit[]; crew: TmdbCredit[] };
  videos?: { results: TmdbVideo[] };
  keywords?: { keywords: { id: number; name: string }[] };
  similar?: { results: TmdbMovieSummary[] };
  recommendations?: { results: TmdbMovieSummary[] };
  release_dates?: {
    results: {
      iso_3166_1: string;
      release_dates: { certification: string; type: number }[];
    }[];
  };
  "watch/providers"?: {
    results: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
        ads?: TmdbProvider[];
        free?: TmdbProvider[];
      }
    >;
  };
}

/** Choisit la meilleure bande-annonce disponible (VF officielle en priorité). */
function pickTrailer(videos: TmdbVideo[]): TmdbVideo | null {
  const youtube = videos.filter((video) => video.site === "YouTube");
  const score = (video: TmdbVideo) => {
    let value = 0;
    if (video.type === "Trailer") value += 4;
    else if (video.type === "Teaser") value += 2;
    if (video.official) value += 2;
    return value;
  };
  return youtube.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}

function extractCertification(raw: RawMovieDetails): string | null {
  const entry = raw.release_dates?.results.find((item) => item.iso_3166_1 === REGION);
  const certification = entry?.release_dates.find((item) => item.certification)?.certification;
  return certification || null;
}

function extractProviders(raw: RawMovieDetails): WatchProviders {
  const region = raw["watch/providers"]?.results?.[REGION];
  const dedupe = (list: TmdbProvider[] | undefined) => {
    const seen = new Set<number>();
    return (list ?? []).filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    });
  };
  return {
    link: region?.link ?? null,
    flatrate: dedupe(region?.flatrate),
    rent: dedupe(region?.rent),
    buy: dedupe(region?.buy),
    ads: dedupe(region?.ads),
    free: dedupe(region?.free),
  };
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const raw = await tmdbFetch<RawMovieDetails>(`/movie/${movieId}`, {
    params: {
      append_to_response:
        "credits,videos,keywords,similar,recommendations,release_dates,watch/providers",
      include_video_language: `${LANGUAGE.split("-")[0]},en,null`,
    },
    revalidate: 3600 * 12,
  });

  const crew = raw.credits?.crew ?? [];

  return {
    id: raw.id,
    title: raw.title,
    originalTitle: raw.original_title,
    tagline: raw.tagline || null,
    overview: raw.overview ?? "",
    posterPath: raw.poster_path,
    backdropPath: raw.backdrop_path,
    releaseDate: raw.release_date || null,
    runtime: raw.runtime || null,
    status: raw.status,
    genres: raw.genres ?? [],
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    budget: raw.budget ?? 0,
    revenue: raw.revenue ?? 0,
    homepage: raw.homepage || null,
    imdbId: raw.imdb_id || null,
    originalLanguage: raw.original_language,
    spokenLanguages: (raw.spoken_languages ?? []).map((language) => language.name),
    productionCountries: (raw.production_countries ?? []).map((country) => country.name),
    productionCompanies: (raw.production_companies ?? []).map((company) => company.name),
    collection: raw.belongs_to_collection
      ? {
          id: raw.belongs_to_collection.id,
          name: raw.belongs_to_collection.name,
          posterPath: raw.belongs_to_collection.poster_path,
        }
      : null,
    certification: extractCertification(raw),
    directors: crew.filter((member) => member.job === "Director"),
    writers: crew.filter(
      (member) =>
        member.job === "Screenplay" || member.job === "Writer" || member.job === "Story",
    ),
    cast: (raw.credits?.cast ?? []).slice(0, 24),
    trailer: pickTrailer(raw.videos?.results ?? []),
    videos: (raw.videos?.results ?? []).filter((video) => video.site === "YouTube").slice(0, 8),
    providers: extractProviders(raw),
    keywords: raw.keywords?.keywords ?? [],
    similar: raw.similar?.results ?? [],
    recommendations: raw.recommendations?.results ?? [],
  };
}

/** Plateformes de visionnage d'un film (endpoint léger, mis en cache). */
export async function getWatchProviders(movieId: number): Promise<WatchProviders> {
  const data = await tmdbFetchSafe<{
    results: Record<
      string,
      {
        link?: string;
        flatrate?: TmdbProvider[];
        rent?: TmdbProvider[];
        buy?: TmdbProvider[];
        ads?: TmdbProvider[];
        free?: TmdbProvider[];
      }
    >;
  }>(`/movie/${movieId}/watch/providers`, { revalidate: 3600 * 12 }, { results: {} });

  const region = data.results?.[REGION];
  return {
    link: region?.link ?? null,
    flatrate: region?.flatrate ?? [],
    rent: region?.rent ?? [],
    buy: region?.buy ?? [],
    ads: region?.ads ?? [],
    free: region?.free ?? [],
  };
}

/** Construit l'instantané local à partir d'une fiche complète. */
export function toSnapshot(details: MovieDetails) {
  return {
    id: details.id,
    title: details.title,
    originalTitle: details.originalTitle,
    posterPath: details.posterPath,
    backdropPath: details.backdropPath,
    releaseDate: details.releaseDate,
    genreIds: details.genres.map((genre) => genre.id),
    voteAverage: details.voteAverage,
    runtime: details.runtime,
    overview: details.overview,
    directors: details.directors.slice(0, 3).map((person) => ({
      id: person.id,
      name: person.name,
    })),
    cast: details.cast.slice(0, 5).map((person) => ({ id: person.id, name: person.name })),
    keywords: details.keywords.slice(0, 12).map((keyword) => ({
      id: keyword.id,
      name: keyword.name,
    })),
  };
}
