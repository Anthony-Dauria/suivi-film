import "server-only";

import { buildProfile, genreAffinity, type TasteProfile } from "./profile";
import { getAllEntries, getSettings } from "./store";
import {
  discoverMovies,
  getMovieRecommendations,
  getSimilarMovies,
  getTopRated,
  getTrending,
  getWatchProviders,
} from "./tmdb";
import type { LibraryEntry, TmdbMovieSummary, WatchProviders } from "./types";

export interface ScoredMovie {
  movie: TmdbMovieSummary;
  score: number;
  reasons: string[];
  providers: WatchProviders | null;
}

export interface RecommendationOptions {
  /** Nombre de films renvoyés. */
  limit?: number;
  /** Restreint aux films disponibles sur les plateformes de l'utilisateur. */
  onlyMyProviders?: boolean;
  /** Ne garder que ce genre TMDB. */
  genreId?: number;
  /** Durée maximale en minutes (filtre appliqué côté TMDB pour les découvertes). */
  maxRuntime?: number;
}

interface Candidate {
  movie: TmdbMovieSummary;
  score: number;
  reasons: Set<string>;
}

/** Nombre de films dont on vérifie les plateformes de streaming. */
const PROVIDER_LOOKUP_LIMIT = 30;

function addCandidate(
  pool: Map<number, Candidate>,
  movie: TmdbMovieSummary,
  score: number,
  reason: string | null,
): void {
  if (!movie || typeof movie.id !== "number" || movie.adult) return;
  const existing = pool.get(movie.id);
  if (existing) {
    existing.score += score;
    if (reason) existing.reasons.add(reason);
    return;
  }
  pool.set(movie.id, {
    movie,
    score,
    reasons: new Set(reason ? [reason] : []),
  });
}

/** Bonus de qualité : note TMDB fiable + notoriété, avec rendements décroissants. */
function qualityScore(movie: TmdbMovieSummary): number {
  const votes = movie.vote_count ?? 0;
  if (votes < 50) return -0.5;
  const confidence = Math.min(1, Math.log10(votes) / 4);
  const quality = ((movie.vote_average ?? 0) - 6.2) * 0.9 * confidence;
  const notoriety = Math.min(0.6, Math.log10((movie.popularity ?? 0) + 1) / 5);
  return quality + notoriety;
}

function decadeOf(movie: TmdbMovieSummary): number | null {
  const year = Number(movie.release_date?.slice(0, 4));
  return Number.isFinite(year) ? Math.floor(year / 10) * 10 : null;
}

/** Collecte les candidats à partir des films aimés et de requêtes ciblees. */
async function collectCandidates(profile: TasteProfile, options: RecommendationOptions) {
  const pool = new Map<number, Candidate>();

  const topLiked = profile.liked.filter((item) => item.weight > 0.2).slice(0, 8);
  const topGenres = profile.genres.filter((genre) => genre.score > 0).slice(0, 3);
  const dislikedGenres = profile.genres.filter((genre) => genre.score < -0.8).slice(0, 3);
  const topKeywords = profile.keywords.filter((keyword) => keyword.score > 0.8).slice(0, 5);
  const topPeople = profile.people.filter((person) => person.score > 1).slice(0, 4);

  const commonDiscover = {
    withoutGenres: dislikedGenres.map((genre) => genre.id).join(","),
    runtimeLte: options.maxRuntime,
    voteCountGte: 150,
  };

  const tasks: Promise<void>[] = [];

  // 1. « Parce que vous avez aimé… » : le signal le plus fort.
  for (const { entry, weight } of topLiked) {
    const reason = `Parce que vous avez aimé « ${entry.movie.title} »`;
    tasks.push(
      getMovieRecommendations(entry.id).then((movies) => {
        movies.slice(0, 12).forEach((movie, index) => {
          addCandidate(pool, movie, weight * (3 - index * 0.12), reason);
        });
      }),
      getSimilarMovies(entry.id).then((movies) => {
        movies.slice(0, 8).forEach((movie, index) => {
          addCandidate(pool, movie, weight * (1.6 - index * 0.08), reason);
        });
      }),
    );
  }

  // 2. Genres de prédilection.
  for (const genre of topGenres) {
    tasks.push(
      discoverMovies({
        ...commonDiscover,
        withGenres: String(genre.id),
        sortBy: "vote_average.desc",
        voteCountGte: 800,
      }).then((movies) => {
        movies.slice(0, 12).forEach((movie) => {
          addCandidate(pool, movie, 1.1, `Vous aimez le genre ${genre.name.toLowerCase()}`);
        });
      }),
      discoverMovies({
        ...commonDiscover,
        withGenres: String(genre.id),
        sortBy: "popularity.desc",
        releaseDateGte: `${new Date().getFullYear() - 3}-01-01`,
      }).then((movies) => {
        movies.slice(0, 8).forEach((movie) => {
          addCandidate(pool, movie, 0.8, `Récent en ${genre.name.toLowerCase()}`);
        });
      }),
    );
  }

  // 3. Thèmes récurrents (mots-clés TMDB).
  for (const keyword of topKeywords) {
    tasks.push(
      discoverMovies({
        ...commonDiscover,
        withKeywords: String(keyword.id),
        sortBy: "vote_average.desc",
        voteCountGte: 300,
      }).then((movies) => {
        movies.slice(0, 8).forEach((movie) => {
          addCandidate(pool, movie, 1, `Thème récurrent chez vous : ${keyword.name}`);
        });
      }),
    );
  }

  // 4. Réalisateurs et acteurs favoris.
  for (const person of topPeople) {
    tasks.push(
      discoverMovies({ ...commonDiscover, withCast: String(person.id), voteCountGte: 80 }).then(
        (movies) => {
          movies.slice(0, 6).forEach((movie) => {
            addCandidate(pool, movie, 1.2, `Avec ${person.name}`);
          });
        },
      ),
      discoverMovies({ ...commonDiscover, withCrew: String(person.id), voteCountGte: 80 }).then(
        (movies) => {
          movies.slice(0, 6).forEach((movie) => {
            addCandidate(pool, movie, 1.2, `Par ${person.name}`);
          });
        },
      ),
    );
  }

  // 5. Filet de sécurité : tendances et classiques plébiscités.
  tasks.push(
    getTrending("week")
      .then((movies) => {
        movies.slice(0, 12).forEach((movie) => {
          addCandidate(pool, movie, 0.35, "Populaire en ce moment");
        });
      })
      .catch(() => undefined),
  );
  if (!profile.isRich) {
    tasks.push(
      getTopRated()
        .then((movies) => {
          movies.slice(0, 16).forEach((movie) => {
            addCandidate(pool, movie, 0.5, "Incontournable très bien noté");
          });
        })
        .catch(() => undefined),
    );
  }

  await Promise.all(tasks);
  return pool;
}

/** Applique le profil de goût au pool de candidats et classe le résultat. */
function rank(
  pool: Map<number, Candidate>,
  profile: TasteProfile,
  excluded: Set<number>,
  options: RecommendationOptions,
): Candidate[] {
  const affinity = genreAffinity(profile);
  const favouriteDecade = profile.decades[0]?.decade ?? null;

  const ranked: Candidate[] = [];

  for (const candidate of pool.values()) {
    if (excluded.has(candidate.movie.id)) continue;

    const genreIds =
      candidate.movie.genre_ids ?? candidate.movie.genres?.map((genre) => genre.id) ?? [];
    if (options.genreId && !genreIds.includes(options.genreId)) continue;

    let score = candidate.score + qualityScore(candidate.movie);

    // Affinité de genre : moyenne pondérée pour ne pas avantager les films
    // affichés avec beaucoup de genres.
    if (genreIds.length > 0) {
      const total = genreIds.reduce((sum, id) => sum + (affinity.get(id) ?? 0), 0);
      score += (total / Math.sqrt(genreIds.length)) * 1.8;
    }

    if (favouriteDecade !== null && decadeOf(candidate.movie) === favouriteDecade) {
      score += 0.25;
    }

    // Un candidat soutenu par plusieurs signaux différents est plus sur.
    score += Math.min(0.8, (candidate.reasons.size - 1) * 0.3);

    ranked.push({ ...candidate, score });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

function matchesProviders(providers: WatchProviders, wanted: number[]): boolean {
  if (wanted.length === 0) return true;
  const available = [...providers.flatrate, ...providers.free, ...providers.ads];
  return available.some((provider) => wanted.includes(provider.provider_id));
}

/**
 * Recommandations personnalisées.
 *
 * La stratégie combine quatre signaux : les suggestions TMDB issues des films
 * que l'utilisateur a le mieux notés, ses genres de prédilection, les thèmes
 * qui reviennent dans sa bibliothèque et les personnes (réalisateurs, acteurs)
 * qu'il retrouve souvent. Chaque candidat est ensuite repondéré par la qualité
 * objective du film et par l'affinité de genre calculée sur tout l'historique.
 */
export async function getRecommendations(
  options: RecommendationOptions = {},
): Promise<{ items: ScoredMovie[]; profile: TasteProfile }> {
  const limit = options.limit ?? 24;
  const [entries, settings] = await Promise.all([getAllEntries(), getSettings()]);
  const profile = buildProfile(entries);

  const excluded = new Set<number>(
    entries
      .filter((entry: LibraryEntry) => entry.status === "seen" || entry.status === "dismissed")
      .map((entry) => entry.id),
  );

  const pool = await collectCandidates(profile, options);
  const ranked = rank(pool, profile, excluded, options);

  const onlyMyProviders = options.onlyMyProviders ?? settings.onlyMyProviders;
  const wanted = settings.providers ?? [];
  const shortlist = ranked.slice(0, onlyMyProviders && wanted.length ? limit * 3 : limit);

  // Les plateformes ne sont récupérées que pour la tête de classement.
  const withProviders = await Promise.all(
    shortlist.slice(0, PROVIDER_LOOKUP_LIMIT).map(async (candidate) => ({
      candidate,
      providers: await getWatchProviders(candidate.movie.id),
    })),
  );

  const results: ScoredMovie[] = [];
  for (const { candidate, providers } of withProviders) {
    if (onlyMyProviders && wanted.length && !matchesProviders(providers, wanted)) continue;
    results.push({
      movie: candidate.movie,
      score: Number(candidate.score.toFixed(3)),
      reasons: [...candidate.reasons].slice(0, 3),
      providers,
    });
    if (results.length >= limit) break;
  }

  // Complément sans info de plateforme si le filtre a trop réduit la liste.
  if (results.length < limit && !onlyMyProviders) {
    const known = new Set(results.map((item) => item.movie.id));
    for (const candidate of shortlist) {
      if (results.length >= limit) break;
      if (known.has(candidate.movie.id)) continue;
      results.push({
        movie: candidate.movie,
        score: Number(candidate.score.toFixed(3)),
        reasons: [...candidate.reasons].slice(0, 3),
        providers: null,
      });
    }
  }

  return { items: results, profile };
}
