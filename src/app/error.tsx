"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="text-5xl">⚠️</p>
      <h1 className="mt-4 text-2xl font-bold">Une erreur est survenue</h1>
      <p className="mt-2 text-sm text-mist-400">
        {error.message || "Réessayez, ou vérifiez votre configuration TMDB."}
      </p>
      <button
        className="mt-6 rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-400"
        onClick={reset}
        type="button"
      >
        Réessayer
      </button>
    </div>
  );
}
