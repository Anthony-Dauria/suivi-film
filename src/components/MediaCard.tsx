"use client";

import Link from "next/link";

import { Poster } from "@/components/Poster";
import { ProviderStrip } from "@/components/ProviderStrip";
import { QuickActions } from "@/components/QuickActions";
import { StatusBanner } from "@/components/StatusBanner";
import { VoteBadge } from "@/components/VoteBadge";
import { mediaHref, type CardData } from "@/lib/cards";
import { releaseYear } from "@/lib/format";
import { useEntry } from "@/lib/hooks";
import type { WatchProviders } from "@/lib/types";

export interface MediaCardProps extends CardData {
  /** Raisons de la suggestion, affichées sous l'affiche. */
  reasons?: string[];
  providers?: WatchProviders | null;
  showActions?: boolean;
  priority?: boolean;
}

/**
 * Vignette d'un film ou d'une série. Le statut est lu directement dans la
 * bibliothèque : la carte se met à jour d'elle-même après une action, où
 * qu'elle soit affichée.
 */
export function MediaCard({
  id,
  mediaType,
  title,
  posterPath,
  releaseDate,
  voteAverage,
  seasonCount,
  reasons,
  providers,
  showActions = true,
  priority,
}: MediaCardProps) {
  const entry = useEntry(mediaType, id);
  const href = mediaHref(mediaType, id);

  const ring =
    entry?.status === "seen"
      ? "border-emerald-400/60"
      : entry?.status === "watchlist"
        ? "border-azure-400/60"
        : entry?.status === "dismissed"
          ? "border-ink-600 opacity-60"
          : "border-ink-700";

  const seasons = seasonCount ?? entry?.media.seasonCount;
  const meta = [
    releaseYear(releaseDate),
    mediaType === "tv"
      ? seasons
        ? `${seasons} saison${seasons > 1 ? "s" : ""}`
        : "Série"
      : null,
  ].filter(Boolean);

  return (
    <article className="animate-rise flex h-full flex-col gap-2">
      <Link
        className={`relative block overflow-hidden rounded-xl border bg-ink-850 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 ${ring}`}
        href={href}
      >
        <Poster
          alt={`Affiche de ${title}`}
          className="h-auto w-full object-cover"
          path={posterPath}
          priority={priority}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2">
          <VoteBadge vote={voteAverage ?? 0} />
          {mediaType === "tv" && (
            <span className="rounded-full border border-azure-400/50 bg-ink-950/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-azure-400">
              Série
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-1.5">
        <h3 className="text-sm font-semibold leading-snug text-mist-200">
          <Link className="active:text-gold-400" href={href}>
            {title}
          </Link>
        </h3>
        <p className="text-xs text-mist-400">{meta.join(" · ")}</p>

        <StatusBanner entry={entry} />

        {providers && <ProviderStrip providers={providers} limit={4} />}

        {reasons && reasons.length > 0 && (
          <ul className="space-y-0.5">
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
          <div className="mt-auto pt-1">
            <QuickActions id={id} mediaType={mediaType} title={title} />
          </div>
        )}
      </div>
    </article>
  );
}
