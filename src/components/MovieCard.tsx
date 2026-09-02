"use client";

import Link from "next/link";

import { Poster } from "@/components/Poster";
import { ProviderStrip } from "@/components/ProviderStrip";
import { QuickActions } from "@/components/QuickActions";
import { VoteBadge } from "@/components/VoteBadge";
import { releaseYear } from "@/lib/format";
import { useEntry } from "@/lib/hooks";
import type { WatchProviders, WatchStatus } from "@/lib/types";

export interface MovieCardProps {
  id: number;
  title: string;
  posterPath: string | null;
  releaseDate: string | null;
  voteAverage?: number;
  /** Raisons de la suggestion, affichées sous l'affiche. */
  reasons?: string[];
  providers?: WatchProviders | null;
  showActions?: boolean;
  priority?: boolean;
}

const STATUS_BADGES: Record<WatchStatus, { label: string; className: string }> = {
  seen: { label: "Vu", className: "border-emerald-400/50 text-emerald-400" },
  watchlist: { label: "À voir", className: "border-azure-400/50 text-azure-400" },
  dismissed: { label: "Écarté", className: "border-ink-500 text-mist-400" },
};

/**
 * Vignette d'un film. Le statut, la note et le coup de cœur sont lus
 * directement dans la bibliothèque : la carte se met à jour d'elle-même après
 * une action, où qu'elle soit affichée.
 */
export function MovieCard({
  id,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  reasons,
  providers,
  showActions = true,
  priority,
}: MovieCardProps) {
  const entry = useEntry(id);
  const badge = entry ? STATUS_BADGES[entry.status] : null;

  return (
    <article className="group animate-rise">
      <Link
        className="relative block overflow-hidden rounded-xl border border-ink-700 bg-ink-850 transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 group-hover:-translate-y-1 group-hover:border-ink-500"
        href={`/film/?id=${id}`}
      >
        <Poster
          alt={`Affiche du film ${title}`}
          className="h-auto w-full object-cover"
          path={posterPath}
          priority={priority}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <VoteBadge vote={voteAverage ?? 0} />
          {badge && (
            <span
              className={`rounded-full border bg-ink-950/85 px-2 py-0.5 text-xs font-semibold ${badge.className}`}
            >
              {badge.label}
            </span>
          )}
        </div>

        {entry?.favorite && (
          <span
            aria-label="Coup de cœur"
            className="absolute bottom-2 right-2 text-lg drop-shadow"
            title="Coup de cœur"
          >
            ❤️
          </span>
        )}
      </Link>

      <div className="mt-2 space-y-1">
        <h3 className="text-sm font-semibold leading-snug text-mist-200">
          <Link className="hover:text-gold-400" href={`/film/?id=${id}`}>
            {title}
          </Link>
        </h3>
        <p className="text-xs text-mist-400">
          {releaseYear(releaseDate)}
          {entry?.rating != null && (
            <span className="text-gold-400">
              {" "}
              · ma note {entry.rating.toFixed(1).replace(".", ",")}/5
            </span>
          )}
        </p>

        {providers && <ProviderStrip providers={providers} limit={4} />}

        {reasons && reasons.length > 0 && (
          <ul className="space-y-0.5 pt-0.5">
            {reasons.slice(0, 2).map((reason) => (
              <li className="text-xs leading-snug text-mist-400" key={reason}>
                <span aria-hidden className="text-gold-500">
                  ·{" "}
                </span>
                {reason}
              </li>
            ))}
          </ul>
        )}

        {showActions && (
          <div className="pt-1 opacity-90 transition-opacity group-hover:opacity-100">
            <QuickActions compact movieId={id} />
          </div>
        )}
      </div>
    </article>
  );
}
