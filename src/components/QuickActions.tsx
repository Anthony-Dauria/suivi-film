"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { patchMovie, removeMovie, saveMovie } from "@/lib/client";
import type { WatchStatus } from "@/lib/types";

interface QuickActionsProps {
  movieId: number;
  current: WatchStatus | null;
  /** Affichage compact utilisé en survol de vignette. */
  compact?: boolean;
}

const ACTIONS: { status: WatchStatus; label: string; icon: string; title: string }[] = [
  { status: "seen", label: "Vu", icon: "✓", title: "Marquer comme vu" },
  { status: "watchlist", label: "À voir", icon: "＋", title: "Ajouter à la liste à voir" },
  { status: "dismissed", label: "Non merci", icon: "✕", title: "Ne plus me proposer ce film" },
];

/** Boutons de statut réutilisables (vignettes, recommandations, fiche film). */
export function QuickActions({ movieId, current, compact = false }: QuickActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState<WatchStatus | null>(current);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = async (next: WatchStatus) => {
    setError(null);
    const previous = status;
    const target = status === next ? null : next;
    setStatus(target);

    try {
      if (target === null) await removeMovie(movieId);
      else if (previous === null) await saveMovie(movieId, { status: target });
      else await patchMovie(movieId, { status: target });
      startTransition(() => router.refresh());
    } catch (cause) {
      setStatus(previous);
      setError(cause instanceof Error ? cause.message : "Action impossible.");
    }
  };

  return (
    <div className={compact ? "flex gap-1" : "flex flex-wrap gap-2"}>
      {ACTIONS.map((action) => {
        const active = status === action.status;
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
