import type { Metadata, Viewport } from "next";

import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SetupBanner } from "@/components/SetupBanner";

export const metadata: Metadata = {
  title: {
    default: "Suivi Film",
    template: "%s · Suivi Film",
  },
  description:
    "Votre carnet de films : bibliothèque personnelle, fiches détaillées, plateformes de streaming et recommandations sur mesure.",
};

export const viewport: Viewport = {
  themeColor: "#07090e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <NavBar />
        <SetupBanner />
        <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-ink-800 py-8 text-center text-xs text-mist-400">
          Donnees fournies par{" "}
          <a
            className="text-gold-500 underline-offset-2 hover:underline"
            href="https://www.themoviedb.org/"
            rel="noreferrer"
            target="_blank"
          >
            TMDB
          </a>{" "}
          · disponibilités de streaming fournies par JustWatch. Ce produit utilise l&apos;API TMDB
          sans être approuve ou certifie par TMDB.
        </footer>
      </body>
    </html>
  );
}
