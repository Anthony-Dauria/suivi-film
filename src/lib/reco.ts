import { buildProfile, genreAffinity, type TasteProfile } from "./profile";
import { entryKey, getAllEntries, getSettings } from "./store";
import { discover, getRelated, getTopRated, getTrending, getWatchProviders } from "./tmdb";
import type { MediaSummary, MediaType, WatchProviders } from "./types";

export interface ScoredMedia {
  media: MediaSummary;
  score: number;
  reasons: string[];
  providers: WatchProviders | null;
}

export interface RecommendationOptions {
  /** Nombre d'œuvres renvoyées. */
  limit?: number;
  /** Restreint aux œuvres disponibles sur les plateformes de l'utilisateur. */
  onlyMyProviders?: boolean;
  /** Ne garder que les films, ou que les séries. */
  mediaType?: MediaType;
  /** Ne garder que ce genre TMDB (interprété selon le type de l'œuvre). */
  genreId?: number;
  /** Durée maximale en minutes (filtre appliqué côté TMDB pour les découvertes). */
  maxRuntime?: number;
}

interface Candidate {
  media: MediaSummary;
  score: number;
  reasons: Set<string>;
}

/** Nombre d'œuvres dont on vérifie les plateformes de streaming. */
const PROVIDER_LOOKUP_LIMIT = 30;

function addCandidate(
  pool: Map<string, Candidate>,
  media: MediaSummary,
  score: number,
  reason: string | null,
): void {
  if (!media || typeof media.id !== "number") return;
  const key = entryKey(media.mediaType, media.id);
  const existing = pool.get(key);
  if (existing) {
    existing.score += score;
    if (reason) existing.reasons.add(reason);
    return;
  }
  pool.set(key, { media, score, reasons: new Set(reason ? [reason] : []) });
}

/** Bonus de qualité : note TMDB fiable + notoriété, avec rendements décroissants. */
function qualityScore(media: MediaSummary): number {
  const votes = media.voteCount ?? 0;
  if (votes < 50) return -0.5;
  const confidence = Math.min(1, Math.log10(votes) / 4);
  const quality = ((media.voteAverage ?? 0) - 6.2) * 0.9 * confidence;
  const notoriety = Math.min(0.6, Math.log10((media.popularity ?? 0) + 1) / 5);
  return quality + notoriety;
}

function decadeOf(media: MediaSummary): number | null {
  const year = Number(media.releaseDate?.slice(0, 4));
  return Number.isFinite(year) ? Math.floor(year / 10) * 10 : null;
}

/** Collecte les candidats à partir des œuvres aimées et de requêtes ciblées. */
async function collectCandidates(profile: TasteProfile, options: RecommendationOptions) {
  const pool = new Map<string, Candidate>();
  const types: MediaType[] = options.mediaType ? [options.mediaType] : ["movie", "tv"];

  const topLiked = profile.liked
    .filter((item) => item.weight > 0.2)
    .filter((item) => !options.mediaType || item.entry.mediaType === options.mediaType)
    .slice(0, 8);
  const topKeywords = profile.keywords.filter((keyword) => keyword.score > 0.8).slice(0, 4);
  const topPeople = profile.people.filter((person) => person.score > 1).slice(0, 4);

  const tasks: Promise<void>[] = [];

  // 1. « Parce que vous avez aimé… » : le signal le plus fort.
  for (const { entry, weight } of topLiked) {
    const reason = `Parce que vous avez aimé « ${entry.media.title} »`;
    tasks.push(
      getRelated(entry.mediaType, entry.id, "recommendations").then((items) => {
        items.slice(0, 12).forEach((media, index) => {
          addCandidate(pool, media, weight * (3 - index * 0.12), reason);
        });
      }),
      getRelated(entry.mediaType, entry.id, "similar").then((items) => {
        items.slice(0, 8).forEach((media, index) => {
          addCandidate(pool, media, weight * (1.6 - index * 0.08), reason);
        });
      }),
    );
  }

  for (const mediaType of types) {
    const genresForType = profile.genres
      .filter((genre) => genre.mediaType === mediaType && genre.score > 0)
      .slice(0, 3);
    const dislikedForType = profile.genres
      .filter((genre) => genre.mediaType === mediaType && genre.score < -0.8)
      .slice(0, 3);

    const commonDiscover = {
      withoutGenres: dislikedForType.map((genre) => genre.id).join(","),
      // La durée ne filtre que les films : c'est celle d'un épisode pour une série.
      runtimeLte: mediaType === "movie" ? options.maxRuntime : undefined,
      voteCountGte: 150,
    };

    // 2. Genres de prédilection.
    for (const genre of genresForType) {
      tasks.push(
        discover(mediaType, {
          ...commonDiscover,
          withGenres: String(genre.id),
          sortBy: "vote_average.desc",
          voteCountGte: mediaType === "movie" ? 800 : 300,
        }).then((items) => {
          items.slice(0, 12).forEach((media) => {
            addCandidate(pool, media, 1.1, `Vous aimez le genre ${genre.name.toLowerCase()}`);
          });
        }),
        discover(mediaType, {
          ...commonDiscover,
          withGenres: String(genre.id),
          sortBy: "popularity.desc",
          releaseDateGte: `${new Date().getFullYear() - 3}-01-01`,
        }).then((items) => {
          items.slice(0, 8).forEach((media) => {
            addCandidate(pool, media, 0.8, `Récent en ${genre.name.toLowerCase()}`);
          });
        }),
      );
    }

    // 3. Thèmes récurrents (mots-clés TMDB, communs aux films et aux séries).
    for (const keyword of topKeywords) {
      tasks.push(
        discover(mediaType, {
          ...commonDiscover,
          withKeywords: String(keyword.id),
          sortBy: "vote_average.desc",
          voteCountGte: 300,
        }).then((items) => {
          items.slice(0, 6).forEach((media) => {
            addCandidate(pool, media, 1, `Thème récurrent chez vous : ${keyword.name}`);
          });
        }),
      );
    }

    // 4. Réalisateurs, créateurs et acteurs favoris.
    for (const person of topPeople) {
      tasks.push(
        discover(mediaType, {
          ...commonDiscover,
          withCast: String(person.id),
          voteCountGte: 80,
        }).then((items) => {
          items.slice(0, 6).forEach((media) => {
            addCandidate(pool, media, 1.2, `Avec ${person.name}`);
          });
        }),
      );
      if (mediaType === "movie") {
        tasks.push(
          discover("movie", { ...commonDiscover, withCrew: String(person.id), voteCountGte: 80 })
            .then((items) => {
              items.slice(0, 6).forEach((media) => {
                addCandidate(pool, media, 1.2, `Par ${person.name}`);
              });
            }),
        );
      }
    }

    // 5. Filet de sécurité pour un profil encore mince.
    if (!profile.isRich) {
      tasks.push(
        getTopRated(mediaType)
          .then((items) => {
            items.slice(0, 12).forEach((media) => {
              addCandidate(pool, media, 0.5, "Incontournable très bien noté");
            });
          })
          .catch(() => undefined),
      );
    }
  }

  tasks.push(
    getTrending(options.mediaType ?? "all")
      .then((items) => {
        items.slice(0, 14).forEach((media) => {
          addCandidate(pool, media, 0.35, "Populaire en ce moment");
        });
      })
      .catch(() => undefined),
  );

  await Promise.all(tasks);
  return pool;
}

/** Applique le profil de goût au pool de candidats et classe le résultat. */
function rank(
  pool: Map<string, Candidate>,
  profile: TasteProfile,
  excluded: Set<string>,
  options: RecommendationOptions,
): Candidate[] {
  const affinity = genreAffinity(profile);
  const favouriteDecade = profile.decades[0]?.decade ?? null;

  const ranked: Candidate[] = [];

  for (const [key, candidate] of pool) {
    if (excluded.has(key)) continue;
    if (options.mediaType && candidate.media.mediaType !== options.mediaType) continue;

    const genreIds = candidate.media.genreIds ?? [];
    if (options.genreId && !genreIds.includes(options.genreId)) continue;

    let score = candidate.score + qualityScore(candidate.media);

    // Affinité de genre : moyenne pondérée pour ne pas avantager les œuvres
    // affichées avec beaucoup de genres.
    if (genreIds.length > 0) {
      const total = genreIds.reduce(
        (sum, id) => sum + (affinity.get(`${candidate.media.mediaType}:${id}`) ?? 0),
        0,
      );
      score += (total / Math.sqrt(genreIds.length)) * 1.8;
    }

    if (favouriteDecade !== null && decadeOf(candidate.media) === favouriteDecade) {
      score += 0.25;
    }

    // Un candidat soutenu par plusieurs signaux différents est plus sûr.
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
 * Recommandations personnalisées, films et séries confondus.
 *
 * La stratégie combine quatre signaux : les suggestions TMDB issues des œuvres
 * que l'utilisateur a le mieux notées, ses genres de prédilection, les thèmes
 * qui reviennent dans sa bibliothèque et les personnes (réalisateurs, créateurs,
 * acteurs) qu'il retrouve souvent. Chaque candidat est ensuite repondéré par sa
 * qualité objective et par l'affinité de genre calculée sur tout l'historique.
 */
export async function getRecommendations(
  options: RecommendationOptions = {},
): Promise<{ items: ScoredMedia[]; profile: TasteProfile }> {
  const limit = options.limit ?? 24;
  const entries = getAllEntries();
  const settings = getSettings();
  const profile = buildProfile(entries);

  const excluded = new Set(
    entries
      .filter((entry) => entry.status === "seen" || entry.status === "dismissed")
      .map((entry) => entryKey(entry.mediaType, entry.id)),
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
      providers: await getWatchProviders(candidate.media.mediaType, candidate.media.id),
    })),
  );

  const results: ScoredMedia[] = [];
  for (const { candidate, providers } of withProviders) {
    if (onlyMyProviders && wanted.length && !matchesProviders(providers, wanted)) continue;
    results.push({
      media: candidate.media,
      score: Number(candidate.score.toFixed(3)),
      reasons: [...candidate.reasons].slice(0, 3),
      providers,
    });
    if (results.length >= limit) break;
  }

  // Complément sans info de plateforme si le filtre a trop réduit la liste.
  if (results.length < limit && !onlyMyProviders) {
    const known = new Set(results.map((item) => entryKey(item.media.mediaType, item.media.id)));
    for (const candidate of shortlist) {
      if (results.length >= limit) break;
      const key = entryKey(candidate.media.mediaType, candidate.media.id);
      if (known.has(key)) continue;
      results.push({
        media: candidate.media,
        score: Number(candidate.score.toFixed(3)),
        reasons: [...candidate.reasons].slice(0, 3),
        providers: null,
      });
    }
  }

  return { items: results, profile };
}
