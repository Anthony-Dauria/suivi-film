"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/Logo";
import {
  ChartIcon,
  HomeIcon,
  LibraryIcon,
  SearchIcon,
  SettingsIcon,
  SparkIcon,
} from "@/components/icons";

interface Destination {
  href: string;
  label: string;
  /** Libellé court affiché sous l'icône de la barre d'onglets. */
  short: string;
  Icon: (props: { className?: string }) => React.ReactElement;
}

const DESTINATIONS: Destination[] = [
  { href: "/", label: "Accueil", short: "Accueil", Icon: HomeIcon },
  { href: "/recherche", label: "Rechercher", short: "Recherche", Icon: SearchIcon },
  { href: "/bibliotheque", label: "Ma bibliothèque", short: "Ma liste", Icon: LibraryIcon },
  { href: "/recommandations", label: "Pour moi", short: "Pour moi", Icon: SparkIcon },
  { href: "/statistiques", label: "Statistiques", short: "Stats", Icon: ChartIcon },
];

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
}

/**
 * Barre supérieure : identité de l'application et accès aux réglages.
 * La navigation principale passe par la barre d'onglets sur mobile, et par des
 * liens horizontaux à partir de la largeur d'une tablette.
 */
export function TopBar() {
  const isActive = useIsActive();

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6 lg:px-8">
        <Link
          className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight"
          href="/"
        >
          <Logo className="size-8 rounded-[7px]" />
          <span>
            Suivi<span className="text-gold-500">Film</span>
          </span>
        </Link>

        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {DESTINATIONS.map((destination) => (
            <li key={destination.href}>
              <Link
                aria-current={isActive(destination.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive(destination.href)
                    ? "bg-ink-800 text-gold-400"
                    : "text-mist-300 hover:bg-ink-850 hover:text-mist-200"
                }`}
                href={destination.href}
              >
                {destination.label}
              </Link>
            </li>
          ))}
        </ul>

        <Link
          aria-label="Réglages"
          aria-current={isActive("/reglages") ? "page" : undefined}
          className={`ml-auto grid size-11 place-items-center rounded-xl border transition-colors md:ml-0 ${
            isActive("/reglages")
              ? "border-gold-500/60 text-gold-400"
              : "border-ink-700 text-mist-300 hover:text-gold-400"
          }`}
          href="/reglages"
        >
          <SettingsIcon className="size-5" />
        </Link>
      </nav>
    </header>
  );
}

/** Barre d'onglets fixée en bas, à portée du pouce (mobile uniquement). */
export function TabBar() {
  const isActive = useIsActive();

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-800 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {DESTINATIONS.map((destination) => {
          const active = isActive(destination.href);
          return (
            <li className="flex-1" key={destination.href}>
              <Link
                aria-current={active ? "page" : undefined}
                className={`relative flex h-[var(--tab-bar-height)] flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                  active ? "text-gold-400" : "text-mist-400"
                }`}
                href={destination.href}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-gold-500"
                  />
                )}
                <span
                  className={`grid size-7 place-items-center rounded-lg transition-colors ${
                    active ? "bg-gold-500/15" : ""
                  }`}
                >
                  <destination.Icon className="size-6" />
                </span>
                {destination.short}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
