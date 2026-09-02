import type { Metadata } from "next";

import { MovieGrid } from "@/components/MovieGrid";
import { Chip, EmptyState, ErrorNotice, SectionHeader } from "@/components/ui";
import { GENRE_LIST } from "@/lib/genres";
import { getRecommendations } from "@/lib/reco";
import { getAllEntries, getSettings } from "@/lib/store";
import { TmdbError, isConfigured } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Recommandations" };
export const dynamic = "force-dynamic";

const DURATIONS = [
  { value: "", label: "Toutes durées" },
  { value: "100", label: "Moins d'1 h 40" },
  { value: "120", label: "Moins de 2 h" },
  { value: "150", label: "Moins de 2 h 30" },
];

interface PageProps {
  searchParams: Promise<{ genre?: string; duree?: string; plateformes?: string }>;
}

export default async function RecommendationsPage({ searchParams }: PageProps) {
  const filters = await searchParams;
  const genreId = Number(filters.genre ?? 0) || undefined;
  const maxRuntime = Number(filters.duree ?? 0) || undefined;
  const onlyMyProviders = filters.plateformes === "1";

  if (!isConfigured()) {
    return (
      <EmptyState
        action={{ href: "/reglages", label: "Configurer la clé API" }}
        description="Les recommandations s'appuient sur l'API TMDB : renseignez votre clé pour les activer."
        title="Clé API TMDB manquante"
      />
    );
  }

  const [entries, settings] = await Promise.all([getAllEntries(), getSettings()]);
  const known = new Map(entries.map((entry) => [entry.id, entry]));

  let items: Awaited<ReturnType<typeof getRecommendations>>["items"] = [];
  let profile: Awaited<ReturnType<typeof getRecommendations>>["profile"] | null = null;
  let error: string | null = null;

  try {
    const result = await getRecommendations({ limit: 30, genreId, maxRuntime, onlyMyProviders });
    items = result.items;
    profile = result.profile;
  } catch (cause) {
    error =
      cause instanceof TmdbError
        ? cause.message
        : "Impossible de calculer les recommandations pour le moment.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recommandations pour vous</h1>
        <p className="mt-1 max-w-3xl text-sm text-mist-400">
          Chaque proposition est calculée à partir de votre bibliothèque : films que vous avez le
          mieux notes, genres qui reviennent, thèmes récurrents, réalisateurs et acteurs que vous
          suivez. La raison de chaque suggestion est indiquee sous l&apos;affiche.
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

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400">
          Genre
          <select
            className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm normal-case text-mist-200"
            defaultValue={filters.genre ?? ""}
            name="genre"
          >
            <option value="">Tous</option>
            {GENRE_LIST.map((genre) => (
              <option key={genre.id} value={genre.id}>
                {genre.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400">
          Durée
          <select
            className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm normal-case text-mist-200"
            defaultValue={filters.duree ?? ""}
            name="duree"
          >
            {DURATIONS.map((duration) => (
              <option key={duration.value} value={duration.value}>
                {duration.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 pb-2 text-sm text-mist-300">
          <input
            className="size-4 accent-[var(--color-gold-500)]"
            defaultChecked={onlyMyProviders}
            name="plateformes"
            type="checkbox"
            value="1"
          />
          Uniquement sur mes plateformes
          {settings.providers.length === 0 && (
            <span className="text-xs text-mist-400">(aucune plateforme choisie)</span>
          )}
        </label>

        <button
          className="ml-auto rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400"
          type="submit"
        >
          Appliquer
        </button>
      </form>

      {error && <ErrorNotice message={error} />}

      {!error && items.length === 0 ? (
        <EmptyState
          action={{ href: "/recherche", label: "Ajouter des films" }}
          description={
            onlyMyProviders
              ? "Aucun film recommandé n'est disponible sur les plateformes sélectionnées. Élargissez le filtre ou ajoutez des plateformes dans les réglages."
              : "Ajoutez et notez quelques films pour que le moteur puisse apprendre vos goûts."
          }
          title="Pas encore de suggestion"
        />
      ) : (
        <section>
          <SectionHeader
            subtitle={`${items.length} film${items.length > 1 ? "s" : ""} sélectionné${items.length > 1 ? "s" : ""} pour vous`}
            title="Sélection"
          />
          <MovieGrid
            movies={items.map((item) => ({
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
    </div>
  );
}
