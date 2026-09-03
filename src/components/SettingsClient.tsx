"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { ErrorNotice } from "@/components/ui";
import { clearCache } from "@/lib/cache";
import { useApiKey, useIsConfigured, useSettings } from "@/lib/hooks";
import {
  exportDatabase,
  replaceDatabase,
  setStoredApiKey,
  updateSettings,
} from "@/lib/store";
import { getAvailableProviders } from "@/lib/tmdb";
import type { TmdbProvider } from "@/lib/types";

const REGIONS = [
  { code: "FR", label: "France" },
  { code: "BE", label: "Belgique" },
  { code: "CH", label: "Suisse" },
  { code: "CA", label: "Canada" },
  { code: "LU", label: "Luxembourg" },
  { code: "US", label: "États-Unis" },
  { code: "GB", label: "Royaume-Uni" },
];

const LANGUAGES = [
  { code: "fr-FR", label: "Français" },
  { code: "en-US", label: "Anglais" },
  { code: "es-ES", label: "Espagnol" },
  { code: "de-DE", label: "Allemand" },
  { code: "it-IT", label: "Italien" },
];

export function SettingsClient() {
  const settings = useSettings();
  const storedKey = useApiKey();
  const configured = useIsConfigured();

  const [keyDraft, setKeyDraft] = useState("");
  const [providers, setProviders] = useState<TmdbProvider[]>([]);
  const [filter, setFilter] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!configured) {
      setProviders([]);
      return;
    }
    let cancelled = false;
    getAvailableProviders()
      .then((list) => {
        if (!cancelled) setProviders(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [configured, storedKey, settings.region]);

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 2500);
  };

  const visibleProviders = useMemo(() => {
    const normalised = filter.trim().toLowerCase();
    return normalised
      ? providers.filter((provider) => provider.provider_name.toLowerCase().includes(normalised))
      : providers.slice(0, 40);
  }, [providers, filter]);

  const toggleProvider = (id: number) => {
    const next = settings.providers.includes(id)
      ? settings.providers.filter((item) => item !== id)
      : [...settings.providers, id];
    updateSettings({ providers: next });
  };

  const saveKey = () => {
    const trimmed = keyDraft.trim();
    if (!trimmed) return;
    setStoredApiKey(trimmed);
    setKeyDraft("");
    // Les réponses en cache ont pu être produites sans clé valide.
    clearCache();
    notify("Clé enregistrée. Elle reste sur cet appareil.");
  };

  const download = () => {
    const blob = new Blob([`${JSON.stringify(exportDatabase(), null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `suivi-film-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File) => {
    setError(null);
    try {
      const content = JSON.parse(await file.text()) as unknown;
      const database = replaceDatabase(content);
      notify(`${Object.keys(database.entries).length} film(s) importé(s).`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fichier de sauvegarde invalide.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Réglages</h1>
        <p className="mt-1 text-sm text-mist-400">
          Connexion à TMDB, pays, plateformes suivies et sauvegarde de votre bibliothèque.
        </p>
      </div>

      {error && <ErrorNotice message={error} />}
      {message && (
        <p className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-400">
          {message}
        </p>
      )}

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Clé API TMDB</h2>
        <p className="mt-2 text-sm text-mist-300">
          État :{" "}
          {configured ? (
            <span className="font-semibold text-emerald-400">
              {storedKey ? "clé enregistrée sur cet appareil" : "clé fournie par le site"}
            </span>
          ) : (
            <span className="font-semibold text-rose-400">aucune clé configurée</span>
          )}
        </p>

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
            Récupérez votre clé sur{" "}
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
          <li>Collez-la ci-dessous.</li>
        </ol>

        {/* Sur téléphone, le champ occupe toute la largeur : les boutons passent dessous. */}
        <div className="mt-4 space-y-2">
          <input
            aria-label="Clé API TMDB"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 font-mono text-sm outline-none placeholder:text-mist-400 focus:border-gold-500"
            onChange={(event) => setKeyDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") saveKey();
            }}
            placeholder={storedKey ? "Remplacer la clé enregistrée…" : "Collez votre clé TMDB…"}
            type="password"
            value={keyDraft}
          />
          <div className="flex gap-2">
            <button
              className="min-h-11 flex-1 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 disabled:opacity-60 sm:flex-none"
              disabled={!keyDraft.trim()}
              onClick={saveKey}
              type="button"
            >
              Enregistrer
            </button>
            {storedKey && (
              <button
                className="min-h-11 rounded-xl border border-ink-600 px-4 py-2 text-sm"
                onClick={() => {
                  setStoredApiKey(null);
                  clearCache();
                  notify("Clé supprimée de cet appareil.");
                }}
                type="button"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-xs text-mist-400">
          La clé est conservée dans le stockage local de votre navigateur et n&apos;est envoyée
          qu&apos;à l&apos;API TMDB. Elle ne quitte pas cet appareil et n&apos;est pas incluse dans
          les sauvegardes exportées.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Pays et langue</h2>
        <p className="mt-1 text-sm text-mist-400">
          Le pays détermine les plateformes de streaming et les dates de sortie affichées.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400">
            Pays
            <select
              className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm normal-case text-mist-200"
              onChange={(event) => {
                updateSettings({ region: event.target.value });
                clearCache();
              }}
              value={settings.region}
            >
              {REGIONS.map((region) => (
                <option key={region.code} value={region.code}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-mist-400">
            Langue des fiches
            <select
              className="h-12 rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm normal-case text-mist-200"
              onChange={(event) => {
                updateSettings({ language: event.target.value });
                clearCache();
              }}
              value={settings.language}
            >
              {LANGUAGES.map((language) => (
                <option key={language.code} value={language.code}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Mes plateformes</h2>
        <p className="mt-1 text-sm text-mist-400">
          Sélectionnez vos abonnements pour filtrer les recommandations sur ce que vous pouvez
          réellement regarder ce soir.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-mist-300">
          <input
            checked={settings.onlyMyProviders}
            className="size-4 accent-[var(--color-gold-500)]"
            onChange={(event) => updateSettings({ onlyMyProviders: event.target.checked })}
            type="checkbox"
          />
          Filtrer les recommandations sur mes plateformes par défaut
        </label>

        <input
          aria-label="Rechercher une plateforme"
          className="mt-4 h-12 w-full rounded-xl border border-ink-600 bg-ink-900 px-3 text-sm outline-none placeholder:text-mist-400 focus:border-gold-500"
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Rechercher une plateforme (Netflix, Canal+, Disney…)"
          type="search"
          value={filter}
        />

        {providers.length === 0 ? (
          <p className="mt-4 text-sm text-mist-400">
            {configured
              ? "Chargement des plateformes…"
              : "Renseignez votre clé API pour charger la liste des plateformes."}
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {visibleProviders.map((provider) => {
              const selected = settings.providers.includes(provider.provider_id);
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
          Votre bibliothèque est enregistrée dans ce navigateur, sur cet appareil. Exportez-la
          régulièrement : vider les données du site l&apos;effacerait définitivement.
        </p>
        <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap sm:gap-3">
          <button
            className="min-h-11 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950"
            onClick={download}
            type="button"
          >
            Exporter ma bibliothèque
          </button>
          <button
            className="min-h-11 rounded-xl border border-ink-600 px-4 py-2 text-sm font-medium"
            onClick={() => fileInput.current?.click()}
            type="button"
          >
            Importer une sauvegarde
          </button>
          <button
            className="min-h-11 rounded-xl border border-ink-600 px-4 py-2 text-sm font-medium"
            onClick={() => {
              clearCache();
              notify("Cache des fiches TMDB vidé.");
            }}
            type="button"
          >
            Vider le cache TMDB
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
