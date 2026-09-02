"use client";

import Link from "next/link";

import { useIsConfigured } from "@/lib/hooks";

/** Bandeau affiché tant qu'aucune clé API TMDB n'est disponible. */
export function SetupBanner() {
  const configured = useIsConfigured();
  if (configured) return null;

  return (
    <div className="border-b border-gold-600/40 bg-gold-500/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 text-sm sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:px-8">
        <strong className="text-gold-400">Configuration requise</strong>
        <p className="text-mist-300">
          Collez votre clé API TMDB (gratuite) pour activer la recherche, les fiches et les
          recommandations. Elle reste sur cet appareil et n&apos;est envoyée qu&apos;à TMDB.
        </p>
        <Link
          className="shrink-0 rounded-lg border border-gold-600/60 px-3 py-1.5 text-gold-400 transition-colors hover:bg-gold-500/15"
          href="/reglages"
        >
          Configurer ma clé
        </Link>
      </div>
    </div>
  );
}
