"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { RatingStars } from "@/components/RatingStars";
import { patchMovie, removeMovie, saveMovie } from "@/lib/client";
import type { LibraryEntry, WatchStatus } from "@/lib/types";

interface TrackingPanelProps {
  movieId: number;
  title: string;
  entry: LibraryEntry | null;
}

const STATUS_BUTTONS: { status: WatchStatus; label: string; icon: string }[] = [
  { status: "seen", label: "Je l'ai vu", icon: "✓" },
  { status: "watchlist", label: "À voir", icon: "＋" },
  { status: "dismissed", label: "Pas intéressé", icon: "✕" },
];

/** Panneau de suivi personnel affiché sur la fiche d'un film. */
export function TrackingPanel({ movieId, title, entry }: TrackingPanelProps) {
  const router = useRouter();
  const [current, setCurrent] = useState<LibraryEntry | null>(entry);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const notesTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCurrent(entry);
    setNotes(entry?.notes ?? "");
  }, [entry]);

  useEffect(() => () => {
    if (notesTimer.current) clearTimeout(notesTimer.current);
  }, []);

  const run = async (action: () => Promise<LibraryEntry | null>) => {
    setError(null);
    setSaving(true);
    try {
      const updated = await action();
      setCurrent(updated);
      setSavedAt(new Date().toLocaleTimeString("fr-FR"));
      startTransition(() => router.refresh());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = (status: WatchStatus) =>
    run(async () => {
      if (current?.status === status) {
        await removeMovie(movieId);
        return null;
      }
      return current ? patchMovie(movieId, { status }) : saveMovie(movieId, { status });
    });

  /** Toute action de suivi bascule implicitement le film en « vu ». */
  const updateSeen = (patch: Parameters<typeof patchMovie>[1]) =>
    run(() =>
      current
        ? patchMovie(movieId, { status: "seen", ...patch })
        : saveMovie(movieId, { status: "seen", ...patch }),
    );

  const scheduleNotes = (value: string) => {
    setNotes(value);
    if (notesTimer.current) clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      void run(() =>
        current
          ? patchMovie(movieId, { notes: value })
          : saveMovie(movieId, { status: "watchlist", notes: value }),
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
          const active = current?.status === button.status;
          return (
            <button
              aria-pressed={active}
              className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
                active
                  ? "border-gold-500 bg-gold-500 text-ink-950"
                  : "border-ink-600 text-mist-200 hover:border-gold-500/60 hover:text-gold-400"
              }`}
              disabled={saving}
              key={button.status}
              onClick={() => void setStatus(button.status)}
              type="button"
            >
              <span aria-hidden>{button.icon}</span> {button.label}
            </button>
          );
        })}

        <button
          aria-pressed={current?.favorite ?? false}
          className={`rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
            current?.favorite
              ? "border-rose-400 bg-rose-400/15 text-rose-400"
              : "border-ink-600 text-mist-200 hover:border-rose-400/60 hover:text-rose-400"
          }`}
          disabled={saving}
          onClick={() => void updateSeen({ favorite: !current?.favorite })}
          type="button"
          title={`Marquer « ${title} » comme coup de cœur`}
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
            value={current?.rating ?? null}
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
              value={current?.watchedAt ?? ""}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-mist-400">
              Revisionnages
            </span>
            <input
              className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none focus:border-gold-500"
              disabled={saving}
              min={0}
              max={99}
              onChange={(event) =>
                void updateSeen({ rewatchCount: Math.max(0, Number(event.target.value) || 0) })
              }
              type="number"
              value={current?.rewatchCount ?? 0}
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

        {current && (
          <button
            className="text-xs text-mist-400 underline-offset-2 hover:text-rose-400 hover:underline"
            onClick={() => void run(async () => (await removeMovie(movieId), null))}
            type="button"
          >
            Retirer ce film de ma bibliothèque
          </button>
        )}

        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    </section>
  );
}
