"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Champ de recherche de l'accueil : redirige vers la page de recherche. */
export function SearchLauncher() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = query.trim();
        if (trimmed) router.push(`/recherche?q=${encodeURIComponent(trimmed)}`);
      }}
      role="search"
    >
      <input
        aria-label="Rechercher un film"
        className="w-full rounded-xl border border-ink-600 bg-ink-900 px-4 py-3 text-sm outline-none placeholder:text-mist-400 focus:border-gold-500"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Rechercher un film : Interstellar, Parasite, Amélie…"
        type="search"
        value={query}
      />
      <button
        className="shrink-0 rounded-xl bg-gold-500 px-5 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400"
        type="submit"
      >
        Rechercher
      </button>
    </form>
  );
}
