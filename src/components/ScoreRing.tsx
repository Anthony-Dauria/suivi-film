import { formatVote } from "@/lib/format";

/** Anneau de progression pour la note moyenne TMDB (sur 10). */
export function ScoreRing({ vote, count }: { vote: number; count: number }) {
  const percentage = Math.max(0, Math.min(100, Math.round(vote * 10)));
  const color =
    percentage >= 75 ? "#34d399" : percentage >= 60 ? "#f0b429" : percentage > 0 ? "#fb7185" : "#3b4556";

  return (
    <div className="flex items-center gap-3">
      <div
        className="grid size-16 shrink-0 place-items-center rounded-full"
        role="img"
        aria-label={`Note moyenne TMDB : ${formatVote(vote)} sur 10`}
        style={{
          background: `conic-gradient(${color} ${percentage * 3.6}deg, var(--color-ink-700) 0deg)`,
        }}
      >
        <div className="grid size-[52px] place-items-center rounded-full bg-ink-950">
          <span className="text-base font-semibold tabular-nums">{formatVote(vote)}</span>
        </div>
      </div>
      <div className="text-xs leading-snug text-mist-400">
        <p className="font-semibold text-mist-300">Note TMDB</p>
        <p>{count.toLocaleString("fr-FR")} votes</p>
      </div>
    </div>
  );
}
