"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { CastRow } from "@/components/CastRow";
import { BackIcon, PlayIcon } from "@/components/icons";
import { MediaRow } from "@/components/MediaGrid";
import { Poster } from "@/components/Poster";
import { ProviderSection } from "@/components/ProviderSection";
import { ScoreRing } from "@/components/ScoreRing";
import { TrackingPanel } from "@/components/TrackingPanel";
import { Trailer } from "@/components/Trailer";
import { Chip, EmptyState, ErrorNotice, SectionHeader } from "@/components/ui";
import { summaryToCard } from "@/lib/cards";
import {
  formatDate,
  formatMoney,
  formatRuntime,
  releaseYear,
  translateStatus,
} from "@/lib/format";
import { useIsConfigured, useSettings } from "@/lib/hooks";
import { backdropUrl, getDetails } from "@/lib/tmdb";
import type { MediaDetails, MediaType } from "@/lib/types";

/** Fiche complète d'un film ou d'une série, selon la route qui la rend. */
export function MediaClient({ mediaType }: { mediaType: MediaType }) {
  const router = useRouter();
  const configured = useIsConfigured();
  const settings = useSettings();
  const rawId = useSearchParams().get("id");
  const id = Number(rawId);
  const valid = Number.isInteger(id) && id > 0;
  const isSeries = mediaType === "tv";

  const [details, setDetails] = useState<MediaDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!valid || !configured) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDetails(null);

    getDetails(mediaType, id)
      .then((data) => {
        if (!cancelled) setDetails(data);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : "Impossible de charger cette fiche.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mediaType, id, valid, configured, settings.language, settings.region]);

  if (!valid) {
    return (
      <EmptyState
        action={{ href: "/recherche", label: "Rechercher" }}
        description="L'adresse de cette fiche est incomplète : aucun identifiant n'a été fourni."
        title={isSeries ? "Série introuvable" : "Film introuvable"}
      />
    );
  }

  if (!configured) {
    return (
      <EmptyState
        action={{ href: "/reglages", label: "Configurer ma clé" }}
        description="Les fiches sont récupérées auprès de TMDB : renseignez votre clé pour les consulter."
        title="Clé API TMDB manquante"
      />
    );
  }

  if (error) return <ErrorNotice message={error} />;

  if (loading || !details) {
    return <p className="py-16 text-center text-sm text-mist-400">Chargement de la fiche…</p>;
  }

  const backdrop = backdropUrl(details.backdropPath);

  // Une série s'étale sur plusieurs années : « 2011 – 2019 », ou « 2011 – … »
  // tant qu'elle est en production.
  const start = releaseYear(details.releaseDate);
  const end = releaseYear(details.lastAirDate);
  const yearRange =
    isSeries && start !== "—"
      ? details.inProduction
        ? `${start} – …`
        : end !== "—" && end !== start
          ? `${start} – ${end}`
          : start
      : start;

  const suggestions = [...details.recommendations, ...details.similar]
    .filter(
      (item, index, list) =>
        list.findIndex(
          (other) => other.id === item.id && other.mediaType === item.mediaType,
        ) === index,
    )
    .slice(0, 18);

  const seasons = details.seasonCount ?? 0;
  const episodes = details.episodeCount ?? 0;

  const facts: { label: string; value: string | null }[] = [
    {
      label: "Titre original",
      value: details.originalTitle !== details.title ? details.originalTitle : null,
    },
    {
      label: isSeries ? "Première diffusion" : "Sortie",
      value: formatDate(details.releaseDate),
    },
    ...(isSeries
      ? [
          {
            label: "Dernière diffusion",
            value: details.inProduction ? "En cours" : formatDate(details.lastAirDate),
          },
          {
            label: "Saisons",
            value: seasons ? `${seasons} saison${seasons > 1 ? "s" : ""}` : null,
          },
          {
            label: "Épisodes",
            value: episodes ? `${episodes} épisode${episodes > 1 ? "s" : ""}` : null,
          },
          { label: "Diffuseurs", value: details.networks?.join(", ") || null },
          { label: "Durée d'un épisode", value: formatRuntime(details.runtime) },
        ]
      : [{ label: "Durée", value: formatRuntime(details.runtime) }]),
    { label: "Statut", value: translateStatus(details.status) },
    { label: "Pays", value: details.productionCountries.join(", ") || null },
    { label: "Langues", value: details.spokenLanguages.join(", ") || null },
    ...(isSeries
      ? []
      : [
          { label: "Budget", value: formatMoney(details.budget) },
          { label: "Recettes", value: formatMoney(details.revenue) },
        ]),
    { label: "Production", value: details.productionCompanies.slice(0, 4).join(", ") || null },
    { label: "Scénario", value: details.writers.map((person) => person.name).join(", ") || null },
  ].filter((fact) => Boolean(fact.value));

  return (
    <div className="space-y-6">
      <button
        className="-ml-2 flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-mist-300 active:text-gold-400"
        onClick={() => router.back()}
        type="button"
      >
        <BackIcon className="size-5" />
        Retour
      </button>

      {/* En-tête façon fiche encyclopédique */}
      <header className="relative overflow-hidden rounded-2xl border border-ink-700">
        {backdrop && (
          <Image
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-25"
            fill
            priority
            sizes="100vw"
            src={backdrop}
          />
        )}
        <div className="relative bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/45 p-4 sm:p-8">
          <div className="flex gap-4 sm:gap-6">
            <div className="w-28 shrink-0 self-start overflow-hidden rounded-xl border border-ink-700 shadow-2xl sm:w-52">
              <Poster
                alt={`Affiche de ${details.title}`}
                className="h-auto w-full"
                path={details.posterPath}
                priority
                size="large"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-4xl">
                {details.title}{" "}
                <span className="font-normal text-mist-400">({yearRange})</span>
              </h1>

              {details.tagline && (
                <p className="mt-1 text-sm italic text-gold-400">« {details.tagline} »</p>
              )}

              {/* Séparateurs inclus dans le texte : au retour à la ligne, aucun
                  point ne reste orphelin en fin de ligne. */}
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist-300">
                {details.certification && (
                  <span className="rounded border border-ink-500 px-1.5 py-0.5 text-xs">
                    {details.certification}
                  </span>
                )}
                <span>
                  {[
                    isSeries
                      ? seasons
                        ? `${seasons} saison${seasons > 1 ? "s" : ""}`
                        : "Série"
                      : formatDate(details.releaseDate),
                    isSeries && episodes ? `${episodes} épisodes` : null,
                    formatRuntime(details.runtime),
                    details.genres.map((genre) => genre.name).join(", ") || null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </p>

              {details.directors.length > 0 && (
                <p className="mt-2 text-sm text-mist-300">
                  <span className="text-mist-400">
                    {isSeries ? "Création : " : "Réalisation : "}
                  </span>
                  {details.directors.map((person) => person.name).join(", ")}
                </p>
              )}

              <div className="mt-4">
                <ScoreRing count={details.voteCount} vote={details.voteAverage} />
              </div>

            </div>
          </div>

            <div className="mt-4 flex flex-wrap gap-3 text-sm">
              {details.trailer && (
                <a
                  className="flex min-h-11 items-center gap-2 rounded-xl bg-gold-500 px-4 py-2 font-semibold text-ink-950"
                  href={`https://www.youtube.com/watch?v=${details.trailer.key}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <PlayIcon className="size-4" />
                  Bande-annonce
                </a>
              )}
              {details.imdbId && (
                <a
                  className="flex min-h-11 items-center rounded-xl border border-ink-600 px-4 py-2 text-mist-200"
                  href={`https://www.imdb.com/title/${details.imdbId}/`}
                  rel="noreferrer"
                  target="_blank"
                >
                  IMDb
                </a>
              )}
              {details.homepage && (
                <a
                  className="flex min-h-11 items-center rounded-xl border border-ink-600 px-4 py-2 text-mist-200"
                  href={details.homepage}
                  rel="noreferrer"
                  target="_blank"
                >
                  Site officiel
                </a>
              )}
            </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Sur mobile, le suivi et les plateformes passent avant la fiche :
            ce sont les actions que l'on vient chercher. */}
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <section className="card p-5">
            <h2 className="text-lg font-semibold">Synopsis</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mist-300">
              {details.overview ||
                `Aucun synopsis n'est disponible en français pour ${isSeries ? "cette série" : "ce film"}.`}
            </p>

            {details.keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {details.keywords.slice(0, 14).map((keyword) => (
                  <Chip key={keyword.id}>{keyword.name}</Chip>
                ))}
              </div>
            )}
          </section>

          {details.cast.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-semibold">Distribution</h2>
              <CastRow cast={details.cast} />
            </section>
          )}

          {details.trailer && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-semibold">Bande-annonce</h2>
              <Trailer video={details.trailer} />
            </section>
          )}

          {isSeries && (details.seasons?.length ?? 0) > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 text-lg font-semibold">Saisons</h2>
              <ul className="divide-y divide-ink-800">
                {details.seasons?.map((season) => (
                  <li className="flex items-baseline gap-3 py-2" key={season.id}>
                    <span className="text-sm font-medium text-mist-200">{season.name}</span>
                    <span className="text-xs text-mist-400">
                      {[
                        season.episodeCount
                          ? `${season.episodeCount} épisode${season.episodeCount > 1 ? "s" : ""}`
                          : null,
                        season.airDate ? releaseYear(season.airDate) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">Fiche technique</h2>
            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {facts.map((fact) => (
                <div className="flex flex-col border-b border-ink-800 pb-2" key={fact.label}>
                  <dt className="text-xs uppercase tracking-wide text-mist-400">{fact.label}</dt>
                  <dd className="text-sm text-mist-200">{fact.value}</dd>
                </div>
              ))}
            </dl>

            {details.collection && (
              <p className="mt-4 text-sm text-mist-300">
                Fait partie de la saga{" "}
                <span className="font-semibold text-gold-400">{details.collection.name}</span>.
              </p>
            )}
          </section>
        </div>

        <div className="order-1 min-w-0 space-y-6 lg:order-2">
          <TrackingPanel id={details.id} mediaType={mediaType} title={details.title} />
          <ProviderSection providers={details.providers} region={settings.region} />
        </div>
      </div>

      {suggestions.length > 0 && (
        <section>
          <SectionHeader
            subtitle={`Sélection TMDB à partir de ${isSeries ? "cette série" : "ce film"}`}
            title="Dans le même esprit"
          />
          <MediaRow items={suggestions.map(summaryToCard)} />
        </section>
      )}

      <p className="text-center text-sm">
        <Link className="text-gold-400 underline-offset-2 hover:underline" href="/recommandations">
          Voir des recommandations basées sur toute ma bibliothèque →
        </Link>
      </p>
    </div>
  );
}
