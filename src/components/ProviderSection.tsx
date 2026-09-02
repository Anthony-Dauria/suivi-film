import Image from "next/image";

import type { TmdbProvider, WatchProviders } from "@/lib/types";

interface Group {
  key: keyof Omit<WatchProviders, "link">;
  label: string;
  hint: string;
}

const GROUPS: Group[] = [
  { key: "flatrate", label: "Inclus avec un abonnement", hint: "Streaming illimité" },
  { key: "free", label: "Gratuit", hint: "Sans abonnement" },
  { key: "ads", label: "Gratuit avec publicité", hint: "Financement publicitaire" },
  { key: "rent", label: "Location", hint: "A l'acte" },
  { key: "buy", label: "Achat", hint: "Definitif" },
];

function ProviderList({ providers, link }: { providers: TmdbProvider[]; link: string | null }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {providers.map((provider) => {
        const content = (
          <span className="flex items-center gap-2 rounded-xl border border-ink-700 bg-ink-900/70 px-2.5 py-2 text-sm transition-colors hover:border-gold-500/60">
            {provider.logo_path ? (
              <Image
                alt=""
                className="rounded-md"
                height={28}
                src={`https://image.tmdb.org/t/p/w92${provider.logo_path}`}
                width={28}
              />
            ) : null}
            <span>{provider.provider_name}</span>
          </span>
        );

        return (
          <li key={provider.provider_id}>
            {link ? (
              <a href={link} rel="noreferrer" target="_blank" title="Ouvrir sur JustWatch">
                {content}
              </a>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Où regarder le film : abonnements, gratuit, location et achat. */
export function ProviderSection({
  providers,
  region,
}: {
  providers: WatchProviders;
  region: string;
}) {
  const available = GROUPS.filter((group) => providers[group.key].length > 0);

  return (
    <section aria-labelledby="ou-regarder" className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" id="ou-regarder">
          Où regarder ce film
        </h2>
        <span className="text-xs text-mist-400">Disponibilités en {region}</span>
      </div>

      {available.length === 0 ? (
        <p className="mt-3 text-sm text-mist-400">
          Aucune offre de visionnage n&apos;est référencée pour ce film dans votre pays. Il est
          peut-être encore en salles, ou pas encore distribué.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {available.map((group) => (
            <div key={group.key}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-mist-400">
                {group.label}
              </h3>
              <ProviderList link={providers.link} providers={providers[group.key]} />
            </div>
          ))}
        </div>
      )}

      {providers.link && (
        <a
          className="mt-4 inline-block text-sm text-gold-400 underline-offset-2 hover:underline"
          href={providers.link}
          rel="noreferrer"
          target="_blank"
        >
          Voir toutes les offres sur JustWatch →
        </a>
      )}
    </section>
  );
}
