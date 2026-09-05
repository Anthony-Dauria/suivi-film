"use client";

import { useState } from "react";

import { useEntry } from "@/lib/hooks";
import { removeMedia, toggleStatus } from "@/lib/library";
import { showToast } from "@/lib/toast";
import type { MediaType, WatchStatus } from "@/lib/types";

interface QuickActionsProps {
  mediaType: MediaType;
  id: number;
  /** Titre repris dans le message de confirmation. */
  title: string;
}

const ACTIONS: {
  status: WatchStatus;
  label: string;
  title: string;
  activeClassName: string;
  added: (title: string) => string;
}[] = [
  {
    status: "seen",
    label: "Vu",
    title: "Marquer comme vu",
    activeClassName: "border-emerald-400 bg-emerald-400 text-ink-950",
    added: (title) => `« ${title} » marqué comme vu`,
  },
  {
    status: "watchlist",
    label: "À voir",
    title: "Ajouter à ma liste à voir",
    activeClassName: "border-azure-400 bg-azure-400 text-ink-950",
    added: (title) => `« ${title} » ajouté à votre liste`,
  },
  {
    status: "dismissed",
    label: "Non",
    title: "Ne plus me proposer",
    activeClassName: "border-mist-400 bg-mist-400 text-ink-950",
    added: (title) => `« ${title} » ne vous sera plus proposé`,
  },
];

/**
 * Trois boutons de statut sous une vignette.
 *
 * Le bouton actif est rempli de la couleur du statut, et chaque appui déclenche
 * un message de confirmation : sur un téléphone, le doigt masque souvent la
 * vignette au moment du geste.
 */
export function QuickActions({ mediaType, id, title }: QuickActionsProps) {
  const entry = useEntry(mediaType, id);
  const [pending, setPending] = useState<WatchStatus | null>(null);

  const apply = async (action: (typeof ACTIONS)[number]) => {
    if (pending) return;
    const removing = entry?.status === action.status;
    setPending(action.status);
    try {
      await toggleStatus(mediaType, id, action.status);
      showToast(
        removing ? `« ${title} » retiré de votre bibliothèque` : action.added(title),
        removing ? "neutral" : action.status,
      );
    } catch (cause) {
      // La fiche n'a pas pu être récupérée : ne pas laisser d'entrée incomplète.
      if (!entry) removeMedia(mediaType, id);
      showToast(cause instanceof Error ? cause.message : "Action impossible.", "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {ACTIONS.map((action) => {
        const active = entry?.status === action.status;
        const busy = pending === action.status;
        return (
          <button
            aria-label={action.title}
            aria-pressed={active}
            className={`flex h-10 items-center justify-center whitespace-nowrap rounded-xl border text-xs font-semibold transition-colors ${
              active
                ? action.activeClassName
                : "border-ink-600 bg-ink-900/80 text-mist-300 active:border-gold-500/60"
            } ${pending && !busy ? "opacity-50" : ""}`}
            disabled={Boolean(pending)}
            key={action.status}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void apply(action);
            }}
            title={action.title}
            type="button"
          >
            {busy ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              action.label
            )}
          </button>
        );
      })}
    </div>
  );
}
