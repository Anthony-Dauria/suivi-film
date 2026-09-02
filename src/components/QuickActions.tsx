"use client";

import { useState } from "react";

import { useEntry } from "@/lib/hooks";
import { removeMovie, toggleStatus } from "@/lib/library";
import type { WatchStatus } from "@/lib/types";

interface QuickActionsProps {
  movieId: number;
  /** Affichage compact utilisé en survol de vignette. */
  compact?: boolean;
}

const ACTIONS: { status: WatchStatus; label: string; icon: string; title: string }[] = [
  { status: "seen", label: "Vu", icon: "✓", title: "Marquer comme vu" },
  { status: "watchlist", label: "À voir", icon: "＋", title: "Ajouter à la liste à voir" },
  { status: "dismissed", label: "Non merci", icon: "✕", title: "Ne plus me proposer ce film" },
];

/** Boutons de statut réutilisables (vignettes, recommandations). */
export function QuickActions({ movieId, compact = false }: QuickActionsProps) {
  const entry = useEntry(movieId);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const apply = async (next: WatchStatus) => {
    setError(null);
    setPending(true);
    try {
      await toggleStatus(movieId, next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action impossible.");
      // La fiche n'a pas pu être récupérée : on ne laisse pas d'entrée incomplète.
      if (!entry) removeMovie(movieId);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={compact ? "flex gap-1" : "flex flex-wrap gap-2"}>
      {ACTIONS.map((action) => {
        const active = entry?.status === action.status;
        return (
          <button
            aria-pressed={active}
            className={`rounded-lg border text-sm font-medium transition-colors disabled:opacity-60 ${
              compact ? "px-2 py-1 text-xs" : "px-3 py-2"
            } ${
              active
                ? "border-gold-500 bg-gold-500 text-ink-950"
                : "border-ink-600 bg-ink-900/80 text-mist-200 hover:border-gold-500/60 hover:text-gold-400"
            }`}
            disabled={pending}
            key={action.status}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void apply(action.status);
            }}
            title={action.title}
            type="button"
          >
            <span aria-hidden>{action.icon}</span>
            <span className={compact ? "sr-only" : "ml-1.5"}>{action.label}</span>
          </button>
        );
      })}
      {error && <p className="w-full text-xs text-rose-400">{error}</p>}
    </div>
  );
}
