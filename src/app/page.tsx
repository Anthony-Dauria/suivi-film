import Link from "next/link";

import { MovieGrid, MovieRow } from "@/components/MovieGrid";
import { SearchLauncher } from "@/components/SearchLauncher";
import { EmptyState, ErrorNotice, SectionHeader, StatTile } from "@/components/ui";
import { formatRating, formatTotalRuntime } from "@/lib/format";
import { getRecommendations } from "@/lib/reco";
import { computeStats } from "@/lib/stats";
import { getAllEntries } from "@/lib/store";
import { TmdbError, getTrending, isConfigured } from "@/lib/tmdb";
import type { LibraryEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

function entryToCard(entry: LibraryEntry) {
  return {
    id: entry.id,
    title: entry.movie.title,
    posterPath: entry.movie.posterPath,
    releaseDate: entry.movie.releaseDate,
    voteAverage: entry.movie.voteAverage,
    status: entry.status,
    rating: entry.rating,
    favorite: entry.favorite,
  };
}

export default async function HomePage() {
  const entries = await getAllEntries();
  const stats = computeStats(entries);
  const configured = isConfigured();

  const watchlist = entries.filter((entry) => entry.status === "watchlist").slice(0, 12);
  const recentlySeen = entries.filter((entry) => entry.status === "seen").slice(0, 12);

  let recommendations: Awaited<ReturnType<typeof getRecommendations>>["items"] = [];
  let trending: Awaited<ReturnType<typeof getTrending>> = [];
  let loadError: string | null = null;

  if (configured) {
    const [recoResult, trendingResult] = await Promise.allSettled([
      getRecommendations({ limit: 12 }),
      getTrending("week"),
    ]);
    if (recoResult.status === "fulfilled") recommendations = recoResult.value.items;
    else if (recoResult.reason instanceof TmdbError) loadError = recoResult.reason.message;
    if (trendingResult.status === "fulfilled") trending = trendingResult.value.slice(0, 12);
  }

  const known = new Map(entries.map((entry) => [entry.id, entry]));

  return (
    <div className="space-y-10">
      <section className="card overflow-hidden px-6 py-8 sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          Votre carnet de films
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
          Notez ce que vous avez vu, découvrez quoi regarder ensuite.
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-mist-300">
          Chaque film dispose d&apos;une fiche complète — synopsis, casting, bande-annonce, note du
          public — et de la liste des plateformes où le voir. Plus vous notez, plus les
          recommandations vous ressemblent.
        </p>
        <div className="mt-6 max-w-xl">
          <SearchLauncher />
        </div>
      </section>

      <section aria-label="Statistiques rapides">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            hint={stats.ratedCount > 0 ? `${stats.ratedCount} notes` : "Aucune note"}
            label="Films vus"
            value={String(stats.seen)}
          />
          <StatTile label="À voir" value={String(stats.watchlist)} hint="Dans ma liste" />
          <StatTile
            hint="Revisionnages inclus"
            label="Temps de visionnage"
            value={formatTotalRuntime(stats.totalMinutes)}
          />
          <StatTile
            hint={stats.topGenres[0] ? `Genre favori : ${stats.topGenres[0].name}` : undefined}
            label="Note moyenne"
            value={formatRating(stats.averageRating)}
          />
        </div>
      </section>

      {loadError && <ErrorNotice message={loadError} />}

      {!configured ? (
        <EmptyState
          action={{ href: "/reglages", label: "Voir la marche à suivre" }}
          description="Ajoutez votre clé API TMDB pour activer la recherche, les fiches détaillées, les plateformes de streaming et les recommandations."
          title="Une dernière étape avant de commencer"
        />
      ) : entries.length === 0 ? (
        <EmptyState
          action={{ href: "/recherche", label: "Ajouter mon premier film" }}
          description="Ajoutez les films que vous avez déjà vus et notez-les : le moteur de recommandation s'appuie sur vos goûts pour vous proposer la suite."
          title="Votre bibliothèque est vide"
        />
      ) : null}

      {watchlist.length > 0 && (
        <section>
          <SectionHeader
            href="/bibliotheque?statut=watchlist"
            subtitle="Les films que vous avez mis de côté"
            title="À voir prochainement"
          />
          <MovieRow movies={watchlist.map(entryToCard)} />
        </section>
      )}

      {recommendations.length > 0 && (
        <section>
          <SectionHeader
            href="/recommandations"
            subtitle="Calculées à partir de vos notes, genres et réalisateurs favoris"
            title="Sélection pour vous"
          />
          <MovieGrid
            movies={recommendations.map((item) => ({
              id: item.movie.id,
              title: item.movie.title,
              posterPath: item.movie.poster_path,
              releaseDate: item.movie.release_date,
              voteAverage: item.movie.vote_average,
              status: known.get(item.movie.id)?.status ?? null,
              reasons: item.reasons,
              providers: item.providers,
            }))}
          />
        </section>
      )}

      {recentlySeen.length > 0 && (
        <section>
          <SectionHeader
            href="/bibliotheque?statut=seen"
            subtitle="Vos derniers ajouts"
            title="Vu récemment"
          />
          <MovieRow movies={recentlySeen.map(entryToCard)} />
        </section>
      )}

      {trending.length > 0 && (
        <section>
          <SectionHeader subtitle="Cette semaine sur TMDB" title="Tendances" />
          <MovieRow
            movies={trending.map((movie) => ({
              id: movie.id,
              title: movie.title,
              posterPath: movie.poster_path,
              releaseDate: movie.release_date,
              voteAverage: movie.vote_average,
              status: known.get(movie.id)?.status ?? null,
            }))}
          />
        </section>
      )}

      <p className="text-center text-sm text-mist-400">
        Besoin d&apos;un tableau de bord détaillé ?{" "}
        <Link className="text-gold-400 underline-offset-2 hover:underline" href="/statistiques">
          Consulter mes statistiques
        </Link>
      </p>
    </div>
  );
}
