/**
 * Client TMDB exécuté dans le navigateur.
 *
 * Le site étant statique, il n'y a pas de serveur pour relayer les appels : les
 * requêtes partent directement du navigateur vers l'API TMDB (qui autorise les
 * appels cross-origin). Les réponses passent par le cache de `cache.ts`.
 */

import { cached } from "./cache";
import { getSettings, getStoredApiKey } from "./store";
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

const HOUR = 3600 * 1000;

/** Erreur porteuse d'un message affichable tel quel dans l'interface. */
export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "TmdbError";
  }
}

/**
 * Clé utilisée pour les appels : celle saisie par l'utilisateur en priorité,
 * sinon celle éventuellement intégrée au moment du build.
 */
export function getApiKey(): string | null {
  const stored = getStoredApiKey();
  if (stored) return stored;
  const compiled = process.env.NEXT_PUBLIC_TMDB_API_KEY?.trim();
  return compiled ? compiled : null;
}

export function isConfigured(): boolean {
  return getApiKey() !== null;
}

export function getRegion(): string {
  return getSettings().region || "FR";
}

export function getLanguage(): string {
  return getSettings().language || "fr-FR";
}

/**
 * TMDB accepte deux formats d'authentification : la clé v3 (paramètre `api_key`)
 * et le jeton v4 (en-tête `Authorization: Bearer`, au format JWT). On détecte le
 * format automatiquement pour que l'utilisateur puisse coller l'un ou l'autre.
 */
function isV4Token(key: string): boolean {
  return key.startsWith("ey") && key.split(".").length === 3;
}

interface TmdbFetchOptions {
  params?: Record<string, string | number | boolean | undefined>;
  /** Durée de validité en cache, en millisecondes. */
  ttl?: number;
}

async function tmdbFetch<T>(path: string, options: TmdbFetchOptions = {}): Promise<T> {
  const key = getApiKey();
  if (!key) {
    throw new TmdbError(
      "Clé API TMDB manquante. Renseignez-la dans les réglages pour activer la recherche.",
      503,
    );
  }

  const language = getLanguage();
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("language", language);
  for (const [name, value] of Object.entries(options.params ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  }

  // La clé ne fait pas partie de l'identifiant de cache, la langue et le pays si.
  const cacheKey = `${url.pathname}${url.search}|${getRegion()}`;

  return cached(cacheKey, options.ttl ?? HOUR, async () => {
    const headers: Record<string, string> = { accept: "application/json" };
    if (isV4Token(key)) headers.Authorization = `Bearer ${key}`;
    else url.searchParams.set("api_key", key);

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch {
      throw new TmdbError("Impossible de joindre TMDB. Vérifiez votre connexion réseau.", 502);
    }

    if (!response.ok) {
      if (response.status === 401) throw new TmdbError("Clé API TMDB invalide ou expirée.", 401);
      if (response.status === 404) throw new TmdbError("Ressource introuvable sur TMDB.", 404);
      if (response.status === 429) {
        throw new TmdbError("Trop de requêtes envoyées à TMDB. Réessayez dans un instant.", 429);
      }
      throw new TmdbError(`TMDB a répondu avec le code ${response.status}.`, 502);
    }

    return (await response.json()) as T;
  });
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

type BackdropSize = "w780" | "w1280" | "original";

export function backdropUrl(path: string | null, size: BackdropSize = "w1280"): string | null {
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

const EMPTY_PAGE: PagedResponse<never> = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

export async function searchMovies(query: string, page = 1) {
  const trimmed = query.trim();
  if (!trimmed) return EMPTY_PAGE as PagedResponse<TmdbMovieSummary>;

  return tmdbFetch<PagedResponse<TmdbMovieSummary>>("/search/movie", {
    params: { query: trimmed, page, include_adult: false, region: getRegion() },
    ttl: 10 * 60 * 1000,
  });
}

export async function getTrending(window: "day" | "week" = "week") {
  const data = await tmdbFetch<PagedResponse<TmdbMovieSummary>>(`/trending/movie/${window}`, {
    ttl: HOUR,
  });
  return data.results;
}

export async function getTopRated() {
  const data = await tmdbFetch<PagedResponse<TmdbMovieSummary>>("/movie/top_rated", {
    params: { region: getRegion(), page: 1 },
    ttl: 24 * HOUR,
  });
  return data.results;
}

export interface DiscoverParams {
  withGenres?: string;
  withoutGenres?: string;
  withKeywords?: string;
  withCast?: string;
  withCrew?: string;
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
  const region = getRegion();
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    "/discover/movie",
    {
      params: {
        include_adult: false,
        include_video: false,
        region,
        watch_region: region,
        sort_by: params.sortBy ?? "popularity.desc",
        with_genres: params.withGenres,
        without_genres: params.withoutGenres,
        with_keywords: params.withKeywords,
        with_cast: params.withCast,
        with_crew: params.withCrew,
        with_watch_providers: params.withWatchProviders,
        "vote_count.gte": params.voteCountGte ?? 100,
        "vote_average.gte": params.voteAverageGte,
        "primary_release_date.gte": params.releaseDateGte,
        "primary_release_date.lte": params.releaseDateLte,
        "with_runtime.lte": params.runtimeLte,
        page: params.page ?? 1,
      },
      ttl: 6 * HOUR,
    },
    EMPTY_PAGE,
  );
  return data.results;
}

export async function getMovieRecommendations(movieId: number) {
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    `/movie/${movieId}/recommendations`,
    { ttl: 24 * HOUR },
    EMPTY_PAGE,
  );
  return data.results;
}

export async function getSimilarMovies(movieId: number) {
  const data = await tmdbFetchSafe<PagedResponse<TmdbMovieSummary>>(
    `/movie/${movieId}/similar`,
    { ttl: 24 * HOUR },
    EMPTY_PAGE,
  );
  return data.results;
}

export async function getAvailableProviders(): Promise<TmdbProvider[]> {
  const data = await tmdbFetchSafe<{ results: TmdbProvider[] }>(
    "/watch/providers/movie",
    { params: { watch_region: getRegion() }, ttl: 7 * 24 * HOUR },
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
  "watch/providers"?: { results: Record<string, RawProviderGroup> };
}

interface RawProviderGroup {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  ads?: TmdbProvider[];
  free?: TmdbProvider[];
}

/** Choisit la meilleure bande-annonce disponible (officielle en priorité). */
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

function extractCertification(raw: RawMovieDetails, region: string): string | null {
  const entry = raw.release_dates?.results.find((item) => item.iso_3166_1 === region);
  return entry?.release_dates.find((item) => item.certification)?.certification || null;
}

function toWatchProviders(group: RawProviderGroup | undefined): WatchProviders {
  const dedupe = (list: TmdbProvider[] | undefined) => {
    const seen = new Set<number>();
    return (list ?? []).filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    });
  };
  return {
    link: group?.link ?? null,
    flatrate: dedupe(group?.flatrate),
    rent: dedupe(group?.rent),
    buy: dedupe(group?.buy),
    ads: dedupe(group?.ads),
    free: dedupe(group?.free),
  };
}

export async function getMovieDetails(movieId: number): Promise<MovieDetails> {
  const region = getRegion();
  const raw = await tmdbFetch<RawMovieDetails>(`/movie/${movieId}`, {
    params: {
      append_to_response:
        "credits,videos,keywords,similar,recommendations,release_dates,watch/providers",
      include_video_language: `${getLanguage().split("-")[0]},en,null`,
    },
    ttl: 12 * HOUR,
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
    certification: extractCertification(raw, region),
    directors: crew.filter((member) => member.job === "Director"),
    writers: crew.filter(
      (member) =>
        member.job === "Screenplay" || member.job === "Writer" || member.job === "Story",
    ),
    cast: (raw.credits?.cast ?? []).slice(0, 24),
    trailer: pickTrailer(raw.videos?.results ?? []),
    videos: (raw.videos?.results ?? []).filter((video) => video.site === "YouTube").slice(0, 8),
    providers: toWatchProviders(raw["watch/providers"]?.results?.[region]),
    keywords: raw.keywords?.keywords ?? [],
    similar: raw.similar?.results ?? [],
    recommendations: raw.recommendations?.results ?? [],
  };
}

/** Plateformes de visionnage d'un film (requête légère, mise en cache). */
export async function getWatchProviders(movieId: number): Promise<WatchProviders> {
  const region = getRegion();
  const data = await tmdbFetchSafe<{ results: Record<string, RawProviderGroup> }>(
    `/movie/${movieId}/watch/providers`,
    { ttl: 12 * HOUR },
    { results: {} },
  );
  return toWatchProviders(data.results?.[region]);
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
