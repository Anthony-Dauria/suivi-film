"use client";

import { useEffect, useMemo, useState } from "react";

import { MovieGrid } from "@/components/MovieGrid";
import { EmptyState, ErrorNotice } from "@/components/ui";
import { fetchLibrary } from "@/lib/client";
import { GENRE_LIST, genreName } from "@/lib/genres";
import type { LibraryEntry, WatchStatus } from "@/lib/types";

type Tab = WatchStatus | "all" | "favorites";
type SortKey = "updated" | "rating" | "title" | "release" | "watched";

const TABS: { key: Tab; label: string }[] = [
  { key: "seen", label: "Vus" },
  { key: "watchlist", label: "À voir" },
  { key: "favorites", label: "Coups de cœur" },
  { key: "dismissed", label: "Écartés" },
  { key: "all", label: "Tout" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "updated", label: "Modifiés récemment" },
  { key: "watched", label: "Date de visionnage" },
  { key: "rating", label: "Ma note" },
  { key: "release", label: "Date de sortie" },
  { key: "title", label: "Titre (A-Z)" },
];

function matchesTab(entry: LibraryEntry, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "favorites") return entry.favorite;
  return entry.status === tab;
}

function compare(a: LibraryEntry, b: LibraryEntry, sort: SortKey): number {
  switch (sort) {
    case "rating":
      return (b.rating ?? -1) - (a.rating ?? -1);
    case "title":
      return a.movie.title.localeCompare(b.movie.title, "fr");
    case "release":
      return (b.movie.releaseDate ?? "").localeCompare(a.movie.releaseDate ?? "");
    case "watched":
      return (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");
    default:
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  }
}

export function LibraryClient({ initialTab }: { initialTab: Tab }) {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<SortKey>("updated");
  const [genre, setGenre] = useState(0);
  const [term, setTerm] = useState("");

  useEffect(() => {
    fetchLibrary()
      .then((data) => setEntries(data.entries))
      .catch((cause: unknown) =>
        setError(cause instanceof Error ? cause.message : "Chargement impossible."),
      );
  }, []);

  const counts = useMemo(() => {
    const list = entries ?? [];
    return {
      seen: list.filter((entry) => entry.status === "seen").length,
      watchlist: list.filter((entry) => entry.status === "watchlist").length,
      dismissed: list.filter((entry) => entry.status === "dismissed").length,
      favorites: list.filter((entry) => entry.favorite).length,
      all: list.length,
    } as Record<Tab, number>;
  }, [entries]);

  /** Genres réellement presents dans la bibliothèque, pour ne pas polluer le filtre. */
  const availableGenres = useMemo(() => {
    const present = new Set<number>();
    for (const entry of entries ?? []) {
      for (const id of entry.movie.genreIds ?? []) present.add(id);
    }
    return GENRE_LIST.filter((item) => present.has(item.id));
  }, [entries]);

  const visible = useMemo(() => {
    const normalised = term.trim().toLowerCase();
    return (entries ?? [])
      .filter((entry) => matchesTab(entry, tab))
      .filter((entry) => genre === 0 || (entry.movie.genreIds ?? []).includes(genre))
      .filter(
        (entry) =>
          normalised === "" ||
          entry.movie.title.toLowerCase().includes(normalised) ||
          entry.movie.originalTitle?.toLowerCase().includes(normalised) ||
          (entry.movie.directors ?? []).some((person) =>
            person.name.toLowerCase().includes(normalised),
          ),
      )
      .sort((a, b) => compare(a, b, sort));
  }, [entries, tab, genre, term, sort]);

  if (error) return <ErrorNotice message={error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ma bibliothèque</h1>
        <p className="mt-1 text-sm text-mist-400">
          {entries === null
            ? "Chargement…"
            : `${counts.all} film${counts.all > 1 ? "s" : ""} suivi${counts.all > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            aria-pressed={tab === item.key}
            className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors ${
              tab === item.key
                ? "border-gold-500 bg-gold-500 text-ink-950"
                : "border-ink-600 text-mist-200 hover:border-gold-500/60 hover:text-gold-400"
            }`}
            key={item.key}
            onClick={() => setTab(item.key)}
            type="button"
          >
            {item.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[item.key] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          aria-label="Filtrer par titre ou réalisateur"
          className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none placeholder:text-mist-400 focus:border-gold-500"
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filtrer par titre ou réalisateur…"
          type="search"
          value={term}
        />

        <select
          aria-label="Filtrer par genre"
          className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
          onChange={(event) => setGenre(Number(event.target.value))}
          value={genre}
        >
          <option value={0}>Tous les genres</option>
          {availableGenres.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Trier"
          className="rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
          onChange={(event) => setSort(event.target.value as SortKey)}
          value={sort}
        >
          {SORTS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {entries !== null && visible.length === 0 ? (
        <EmptyState
          action={{ href: "/recherche", label: "Chercher un film" }}
          description={
            counts.all === 0
              ? "Ajoutez les films que vous avez vus pour construire votre historique et affiner vos recommandations."
              : "Aucun film ne correspond à ces filtres."
          }
          title={counts.all === 0 ? "Bibliothèque vide" : "Rien à afficher"}
        />
      ) : (
        <MovieGrid
          movies={visible.map((entry) => ({
            id: entry.id,
            title: entry.movie.title,
            posterPath: entry.movie.posterPath,
            releaseDate: entry.movie.releaseDate,
            voteAverage: entry.movie.voteAverage,
            status: entry.status,
            rating: entry.rating,
            favorite: entry.favorite,
            reasons:
              genre !== 0 && entry.movie.genreIds?.includes(genre)
                ? [genreName(genre)]
                : undefined,
          }))}
        />
      )}
    </div>
  );
}
