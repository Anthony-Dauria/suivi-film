import { formatRating } from "@/lib/format";
import type { LibraryEntry, WatchStatus } from "@/lib/types";

const STATUS: Record<WatchStatus, { label: string; icon: string; className: string }> = {
  seen: {
    label: "Vu",
    icon: "✓",
    className: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400",
  },
  watchlist: {
    label: "Dans ma liste",
    icon: "＋",
    className: "border-azure-400/40 bg-azure-400/10 text-azure-400",
  },
  dismissed: {
    label: "Écarté",
    icon: "✕",
    className: "border-ink-600 bg-ink-800/60 text-mist-400",
  },
};

/**
 * Bandeau de statut affiché sous le titre d'une vignette : un libellé lisible
 * plutôt qu'une simple pastille posée sur l'affiche.
 */
export function StatusBanner({ entry }: { entry: LibraryEntry | null }) {
  if (!entry) return null;
  const status = STATUS[entry.status];

  return (
    <p
      className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs font-semibold ${status.className}`}
    >
      <span aria-hidden>{status.icon}</span>
      <span>{status.label}</span>
      {entry.rating !== null && (
        <span className="ml-auto font-normal tabular-nums">{formatRating(entry.rating)}</span>
      )}
      {entry.favorite && <span aria-label="Coup de cœur">❤️</span>}
    </p>
  );
}
