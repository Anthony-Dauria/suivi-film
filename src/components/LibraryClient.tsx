"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { MediaGrid } from "@/components/MediaGrid";
import { TypeFilter, type TypeChoice } from "@/components/TypeFilter";
import { EmptyState } from "@/components/ui";
import { entryToCard } from "@/lib/cards";
import { genreName, MOVIE_GENRE_LIST, TV_GENRE_LIST } from "@/lib/genres";
import { useEntries } from "@/lib/hooks";
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
      return a.media.title.localeCompare(b.media.title, "fr");
    case "release":
      return (b.media.releaseDate ?? "").localeCompare(a.media.releaseDate ?? "");
    case "watched":
      return (b.watchedAt ?? "").localeCompare(a.watchedAt ?? "");
    default:
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  }
}

const TAB_KEYS: Tab[] = ["seen", "watchlist", "dismissed", "favorites", "all"];

export function LibraryClient() {
  const entries = useEntries();
  const requestedTab = useSearchParams().get("statut");
  const [tab, setTab] = useState<Tab>(
    TAB_KEYS.includes(requestedTab as Tab) ? (requestedTab as Tab) : "seen",
  );
  const [type, setType] = useState<TypeChoice>("all");
  const [sort, setSort] = useState<SortKey>("updated");
  const [genre, setGenre] = useState("");
  const [term, setTerm] = useState("");

  const counts = useMemo(() => {
    const list = entries;
    return {
      seen: list.filter((entry) => entry.status === "seen").length,
      watchlist: list.filter((entry) => entry.status === "watchlist").length,
      dismissed: list.filter((entry) => entry.status === "dismissed").length,
      favorites: list.filter((entry) => entry.favorite).length,
      all: list.length,
    } as Record<Tab, number>;
  }, [entries]);

  const typeCounts = useMemo(
    () => ({
      all: entries.length,
      movie: entries.filter((entry) => entry.mediaType === "movie").length,
      tv: entries.filter((entry) => entry.mediaType === "tv").length,
    }),
    [entries],
  );

  /**
   * Genres réellement présents dans la bibliothèque, pour ne pas polluer le
   * filtre. Ils sont identifiés par « type:identifiant », les tables de genres
   * des films et des séries étant distinctes.
   */
  const availableGenres = useMemo(() => {
    const present = new Set<string>();
    for (const entry of entries) {
      for (const id of entry.media.genreIds ?? []) present.add(`${entry.mediaType}:${id}`);
    }
    return [
      ...MOVIE_GENRE_LIST.map((item) => ({ ...item, key: `movie:${item.id}`, suffix: "" })),
      ...TV_GENRE_LIST.map((item) => ({ ...item, key: `tv:${item.id}`, suffix: " (série)" })),
    ].filter((item) => present.has(item.key));
  }, [entries]);

  const visible = useMemo(() => {
    const normalised = term.trim().toLowerCase();
    return entries
      .filter((entry) => matchesTab(entry, tab))
      .filter((entry) => type === "all" || entry.mediaType === type)
      .filter(
        (entry) =>
          genre === "" ||
          (entry.media.genreIds ?? []).some((id) => `${entry.mediaType}:${id}` === genre),
      )
      .filter(
        (entry) =>
          normalised === "" ||
          entry.media.title.toLowerCase().includes(normalised) ||
          entry.media.originalTitle?.toLowerCase().includes(normalised) ||
          (entry.media.directors ?? []).some((person) =>
            person.name.toLowerCase().includes(normalised),
          ),
      )
      .sort((a, b) => compare(a, b, sort));
  }, [entries, tab, type, genre, term, sort]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Ma bibliothèque</h1>
        <p className="mt-1 text-sm text-mist-400">
          {`${counts.all} film${counts.all > 1 ? "s" : ""} suivi${counts.all > 1 ? "s" : ""}`}
        </p>
      </div>

      <div className="scroll-row -mx-4 px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {TABS.map((item) => (
          <button
            aria-pressed={tab === item.key}
            className={`min-h-11 shrink-0 whitespace-nowrap rounded-xl border px-3.5 text-sm font-medium transition-colors ${
              tab === item.key
                ? "border-gold-500 bg-gold-500 text-ink-950"
                : "border-ink-600 text-mist-200"
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

      <TypeFilter counts={typeCounts} onChange={setType} value={type} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <input
          aria-label="Filtrer par titre ou réalisateur"
          className="col-span-2 h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm outline-none placeholder:text-mist-400 focus:border-gold-500 sm:col-span-1"
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Filtrer par titre ou réalisateur…"
          type="search"
          value={term}
        />

        <select
          aria-label="Filtrer par genre"
          className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm outline-none focus:border-gold-500"
          onChange={(event) => setGenre(event.target.value)}
          value={genre}
        >
          <option value="">Tous les genres</option>
          {availableGenres.map((item) => (
            <option key={item.key} value={item.key}>
              {item.name}
              {item.suffix}
            </option>
          ))}
        </select>

        <select
          aria-label="Trier"
          className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm outline-none focus:border-gold-500"
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

      {visible.length === 0 ? (
        <EmptyState
          action={{ href: "/recherche", label: "Chercher un titre" }}
          description={
            counts.all === 0
              ? "Ajoutez les films et séries que vous avez vus pour construire votre historique et affiner vos recommandations."
              : "Aucun titre ne correspond à ces filtres."
          }
          title={counts.all === 0 ? "Bibliothèque vide" : "Rien à afficher"}
        />
      ) : (
        <MediaGrid
          items={visible.map((entry) => ({
            ...entryToCard(entry),
            reasons:
              genre !== "" && entry.media.genreIds?.some((id) => `${entry.mediaType}:${id}` === genre)
                ? [genreName(Number(genre.split(":")[1]), entry.mediaType)]
                : undefined,
          }))}
        />
      )}
    </div>
  );
}
