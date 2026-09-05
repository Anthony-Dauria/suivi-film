/**
 * Client TMDB exécuté dans le navigateur.
 *
 * Le site étant statique, il n'y a pas de serveur pour relayer les appels : les
 * requêtes partent directement du navigateur vers l'API TMDB (qui autorise les
 * appels cross-origin). Les réponses passent par le cache de `cache.ts`.
 *
 * Films et séries vivent sur des routes distinctes (`/movie/…` et `/tv/…`) et
 * ne portent pas les mêmes noms de champs : tout est normalisé ici pour que le
 * reste de l'application manipule une seule forme.
 */

import { cached } from "./cache";
import { getSettings, getStoredApiKey } from "./store";
import type {
  MediaDetails,
  MediaSummary,
  MediaType,
  NamedEntity,
  Season,
  TmdbCredit,
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

  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("language", getLanguage());
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
/* Normalisation des listes                                                    */
/* -------------------------------------------------------------------------- */

interface RawSummary {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string | null;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string | null;
  first_air_date?: string | null;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  adult?: boolean;
}

/** Ramène un résultat de liste TMDB à la forme unique utilisée par l'interface. */
function toSummary(raw: RawSummary, mediaType: MediaType): MediaSummary {
  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? "Sans titre",
    originalTitle: raw.original_title ?? raw.original_name ?? "",
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    releaseDate: raw.release_date || raw.first_air_date || null,
    genreIds: raw.genre_ids ?? [],
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
  };
}

interface PagedResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface SearchResult {
  page: number;
  results: MediaSummary[];
  totalPages: number;
  totalResults: number;
}

const EMPTY_RAW_PAGE: PagedResponse<RawSummary> = {
  page: 1,
  results: [],
  total_pages: 0,
  total_results: 0,
};

/* -------------------------------------------------------------------------- */
/* Recherche et listes                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Recherche films et séries en une fois.
 *
 * `/search/multi` renvoie aussi des personnes : elles sont écartées, comme les
 * contenus pour adultes.
 */
export async function searchMedia(
  query: string,
  page = 1,
  mediaType?: MediaType,
): Promise<SearchResult> {
  const trimmed = query.trim();
  if (!trimmed) return { page: 1, results: [], totalPages: 0, totalResults: 0 };

  const path = mediaType ? `/search/${mediaType}` : "/search/multi";
  const data = await tmdbFetch<PagedResponse<RawSummary>>(path, {
    params: { query: trimmed, page, include_adult: false, region: getRegion() },
    ttl: 10 * 60 * 1000,
  });

  const results = data.results
    .filter((raw) => {
      if (raw.adult) return false;
      const type = mediaType ?? raw.media_type;
      return type === "movie" || type === "tv";
    })
    .map((raw) => toSummary(raw, (mediaType ?? raw.media_type) as MediaType));

  return {
    page: data.page,
    results,
    totalPages: data.total_pages,
    totalResults: data.total_results,
  };
}

/** Tendances de la semaine, tous types confondus ou pour un type donné. */
export async function getTrending(mediaType: MediaType | "all" = "all") {
  const data = await tmdbFetch<PagedResponse<RawSummary>>(`/trending/${mediaType}/week`, {
    ttl: HOUR,
  });
  return data.results
    .filter((raw) => {
      const type = mediaType === "all" ? raw.media_type : mediaType;
      return type === "movie" || type === "tv";
    })
    .map((raw) => toSummary(raw, (mediaType === "all" ? raw.media_type : mediaType) as MediaType));
}

export async function getTopRated(mediaType: MediaType) {
  const data = await tmdbFetch<PagedResponse<RawSummary>>(`/${mediaType}/top_rated`, {
    params: { page: 1, region: mediaType === "movie" ? getRegion() : undefined },
    ttl: 24 * HOUR,
  });
  return data.results.map((raw) => toSummary(raw, mediaType));
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
  releaseDateGte?: string;
  runtimeLte?: number;
  page?: number;
}

export async function discover(mediaType: MediaType, params: DiscoverParams) {
  const region = getRegion();
  // Les filtres de date et de casting ne portent pas le même nom selon le type.
  const dateField = mediaType === "movie" ? "primary_release_date" : "first_air_date";
  const peopleParams =
    mediaType === "movie"
      ? { with_cast: params.withCast, with_crew: params.withCrew }
      : { with_people: params.withCast ?? params.withCrew };

  const data = await tmdbFetchSafe<PagedResponse<RawSummary>>(
    `/discover/${mediaType}`,
    {
      params: {
        include_adult: false,
        watch_region: region,
        ...(mediaType === "movie" ? { region, include_video: false } : {}),
        sort_by: params.sortBy ?? "popularity.desc",
        with_genres: params.withGenres,
        without_genres: params.withoutGenres,
        with_keywords: params.withKeywords,
        ...peopleParams,
        with_watch_providers: params.withWatchProviders,
        "vote_count.gte": params.voteCountGte ?? 100,
        [`${dateField}.gte`]: params.releaseDateGte,
        "with_runtime.lte": params.runtimeLte,
        page: params.page ?? 1,
      },
      ttl: 6 * HOUR,
    },
    EMPTY_RAW_PAGE,
  );
  return data.results.map((raw) => toSummary(raw, mediaType));
}

export async function getRelated(
  mediaType: MediaType,
  id: number,
  kind: "recommendations" | "similar",
) {
  const data = await tmdbFetchSafe<PagedResponse<RawSummary>>(
    `/${mediaType}/${id}/${kind}`,
    { ttl: 24 * HOUR },
    EMPTY_RAW_PAGE,
  );
  return data.results.map((raw) => toSummary(raw, mediaType));
}

/** Plateformes proposées dans le pays, films et séries confondus. */
export async function getAvailableProviders(): Promise<TmdbProvider[]> {
  const region = getRegion();
  const [movies, series] = await Promise.all(
    (["movie", "tv"] as const).map((type) =>
      tmdbFetchSafe<{ results: TmdbProvider[] }>(
        `/watch/providers/${type}`,
        { params: { watch_region: region }, ttl: 7 * 24 * HOUR },
        { results: [] },
      ),
    ),
  );

  const seen = new Set<number>();
  return [...movies.results, ...series.results]
    .filter((provider) => {
      if (seen.has(provider.provider_id)) return false;
      seen.add(provider.provider_id);
      return true;
    })
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999));
}

/* -------------------------------------------------------------------------- */
/* Fiche détaillée                                                             */
/* -------------------------------------------------------------------------- */

interface RawProviderGroup {
  link?: string;
  flatrate?: TmdbProvider[];
  rent?: TmdbProvider[];
  buy?: TmdbProvider[];
  ads?: TmdbProvider[];
  free?: TmdbProvider[];
}

interface RawDetails extends RawSummary {
  tagline?: string | null;
  runtime?: number | null;
  episode_run_time?: number[];
  status?: string | null;
  genres?: NamedEntity[];
  homepage?: string | null;
  imdb_id?: string | null;
  original_language?: string | null;
  spoken_languages?: { name: string }[];
  production_countries?: { name: string }[];
  production_companies?: { id: number; name: string }[];
  belongs_to_collection?: { id: number; name: string; poster_path: string | null } | null;
  budget?: number;
  revenue?: number;
  created_by?: TmdbCredit[];
  networks?: { id: number; name: string }[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_air_date?: string | null;
  in_production?: boolean;
  seasons?: {
    id: number;
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string | null;
    poster_path: string | null;
    overview: string;
  }[];
  credits?: { cast: TmdbCredit[]; crew: TmdbCredit[] };
  videos?: { results: TmdbVideo[] };
  keywords?: { keywords?: NamedEntity[]; results?: NamedEntity[] };
  similar?: { results: RawSummary[] };
  recommendations?: { results: RawSummary[] };
  release_dates?: {
    results: { iso_3166_1: string; release_dates: { certification: string }[] }[];
  };
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  external_ids?: { imdb_id?: string | null };
  "watch/providers"?: { results: Record<string, RawProviderGroup> };
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

/** Classification du public : `release_dates` pour un film, `content_ratings` pour une série. */
function extractCertification(raw: RawDetails, region: string): string | null {
  const movie = raw.release_dates?.results
    .find((item) => item.iso_3166_1 === region)
    ?.release_dates.find((item) => item.certification)?.certification;
  const series = raw.content_ratings?.results.find((item) => item.iso_3166_1 === region)?.rating;
  return movie || series || null;
}

export async function getDetails(
  mediaType: MediaType,
  id: number,
): Promise<MediaDetails> {
  const region = getRegion();
  const appendix =
    mediaType === "movie"
      ? "credits,videos,keywords,similar,recommendations,release_dates,watch/providers"
      : "credits,videos,keywords,similar,recommendations,content_ratings,external_ids,watch/providers";

  const raw = await tmdbFetch<RawDetails>(`/${mediaType}/${id}`, {
    params: {
      append_to_response: appendix,
      include_video_language: `${getLanguage().split("-")[0]},en,null`,
    },
    ttl: 12 * HOUR,
  });

  const crew = raw.credits?.crew ?? [];
  // Une série n'a pas de réalisateur unique : ses créateurs jouent ce rôle.
  const directors =
    mediaType === "movie"
      ? crew.filter((member) => member.job === "Director")
      : (raw.created_by ?? []);

  const runtime =
    mediaType === "movie"
      ? (raw.runtime ?? null)
      : (raw.episode_run_time?.find((value) => value > 0) ?? null);

  const seasons: Season[] = (raw.seasons ?? [])
    // La « saison 0 » regroupe les épisodes spéciaux : elle vient en dernier.
    .map((season) => ({
      id: season.id,
      seasonNumber: season.season_number,
      name: season.name,
      episodeCount: season.episode_count,
      airDate: season.air_date,
      posterPath: season.poster_path,
      overview: season.overview,
    }))
    .sort((a, b) => (a.seasonNumber || 99) - (b.seasonNumber || 99));

  return {
    id: raw.id,
    mediaType,
    title: raw.title ?? raw.name ?? "Sans titre",
    originalTitle: raw.original_title ?? raw.original_name ?? "",
    tagline: raw.tagline || null,
    overview: raw.overview ?? "",
    posterPath: raw.poster_path ?? null,
    backdropPath: raw.backdrop_path ?? null,
    releaseDate: raw.release_date || raw.first_air_date || null,
    runtime,
    status: raw.status ?? null,
    genres: raw.genres ?? [],
    voteAverage: raw.vote_average ?? 0,
    voteCount: raw.vote_count ?? 0,
    popularity: raw.popularity ?? 0,
    homepage: raw.homepage || null,
    imdbId: raw.imdb_id || raw.external_ids?.imdb_id || null,
    originalLanguage: raw.original_language ?? null,
    spokenLanguages: (raw.spoken_languages ?? []).map((language) => language.name),
    productionCountries: (raw.production_countries ?? []).map((country) => country.name),
    productionCompanies: (raw.production_companies ?? []).map((company) => company.name),
    certification: extractCertification(raw, region),
    directors,
    writers: crew.filter(
      (member) =>
        member.job === "Screenplay" || member.job === "Writer" || member.job === "Story",
    ),
    cast: (raw.credits?.cast ?? []).slice(0, 24),
    trailer: pickTrailer(raw.videos?.results ?? []),
    providers: toWatchProviders(raw["watch/providers"]?.results?.[region]),
    keywords: raw.keywords?.keywords ?? raw.keywords?.results ?? [],
    similar: (raw.similar?.results ?? []).map((item) => toSummary(item, mediaType)),
    recommendations: (raw.recommendations?.results ?? []).map((item) => toSummary(item, mediaType)),

    ...(mediaType === "movie"
      ? {
          budget: raw.budget ?? 0,
          revenue: raw.revenue ?? 0,
          collection: raw.belongs_to_collection
            ? {
                id: raw.belongs_to_collection.id,
                name: raw.belongs_to_collection.name,
                posterPath: raw.belongs_to_collection.poster_path,
              }
            : null,
        }
      : {
          seasonCount: raw.number_of_seasons ?? seasons.length,
          episodeCount: raw.number_of_episodes ?? 0,
          lastAirDate: raw.last_air_date ?? null,
          inProduction: raw.in_production ?? false,
          networks: (raw.networks ?? []).map((network) => network.name),
          seasons,
        }),
  };
}

/** Plateformes de visionnage (requête légère, mise en cache). */
export async function getWatchProviders(
  mediaType: MediaType,
  id: number,
): Promise<WatchProviders> {
  const region = getRegion();
  const data = await tmdbFetchSafe<{ results: Record<string, RawProviderGroup> }>(
    `/${mediaType}/${id}/watch/providers`,
    { ttl: 12 * HOUR },
    { results: {} },
  );
  return toWatchProviders(data.results?.[region]);
}

/** Construit l'instantané local à partir d'une fiche complète. */
export function toSnapshot(details: MediaDetails) {
  return {
    id: details.id,
    mediaType: details.mediaType,
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
    ...(details.mediaType === "tv"
      ? { seasonCount: details.seasonCount, episodeCount: details.episodeCount }
      : {}),
  };
}
