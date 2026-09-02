/** Bandeau affiché tant que la clé API TMDB n'est pas configuree. */
export function SetupBanner() {
  return (
    <div className="border-b border-gold-600/40 bg-gold-500/10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 text-sm sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:px-8">
        <strong className="text-gold-400">Configuration requise</strong>
        <p className="text-mist-300">
          Ajoutez votre clé API TMDB dans un fichier <code className="text-gold-400">.env.local</code>{" "}
          (<code className="text-gold-400">TMDB_API_KEY=…</code>) puis relancez l&apos;application
          pour activer la recherche, les fiches et les recommandations.
        </p>
        <a
          className="shrink-0 rounded-lg border border-gold-600/60 px-3 py-1.5 text-gold-400 transition-colors hover:bg-gold-500/15"
          href="https://www.themoviedb.org/settings/api"
          rel="noreferrer"
          target="_blank"
        >
          Obtenir une clé gratuite
        </a>
      </div>
    </div>
  );
}
