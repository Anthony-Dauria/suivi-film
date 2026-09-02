import Image from "next/image";

import type { WatchProviders } from "@/lib/types";

/** Bandeau compact des plateformes d'abonnement disponibles pour un film. */
export function ProviderStrip({
  providers,
  limit = 5,
}: {
  providers: WatchProviders;
  limit?: number;
}) {
  const streaming = [...providers.flatrate, ...providers.free, ...providers.ads];
  const unique = streaming.filter(
    (provider, index, list) =>
      list.findIndex((item) => item.provider_id === provider.provider_id) === index,
  );

  if (unique.length === 0) {
    const paid = providers.rent.length + providers.buy.length > 0;
    return (
      <p className="pt-0.5 text-xs text-mist-400">
        {paid ? "Location / achat uniquement" : "Pas de streaming détecté"}
      </p>
    );
  }

  return (
    <ul className="flex flex-wrap items-center gap-1 pt-0.5">
      {unique.slice(0, limit).map((provider) => (
        <li key={provider.provider_id}>
          {provider.logo_path ? (
            <Image
              alt={provider.provider_name}
              className="rounded-[6px] border border-ink-700"
              height={24}
              src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
              title={`Inclus avec ${provider.provider_name}`}
              width={24}
            />
          ) : (
            <span className="rounded border border-ink-700 px-1 text-[10px] text-mist-400">
              {provider.provider_name}
            </span>
          )}
        </li>
      ))}
      {unique.length > limit && (
        <li className="text-xs text-mist-400">+{unique.length - limit}</li>
      )}
    </ul>
  );
}
