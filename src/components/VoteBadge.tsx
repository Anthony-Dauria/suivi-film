import { formatVote } from "@/lib/format";

/** Pastille de note TMDB, coloree selon le niveau. */
export function VoteBadge({ vote, className }: { vote: number; className?: string }) {
  if (!vote || vote <= 0) return null;

  const tone =
    vote >= 7.5
      ? "border-emerald-400/40 text-emerald-400"
      : vote >= 6
        ? "border-gold-500/40 text-gold-400"
        : "border-rose-400/40 text-rose-400";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border bg-ink-950/80 px-2 py-0.5 text-xs font-semibold tabular-nums ${tone} ${className ?? ""}`}
      title={`Note moyenne TMDB : ${formatVote(vote)} sur 10`}
    >
      ★ {formatVote(vote)}
    </span>
  );
}
