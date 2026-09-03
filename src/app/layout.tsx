import type { Metadata, Viewport } from "next";

import "./globals.css";
import { TabBar, TopBar } from "@/components/AppShell";
import { SetupBanner } from "@/components/SetupBanner";
import { ToastHost } from "@/components/ToastHost";

export const metadata: Metadata = {
  title: {
    default: "Suivi Film",
    template: "%s · Suivi Film",
  },
  description:
    "Votre carnet de films : bibliothèque personnelle, fiches détaillées, plateformes de streaming et recommandations sur mesure.",
  applicationName: "Suivi Film",
  // Ouverture en plein écran depuis l'écran d'accueil iOS.
  appleWebApp: {
    capable: true,
    title: "SuiviFilm",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#07090e",
  width: "device-width",
  initialScale: 1,
  // Le zoom reste possible : le désactiver nuirait à l'accessibilité.
  maximumScale: 5,
  // Le fond passe sous l'encoche et la barre d'accueil.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans antialiased">
        <TopBar />
        <SetupBanner />
        <main className="pb-tab-bar mx-auto w-full max-w-7xl px-4 pt-5 sm:px-6 lg:px-8 md:pb-16">
          {children}
        </main>
        <footer className="pb-tab-bar border-t border-ink-800 px-4 pt-6 text-center text-xs text-mist-400 md:pb-8">
          Données fournies par{" "}
          <a
            className="text-gold-500 underline-offset-2 hover:underline"
            href="https://www.themoviedb.org/"
            rel="noreferrer"
            target="_blank"
          >
            TMDB
          </a>{" "}
          · disponibilités de streaming fournies par JustWatch.
        </footer>
        <TabBar />
        <ToastHost />
      </body>
    </html>
  );
}
