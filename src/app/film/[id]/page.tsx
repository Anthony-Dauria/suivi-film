import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CastRow } from "@/components/CastRow";
import { MovieRow } from "@/components/MovieGrid";
import { Poster } from "@/components/Poster";
import { ProviderSection } from "@/components/ProviderSection";
import { ScoreRing } from "@/components/ScoreRing";
import { Trailer } from "@/components/Trailer";
import { TrackingPanel } from "@/components/TrackingPanel";
import { Chip, ErrorNotice, SectionHeader } from "@/components/ui";
import {
  formatDate,
  formatMoney,
  formatRuntime,
  releaseYear,
  translateStatus,
} from "@/lib/format";
import { getAllEntries, getEntry } from "@/lib/store";
import { REGION, TmdbError, backdropUrl, getMovieDetails } from "@/lib/tmdb";
import type { LibraryEntry, TmdbMovieSummary } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function loadMovie(rawId: string) {
  const movieId = Number(rawId);
  if (!Number.isInteger(movieId) || movieId <= 0) notFound();
  try {
    return await getMovieDetails(movieId);
  } catch (error) {
    if (error instanceof TmdbError && error.status === 404) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const details = await loadMovie((await params).id);
    return {
      title: `${details.title} (${releaseYear(details.releaseDate)})`,
      description: details.overview.slice(0, 200) || undefined,
    };
  } catch {
    return { title: "Fiche film" };
  }
}

function toCard(movie: TmdbMovieSummary, entries: Map<number, LibraryEntry>) {
  const entry = entries.get(movie.id);
  return {
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date,
    voteAverage: movie.vote_average,
    status: entry?.status ?? null,
    rating: entry?.rating ?? null,
    favorite: entry?.favorite ?? false,
  };
}

export default async function MoviePage({ params }: PageProps) {
  const { id } = await params;

  let details;
  try {
    details = await loadMovie(id);
  } catch (error) {
    return (
      <ErrorNotice
        message={
          error instanceof TmdbError
            ? error.message
            : "Impossible de charger cette fiche pour le moment."
        }
      />
    );
  }

  const [entry, allEntries] = await Promise.all([getEntry(details.id), getAllEntries()]);
  const entryMap = new Map(allEntries.map((item) => [item.id, item]));
  const backdrop = backdropUrl(details.backdropPath);

  const suggestions = [...details.recommendations, ...details.similar]
    .filter(
      (movie, index, list) => list.findIndex((item) => item.id === movie.id) === index,
    )
    .slice(0, 18);

  const facts: { label: string; value: string | null }[] = [
    { label: "Titre original", value: details.originalTitle !== details.title ? details.originalTitle : null },
    { label: "Sortie", value: formatDate(details.releaseDate) },
    { label: "Durée", value: formatRuntime(details.runtime) },
    { label: "Statut", value: translateStatus(details.status) },
    { label: "Pays", value: details.productionCountries.join(", ") || null },
    { label: "Langues", value: details.spokenLanguages.join(", ") || null },
    { label: "Budget", value: formatMoney(details.budget) },
    { label: "Recettes", value: formatMoney(details.revenue) },
    { label: "Production", value: details.productionCompanies.slice(0, 4).join(", ") || null },
    { label: "Scénario", value: details.writers.map((person) => person.name).join(", ") || null },
  ].filter((fact) => Boolean(fact.value));

  return (
    <div className="space-y-8">
      {/* En-tête facon fiche encyclopedique */}
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
        <div className="relative bg-gradient-to-t from-ink-950 via-ink-950/85 to-ink-950/45 p-5 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row">
            <div className="w-40 shrink-0 overflow-hidden rounded-xl border border-ink-700 shadow-2xl sm:w-52">
              <Poster
                alt={`Affiche de ${details.title}`}
                className="h-auto w-full"
                path={details.posterPath}
                priority
                size="large"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                {details.title}{" "}
                <span className="font-normal text-mist-400">
                  ({releaseYear(details.releaseDate)})
                </span>
              </h1>

              {details.tagline && (
                <p className="mt-1 text-sm italic text-gold-400">« {details.tagline} »</p>
              )}

              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-mist-300">
                {details.certification && (
                  <span className="rounded border border-ink-500 px-1.5 py-0.5 text-xs">
                    {details.certification}
                  </span>
                )}
                <span>{formatDate(details.releaseDate)}</span>
                <span aria-hidden>·</span>
                <span>{formatRuntime(details.runtime)}</span>
                {details.genres.length > 0 && (
                  <>
                    <span aria-hidden>·</span>
                    <span>{details.genres.map((genre) => genre.name).join(", ")}</span>
                  </>
                )}
              </p>

              {details.directors.length > 0 && (
                <p className="mt-2 text-sm text-mist-300">
                  <span className="text-mist-400">Réalisation : </span>
                  {details.directors.map((person) => person.name).join(", ")}
                </p>
              )}

              <div className="mt-4">
                <ScoreRing count={details.voteCount} vote={details.voteAverage} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                {details.trailer && (
                  <a
                    className="rounded-xl bg-gold-500 px-4 py-2 font-semibold text-ink-950 transition-colors hover:bg-gold-400"
                    href={`https://www.youtube.com/watch?v=${details.trailer.key}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    ▶ Bande-annonce
                  </a>
                )}
                {details.imdbId && (
                  <a
                    className="rounded-xl border border-ink-600 px-4 py-2 text-mist-200 transition-colors hover:border-gold-500/60 hover:text-gold-400"
                    href={`https://www.imdb.com/title/${details.imdbId}/`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    IMDb
                  </a>
                )}
                {details.homepage && (
                  <a
                    className="rounded-xl border border-ink-600 px-4 py-2 text-mist-200 transition-colors hover:border-gold-500/60 hover:text-gold-400"
                    href={details.homepage}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Site officiel
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="text-lg font-semibold">Synopsis</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-mist-300">
              {details.overview || "Aucun synopsis n'est disponible en français pour ce film."}
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

        <div className="space-y-6">
          <TrackingPanel entry={entry} movieId={details.id} title={details.title} />
          <ProviderSection providers={details.providers} region={REGION} />
        </div>
      </div>

      {suggestions.length > 0 && (
        <section>
          <SectionHeader
            subtitle="Sélection TMDB à partir de ce film"
            title="Dans le même esprit"
          />
          <MovieRow movies={suggestions.map((movie) => toCard(movie, entryMap))} />
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
