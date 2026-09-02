"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MovieGrid } from "@/components/MovieGrid";
import { EmptyState, ErrorNotice } from "@/components/ui";
import { fetchLibrary } from "@/lib/client";
import type { LibraryEntry, TmdbMovieSummary } from "@/lib/types";

interface SearchResponse {
  results: TmdbMovieSummary[];
  page: number;
  total_pages: number;
  total_results: number;
}

/** Recherche instantanee avec anti-rebond et pagination « charger plus ». */
export function SearchClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<TmdbMovieSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Map<number, LibraryEntry>>(new Map());
  const requestId = useRef(0);

  useEffect(() => {
    fetchLibrary()
      .then((data) => setEntries(new Map(data.entries.map((entry) => [entry.id, entry]))))
      .catch(() => undefined);
  }, []);

  const run = useCallback(async (term: string, targetPage: number) => {
    const identifier = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(term)}&page=${targetPage}`,
      );
      const data = (await response.json()) as SearchResponse & { error?: string };
      if (identifier !== requestId.current) return;
      if (!response.ok) throw new Error(data.error ?? "Recherche impossible.");

      setResults((previous) =>
        targetPage === 1 ? data.results : [...previous, ...data.results],
      );
      setTotal(data.total_results ?? 0);
      setTotalPages(data.total_pages ?? 0);
      setPage(data.page ?? targetPage);
    } catch (cause) {
      if (identifier === requestId.current) {
        setError(cause instanceof Error ? cause.message : "Recherche impossible.");
        setResults([]);
      }
    } finally {
      if (identifier === requestId.current) setLoading(false);
    }
  }, []);

  // Anti-rebond : on interroge TMDB 350 ms après la dernière frappe.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setTotal(0);
      setTotalPages(0);
      return;
    }
    const timer = setTimeout(() => void run(term, 1), 350);
    return () => clearTimeout(timer);
  }, [query, run]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rechercher un film</h1>
        <p className="mt-1 text-sm text-mist-400">
          Tapez un titre pour consulter sa fiche, l&apos;ajouter à votre liste ou le noter.
        </p>
      </div>

      <input
        aria-label="Titre du film"
        autoFocus
        className="w-full rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 text-base outline-none placeholder:text-mist-400 focus:border-gold-500"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Titre du film…"
        type="search"
        value={query}
      />

      {error && <ErrorNotice message={error} />}

      {query.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <EmptyState
          description="Vérifiez l'orthographe, ou essayez le titre original du film."
          title="Aucun résultat"
        />
      )}

      {results.length > 0 && (
        <>
          <p className="text-sm text-mist-400">
            {total.toLocaleString("fr-FR")} résultat{total > 1 ? "s" : ""}
          </p>
          <MovieGrid
            movies={results.map((movie) => {
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
            })}
          />
          {page < totalPages && (
            <div className="flex justify-center">
              <button
                className="rounded-xl border border-ink-600 px-5 py-2.5 text-sm font-medium transition-colors hover:border-gold-500/60 hover:text-gold-400 disabled:opacity-60"
                disabled={loading}
                onClick={() => void run(query.trim(), page + 1)}
                type="button"
              >
                {loading ? "Chargement…" : "Charger plus de résultats"}
              </button>
            </div>
          )}
        </>
      )}

      {loading && results.length === 0 && (
        <p className="text-sm text-mist-400">Recherche en cours…</p>
      )}
    </div>
  );
}
