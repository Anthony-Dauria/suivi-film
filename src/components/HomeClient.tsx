"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MovieGrid, MovieRow } from "@/components/MovieGrid";
import { SearchLauncher } from "@/components/SearchLauncher";
import { EmptyState, ErrorNotice, SectionHeader, StatTile } from "@/components/ui";
import { entryToCard, summaryToCard } from "@/lib/cards";
import { formatRating, formatTotalRuntime } from "@/lib/format";
import { useEntries, useIsConfigured } from "@/lib/hooks";
import { getRecommendations, type ScoredMovie } from "@/lib/reco";
import { computeStats } from "@/lib/stats";
import { getTrending } from "@/lib/tmdb";
import type { TmdbMovieSummary } from "@/lib/types";

export function HomeClient() {
  const entries = useEntries();
  const configured = useIsConfigured();
  const stats = useMemo(() => computeStats(entries), [entries]);

  const [recommendations, setRecommendations] = useState<ScoredMovie[]>([]);
  const [trending, setTrending] = useState<TmdbMovieSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Empreinte de la bibliothèque : on ne relance le calcul que si elle a changé.
  const signature = useMemo(
    () =>
      entries
        .filter((entry) => entry.status !== "watchlist")
        .map((entry) => `${entry.id}:${entry.status}:${entry.rating ?? ""}:${entry.favorite}`)
        .sort()
        .join("|"),
    [entries],
  );

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const [reco, trend] = await Promise.allSettled([
        getRecommendations({ limit: 12 }),
        getTrending("week"),
      ]);
      if (cancelled) return;
      if (reco.status === "fulfilled") setRecommendations(reco.value.items);
      else setError(reco.reason instanceof Error ? reco.reason.message : null);
      if (trend.status === "fulfilled") setTrending(trend.value.slice(0, 12));
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [configured, signature]);

  const watchlist = entries.filter((entry) => entry.status === "watchlist").slice(0, 12);
  const recentlySeen = entries.filter((entry) => entry.status === "seen").slice(0, 12);

  return (
    <div className="space-y-10">
      {/* Sur téléphone, l'accueil va droit au but : recherche puis contenu.
          Le texte de présentation n'apparaît qu'à partir d'une tablette. */}
      <section className="card overflow-hidden px-4 py-5 sm:px-10 sm:py-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-500">
          Votre carnet de films
        </p>
        <h1 className="mt-1.5 max-w-2xl text-xl font-bold tracking-tight sm:mt-2 sm:text-4xl">
          Notez ce que vous avez vu, découvrez quoi regarder ensuite.
        </h1>
        <p className="mt-3 hidden max-w-2xl text-sm text-mist-300 sm:block">
          Chaque film dispose d&apos;une fiche complète — synopsis, casting, bande-annonce, note du
          public — et de la liste des plateformes où le voir. Plus vous notez, plus les
          recommandations vous ressemblent.
        </p>
        <div className="mt-4 max-w-xl sm:mt-6">
          <SearchLauncher />
        </div>
      </section>

      <section aria-label="Statistiques rapides">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <StatTile
            hint={stats.ratedCount > 0 ? `${stats.ratedCount} notés` : "Aucune note"}
            label="Films vus"
            value={String(stats.seen)}
          />
          <StatTile hint="Dans ma liste" label="À voir" value={String(stats.watchlist)} />
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

      {error && <ErrorNotice message={error} />}

      {!configured ? (
        <EmptyState
          action={{ href: "/reglages", label: "Configurer ma clé" }}
          description="Collez votre clé API TMDB (gratuite) pour activer la recherche, les fiches détaillées, les plateformes de streaming et les recommandations. Elle reste sur cet appareil."
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
            href="/bibliotheque/?statut=watchlist"
            subtitle="Les films que vous avez mis de côté"
            title="À voir prochainement"
          />
          <MovieRow movies={watchlist.map(entryToCard)} />
        </section>
      )}

      {(recommendations.length > 0 || loading) && configured && (
        <section>
          <SectionHeader
            href="/recommandations"
            subtitle="Calculées à partir de vos notes, genres et réalisateurs favoris"
            title="Sélection pour vous"
          />
          {recommendations.length > 0 ? (
            <MovieGrid
              movies={recommendations.map((item) => ({
                ...summaryToCard(item.movie),
                reasons: item.reasons,
                providers: item.providers,
              }))}
            />
          ) : (
            <p className="text-sm text-mist-400">Calcul des recommandations…</p>
          )}
        </section>
      )}

      {recentlySeen.length > 0 && (
        <section>
          <SectionHeader
            href="/bibliotheque/?statut=seen"
            subtitle="Vos derniers ajouts"
            title="Vu récemment"
          />
          <MovieRow movies={recentlySeen.map(entryToCard)} />
        </section>
      )}

      {trending.length > 0 && (
        <section>
          <SectionHeader subtitle="Cette semaine sur TMDB" title="Tendances" />
          <MovieRow movies={trending.map(summaryToCard)} />
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
