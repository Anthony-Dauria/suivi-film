"use client";

import { useCallback, useEffect, useState } from "react";

import { MediaGrid } from "@/components/MediaGrid";
import { TypeFilter, type TypeChoice } from "@/components/TypeFilter";
import { Chip, EmptyState, ErrorNotice, SectionHeader } from "@/components/ui";
import { summaryToCard } from "@/lib/cards";
import { genreList } from "@/lib/genres";
import { useEntries, useIsConfigured, useSettings } from "@/lib/hooks";
import { getRecommendations, type ScoredMedia } from "@/lib/reco";
import type { TasteProfile } from "@/lib/profile";

const DURATIONS = [
  { value: 0, label: "Toutes durées" },
  { value: 100, label: "Moins d'1 h 40" },
  { value: 120, label: "Moins de 2 h" },
  { value: 150, label: "Moins de 2 h 30" },
];

export function RecommendationsClient() {
  const configured = useIsConfigured();
  const settings = useSettings();
  const entries = useEntries();

  const [type, setType] = useState<TypeChoice>("all");
  const [genreId, setGenreId] = useState(0);
  const [maxRuntime, setMaxRuntime] = useState(0);
  const [onlyMyProviders, setOnlyMyProviders] = useState(settings.onlyMyProviders);
  const [items, setItems] = useState<ScoredMedia[]>([]);
  const [profile, setProfile] = useState<TasteProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const compute = useCallback(async () => {
    if (!configured) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getRecommendations({
        limit: 30,
        mediaType: type === "all" ? undefined : type,
        genreId: genreId || undefined,
        maxRuntime: maxRuntime || undefined,
        onlyMyProviders,
      });
      setItems(result.items);
      setProfile(result.profile);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de calculer les recommandations pour le moment.",
      );
    } finally {
      setLoading(false);
    }
  }, [configured, type, genreId, maxRuntime, onlyMyProviders]);

  // Premier calcul au chargement, puis à chaque changement de filtre.
  useEffect(() => {
    void compute();
  }, [compute]);

  if (!configured) {
    return (
      <EmptyState
        action={{ href: "/reglages", label: "Configurer ma clé" }}
        description="Les recommandations s'appuient sur l'API TMDB : renseignez votre clé pour les activer."
        title="Clé API TMDB manquante"
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Recommandations pour vous</h1>
        <p className="mt-1 max-w-3xl text-sm text-mist-400">
          Chaque proposition est calculée à partir de votre bibliothèque : films et séries que vous
          avez le mieux notés, genres qui reviennent, thèmes récurrents, réalisateurs, créateurs et
          acteurs que vous suivez. La raison de chaque suggestion est indiquée sous l&apos;affiche.
        </p>
      </div>

      {profile && profile.seenCount > 0 && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-mist-400">
            Votre profil de goût
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.genres.slice(0, 5).map((genre) => (
              <Chip key={`genre-${genre.id}`}>
                {genre.name} · {genre.count} film{genre.count > 1 ? "s" : ""}
              </Chip>
            ))}
            {profile.people.slice(0, 4).map((person) => (
              <Chip key={`person-${person.id}`}>{person.name}</Chip>
            ))}
            {profile.keywords.slice(0, 4).map((keyword) => (
              <Chip key={`keyword-${keyword.id}`}>{keyword.name}</Chip>
            ))}
          </div>
          {!profile.isRich && (
            <p className="mt-3 text-xs text-mist-400">
              Notez au moins trois films pour que les suggestions deviennent réellement
              personnalisées. En attendant, elles s&apos;appuient sur les incontournables.
            </p>
          )}
        </section>
      )}

      <div className="card grid grid-cols-2 items-end gap-3 p-4 sm:flex sm:flex-wrap">
        <div className="col-span-2 sm:col-span-1">
          <TypeFilter
            onChange={(next) => {
              setType(next);
              // Un genre de film n'a pas de sens pour une série.
              setGenreId(0);
            }}
            value={type}
          />
        </div>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400">
          Genre
          <select
            className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm normal-case text-mist-200"
            onChange={(event) => setGenreId(Number(event.target.value))}
            value={genreId}
          >
            <option value={0}>Tous</option>
            {genreList(type === "tv" ? "tv" : "movie").map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label
          className={`flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400 ${
            type === "tv" ? "hidden" : ""
          }`}
        >
          Durée
          <select
            className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm normal-case text-mist-200"
            onChange={(event) => setMaxRuntime(Number(event.target.value))}
            value={maxRuntime}
          >
            {DURATIONS.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </select>
        </label>

        <label className="col-span-2 flex items-center gap-2 text-sm text-mist-300 sm:pb-2">
          <input
            checked={onlyMyProviders}
            className="size-4 accent-[var(--color-gold-500)]"
            onChange={(event) => setOnlyMyProviders(event.target.checked)}
            type="checkbox"
          />
          Uniquement sur mes plateformes
          {settings.providers.length === 0 && (
            <span className="text-xs text-mist-400">(aucune plateforme choisie)</span>
          )}
        </label>

        <button
          className="col-span-2 min-h-11 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60 sm:col-span-1 sm:ml-auto"
          disabled={loading}
          onClick={() => void compute()}
          type="button"
        >
          {loading ? "Calcul…" : "Recalculer"}
        </button>
      </div>

      {error && <ErrorNotice message={error} />}

      {loading && items.length === 0 && (
        <p className="text-sm text-mist-400">
          Analyse de votre bibliothèque et interrogation de TMDB…
        </p>
      )}

      {!loading && !error && items.length === 0 ? (
        <EmptyState
          action={{ href: "/recherche", label: "Ajouter des titres" }}
          description={
            entries.length === 0
              ? "Ajoutez et notez quelques films ou séries pour que le moteur puisse apprendre vos goûts."
              : "Aucun titre recommandé ne correspond à ces filtres. Élargissez-les, ou ajoutez des plateformes dans les réglages."
          }
          title="Pas encore de suggestion"
        />
      ) : (
        items.length > 0 && (
          <section>
            <SectionHeader
              subtitle={`${items.length} titre${items.length > 1 ? "s" : ""} sélectionné${items.length > 1 ? "s" : ""} pour vous`}
              title="Sélection"
            />
            <MediaGrid
              items={items.map((item) => ({
                ...summaryToCard(item.media),
                reasons: item.reasons,
                providers: item.providers,
              }))}
            />
          </section>
        )
      )}
    </div>
  );
}
