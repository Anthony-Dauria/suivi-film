"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SearchIcon } from "@/components/icons";

/** Champ de recherche de l'accueil : redirige vers la page de recherche. */
export function SearchLauncher() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      className="relative"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        router.push(trimmed ? `/recherche/?q=${encodeURIComponent(trimmed)}` : "/recherche");
      }}
      role="search"
    >
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-mist-400" />
      <input
        aria-label="Rechercher un film"
        className="h-13 w-full rounded-2xl border border-ink-600 bg-ink-900 pl-12 pr-32 text-base outline-none placeholder:text-mist-400 focus:border-gold-500"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un film…"
        type="search"
        value={query}
      />
      <button
        className="absolute right-1.5 top-1/2 h-10 -translate-y-1/2 rounded-xl bg-gold-500 px-4 text-sm font-semibold text-ink-950"
        type="submit"
      >
        Chercher
      </button>
    </form>
  );
}
