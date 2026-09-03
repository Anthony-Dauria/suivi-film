"use client";

import Link from "next/link";
import { useMemo } from "react";

import { BarList } from "@/components/BarList";
import { RatingStars } from "@/components/RatingStars";
import { EmptyState, SectionHeader, StatTile } from "@/components/ui";
import { formatRating, formatTotalRuntime, releaseYear } from "@/lib/format";
import { useEntries } from "@/lib/hooks";
import { computeStats } from "@/lib/stats";

export function StatsClient() {
  const entries = useEntries();
  const stats = useMemo(() => computeStats(entries), [entries]);

  if (stats.seen === 0) {
    return (
      <EmptyState
        action={{ href: "/recherche", label: "Ajouter un film" }}
        description="Marquez quelques films comme vus : vous verrez apparaitre ici vos genres de prédilection, votre temps de visionnage et la répartition de vos notes."
        title="Aucune statistique pour l'instant"
      />
    );
  }

  const maxRating = Math.max(1, ...stats.ratingHistogram.map((bucket) => bucket.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Statistiques</h1>
        <p className="mt-1 text-sm text-mist-400">
          Une lecture de vos habitudes de spectateur, calculée sur les films marqués comme vus.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Films vus" value={String(stats.seen)} hint={`${stats.ratedCount} notes`} />
        <StatTile
          hint="Revisionnages inclus"
          label="Temps cumulé"
          value={formatTotalRuntime(stats.totalMinutes)}
        />
        <StatTile
          hint={`${stats.favorites} coup${stats.favorites > 1 ? "s" : ""} de cœur`}
          label="Note moyenne"
          value={formatRating(stats.averageRating)}
        />
        <StatTile
          hint={formatTotalRuntime(stats.watchlistMinutes)}
          label="Dans ma liste"
          value={String(stats.watchlist)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Répartition de mes notes</h2>
          <div className="flex h-40 items-end gap-1.5">
            {stats.ratingHistogram.map((bucket) => (
              <div className="flex flex-1 flex-col items-center gap-1" key={bucket.rating}>
                <span className="text-[10px] tabular-nums text-mist-400">
                  {bucket.count || ""}
                </span>
                <div
                  className="w-full rounded-t bg-gold-500/80"
                  style={{ height: `${(bucket.count / maxRating) * 100}%`, minHeight: 2 }}
                  title={`${bucket.count} film(s) note(s) ${bucket.rating}/5`}
                />
                <span className="text-[10px] text-mist-400">
                  {bucket.rating.toString().replace(".", ",")}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Genres les plus vus</h2>
          <BarList
            items={stats.topGenres.map((genre) => ({ label: genre.name, value: genre.count }))}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Décennies de sortie</h2>
          <BarList
            items={stats.perDecade.map((item) => ({
              label: `Années ${item.decade}`,
              value: item.count,
            }))}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Films vus par année</h2>
          <BarList
            items={stats.perYearWatched.map((item) => ({
              label: String(item.year),
              value: item.count,
            }))}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Réalisateurs récurrents</h2>
          <BarList
            items={stats.topDirectors.map((person) => ({
              label: person.name,
              value: person.count,
            }))}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Acteurs les plus vus</h2>
          <BarList
            items={stats.topActors.map((person) => ({ label: person.name, value: person.count }))}
          />
        </section>
      </div>

      <section>
        <SectionHeader
          href="/bibliotheque/?statut=favorites"
          linkLabel="Voir mes coups de cœur"
          subtitle="Vos meilleures notes"
          title="Le haut du panier"
        />
        <ul className="card divide-y divide-ink-800">
          {stats.bestRated.map((entry) => (
            <li className="flex items-center gap-3 px-4 py-3" key={entry.id}>
              <div className="min-w-0 flex-1">
                <Link className="text-sm font-medium hover:text-gold-400" href={`/film/?id=${entry.id}`}>
                  {entry.movie.title}
                </Link>
                <p className="text-xs text-mist-400">
                  {releaseYear(entry.movie.releaseDate)}
                  {entry.movie.directors?.[0] ? ` · ${entry.movie.directors[0].name}` : ""}
                </p>
              </div>
              <RatingStars readOnly size="sm" value={entry.rating} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
