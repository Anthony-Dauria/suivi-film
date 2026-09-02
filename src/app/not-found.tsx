import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="text-5xl">🎬</p>
      <h1 className="mt-4 text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-sm text-mist-400">
        Ce film ou cette page n&apos;existe pas (ou plus) dans notre catalogue.
      </p>
      <Link
        className="mt-6 inline-block rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-ink-950 hover:bg-gold-400"
        href="/"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
