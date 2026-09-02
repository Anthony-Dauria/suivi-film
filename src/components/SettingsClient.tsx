"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorNotice } from "@/components/ui";
import { saveSettings } from "@/lib/client";
import type { Settings, TmdbProvider } from "@/lib/types";

interface SettingsClientProps {
  configured: boolean;
  region: string;
}

export function SettingsClient({ configured, region }: SettingsClientProps) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [providers, setProviders] = useState<TmdbProvider[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((response) => response.json())
      .then((data: { settings: Settings }) => setSettings(data.settings))
      .catch(() => setError("Impossible de lire les réglages."));

    if (configured) {
      fetch("/api/providers")
        .then((response) => response.json())
        .then((data: { providers?: TmdbProvider[] }) => setProviders(data.providers ?? []))
        .catch(() => undefined);
    }
  }, [configured]);

  const visibleProviders = useMemo(() => {
    const normalised = filter.trim().toLowerCase();
    const list = normalised
      ? providers.filter((provider) => provider.provider_name.toLowerCase().includes(normalised))
      : providers.slice(0, 40);
    return list;
  }, [providers, filter]);

  const persist = async (patch: Partial<Settings>) => {
    setError(null);
    try {
      const updated = await saveSettings(patch);
      setSettings(updated);
      setMessage("Réglages enregistrés.");
      setTimeout(() => setMessage(null), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    }
  };

  const toggleProvider = (id: number) => {
    if (!settings) return;
    const next = settings.providers.includes(id)
      ? settings.providers.filter((item) => item !== id)
      : [...settings.providers, id];
    void persist({ providers: next });
  };

  const importBackup = async (file: File) => {
    setError(null);
    try {
      const content = JSON.parse(await file.text()) as unknown;
      const response = await fetch("/api/sauvegarde", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      const data = (await response.json()) as { count?: number; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Import impossible.");
      setMessage(`${data.count ?? 0} film(s) importe(s). Rechargez la page.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fichier de sauvegarde invalide.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Réglages</h1>
        <p className="mt-1 text-sm text-mist-400">
          Connexion à TMDB, plateformes suivies et sauvegarde de votre bibliothèque.
        </p>
      </div>

      {error && <ErrorNotice message={error} />}
      {message && (
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-400">
          {message}
        </p>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Connexion à TMDB</h2>
        <p className="mt-2 text-sm text-mist-300">
          État :{" "}
          {configured ? (
            <span className="font-semibold text-emerald-400">clé détectée</span>
          ) : (
            <span className="font-semibold text-rose-400">aucune clé configuree</span>
          )}{" "}
          · Pays des disponibilités : <span className="font-semibold">{region}</span>
        </p>
        {!configured && (
          <ol className="mt-3 list-inside list-decimal space-y-1 text-sm text-mist-300">
            <li>
              Créez un compte gratuit sur{" "}
              <a
                className="text-gold-400 underline-offset-2 hover:underline"
                href="https://www.themoviedb.org/signup"
                rel="noreferrer"
                target="_blank"
              >
                themoviedb.org
              </a>
              .
            </li>
            <li>
              Recuperez votre clé sur{" "}
              <a
                className="text-gold-400 underline-offset-2 hover:underline"
                href="https://www.themoviedb.org/settings/api"
                rel="noreferrer"
                target="_blank"
              >
                la page API
              </a>{" "}
              (clé v3 ou jeton v4, les deux fonctionnent).
            </li>
            <li>
              Créez un fichier <code className="text-gold-400">.env.local</code> à la racine du
              projet contenant <code className="text-gold-400">TMDB_API_KEY=votre_clé</code>.
            </li>
            <li>Relancez la commande <code className="text-gold-400">npm run dev</code>.</li>
          </ol>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Mes plateformes</h2>
        <p className="mt-1 text-sm text-mist-400">
          Sélectionnez vos abonnements pour filtrer les recommandations sur ce que vous pouvez
          réellement regarder ce soir.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-mist-300">
          <input
            checked={settings?.onlyMyProviders ?? false}
            className="size-4 accent-[var(--color-gold-500)]"
            onChange={(event) => void persist({ onlyMyProviders: event.target.checked })}
            type="checkbox"
          />
          Filtrer les recommandations sur mes plateformes par défaut
        </label>

        <input
          aria-label="Rechercher une plateforme"
          className="mt-4 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 py-2 text-sm outline-none placeholder:text-mist-400 focus:border-gold-500"
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Rechercher une plateforme (Netflix, Canal+, Disney…)"
          type="search"
          value={filter}
        />

        {providers.length === 0 ? (
          <p className="mt-4 text-sm text-mist-400">
            {configured
              ? "Chargement des plateformes…"
              : "Configurez la clé API pour charger la liste des plateformes."}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProviders.map((provider) => {
              const selected = settings?.providers.includes(provider.provider_id) ?? false;
              return (
                <li key={provider.provider_id}>
                  <button
                    aria-pressed={selected}
                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                      selected
                        ? "border-gold-500 bg-gold-500/10 text-gold-400"
                        : "border-ink-600 text-mist-200 hover:border-gold-500/50"
                    }`}
                    onClick={() => toggleProvider(provider.provider_id)}
                    type="button"
                  >
                    {provider.logo_path && (
                      <Image
                        alt=""
                        className="rounded-md"
                        height={24}
                        src={`https://image.tmdb.org/t/p/w45${provider.logo_path}`}
                        width={24}
                      />
                    )}
                    <span className="truncate">{provider.provider_name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Sauvegarde</h2>
        <p className="mt-1 text-sm text-mist-400">
          Votre bibliothèque est stockée localement dans un simple fichier JSON. Exportez-la pour la
          conserver ou la transférer.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-gold-400"
            href="/api/sauvegarde"
          >
            Exporter ma bibliothèque
          </a>
          <button
            className="rounded-xl border border-ink-600 px-4 py-2 text-sm font-medium transition-colors hover:border-gold-500/60 hover:text-gold-400"
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            Importer une sauvegarde
          </button>
          <input
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importBackup(file);
              event.target.value = "";
            }}
            ref={fileInput}
            type="file"
          />
        </div>
        <p className="mt-2 text-xs text-mist-400">
          L&apos;import remplace intégralement la bibliothèque existante.
        </p>
      </section>
    </div>
  );
}
