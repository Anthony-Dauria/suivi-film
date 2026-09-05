"use client";

import { useEffect, useRef, useState } from "react";

import { RatingStars } from "@/components/RatingStars";
import { useEntry } from "@/lib/hooks";
import { removeMedia, saveMedia, toggleStatus, type EntryPatch } from "@/lib/library";
import { showToast } from "@/lib/toast";
import type { MediaType, WatchStatus } from "@/lib/types";

interface TrackingPanelProps {
  mediaType: MediaType;
  id: number;
  title: string;
}

const STATUS_BUTTONS: {
  status: WatchStatus;
  label: string;
  icon: string;
  /** Couleur du statut, identique à celle des vignettes. */
  activeClassName: string;
  confirmation: (title: string) => string;
}[] = [
  {
    status: "seen",
    label: "Je l'ai vu",
    icon: "✓",
    activeClassName: "border-emerald-400 bg-emerald-400 text-ink-950",
    confirmation: (title) => `« ${title} » marqué comme vu`,
  },
  {
    status: "watchlist",
    label: "À voir",
    icon: "＋",
    activeClassName: "border-azure-400 bg-azure-400 text-ink-950",
    confirmation: (title) => `« ${title} » ajouté à votre liste`,
  },
  {
    status: "dismissed",
    label: "Pas intéressé",
    icon: "✕",
    activeClassName: "border-mist-400 bg-mist-400 text-ink-950",
    confirmation: (title) => `« ${title} » ne vous sera plus proposé`,
  },
];

/** Panneau de suivi personnel affiché sur la fiche d'un film. */
export function TrackingPanel({ mediaType, id, title }: TrackingPanelProps) {
  const entry = useEntry(mediaType, id);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingNotes = useRef(false);

  // On ne réécrase pas la zone de texte pendant la saisie de l'utilisateur.
  useEffect(() => {
    if (!editingNotes.current) setNotes(entry?.notes ?? "");
  }, [entry]);

  useEffect(
    () => () => {
      if (notesTimer.current) clearTimeout(notesTimer.current);
    },
    [],
  );

  const run = async (action: () => Promise<unknown>, confirmation?: string) => {
    setError(null);
    setSaving(true);
    try {
      await action();
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      if (confirmation) showToast(confirmation, "neutral");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Enregistrement impossible.";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  /** Toute action de notation bascule implicitement le film en « vu ». */
  const updateSeen = (patch: EntryPatch) =>
    run(() =>
      saveMedia(mediaType, id, {
        status: entry?.status === "seen" ? undefined : "seen",
        ...patch,
      }),
    );

  const scheduleNotes = (value: string) => {
    editingNotes.current = true;
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      editingNotes.current = false;
      void run(() =>
        saveMedia(mediaType, id, { status: entry?.status ?? "watchlist", notes: value }),
      );
    }, 900);
  };

  return (
    <section aria-labelledby="mon-suivi" className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" id="mon-suivi">
          Mon suivi
        </h2>
        {saving ? (
          <span className="text-xs text-mist-400">Enregistrement…</span>
        ) : savedAt ? (
          <span className="text-xs text-emerald-400">Enregistré à {savedAt}</span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_BUTTONS.map((button) => {
          const active = entry?.status === button.status;
          return (
            <button
              aria-pressed={active}
              className={`min-h-11 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
                active ? button.activeClassName : "border-ink-600 text-mist-200"
              }`}
              disabled={saving}
              key={button.status}
              onClick={() =>
                void run(
                  () => toggleStatus(mediaType, id, button.status),
                  entry?.status === button.status
                    ? `« ${title} » retiré de votre bibliothèque`
                    : button.confirmation(title),
                )
              }
              type="button"
            >
              <span aria-hidden>{button.icon}</span> {button.label}
            </button>
          );
        })}

        <button
          aria-pressed={entry?.favorite ?? false}
          className={`min-h-11 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            entry?.favorite
              ? "border-rose-400 bg-rose-400/15 text-rose-400"
              : "border-ink-600 text-mist-200 hover:border-rose-400/60 hover:text-rose-400"
          }`}
          disabled={saving}
          onClick={() =>
            void run(
              () =>
                saveMedia(mediaType, id, {
                  status: entry?.status === "seen" ? undefined : "seen",
                  favorite: !entry?.favorite,
                }),
              entry?.favorite ? "Coup de cœur retiré" : `« ${title} » ajouté à vos coups de cœur`,
            )
          }
          title={`Marquer « ${title} » comme coup de cœur`}
          type="button"
        >
          ❤️ Coup de cœur
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-mist-400">
            Ma note
          </p>
          <RatingStars
            onChange={(value) => void updateSeen({ rating: value })}
            value={entry?.rating ?? null}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-400">
              Date de visionnage
            </span>
            <input
              className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
              disabled={saving}
              onChange={(event) => void updateSeen({ watchedAt: event.target.value || null })}
              type="date"
              value={entry?.watchedAt ?? ""}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-400">
              {mediaType === "tv" ? "Revisionnages" : "Revisionnages"}
            </span>
            <input
              className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
              disabled={saving}
              max={99}
              min={0}
              onChange={(event) =>
                void updateSeen({ rewatchCount: Math.max(0, Number(event.target.value) || 0) })
              }
              type="number"
              value={entry?.rewatchCount ?? 0}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-400">
            Mes notes
          </span>
          <textarea
            className="w-full resize-y rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
            onChange={(event) => scheduleNotes(event.target.value)}
            placeholder="Ce que vous en avez pensé, avec qui, où vous l'avez vu…"
            rows={3}
            value={notes}
          />
        </label>

        {entry && (
          <button
            className="text-xs text-mist-400 underline-offset-2 hover:text-rose-400 hover:underline"
            onClick={() => {
              removeMedia(mediaType, id);
              showToast(`« ${title} » retiré de votre bibliothèque`, "neutral");
            }}
            type="button"
          >
            {mediaType === "tv" ? "Retirer cette série" : "Retirer ce film"} de ma bibliothèque
          </button>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    </section>
  );
}
