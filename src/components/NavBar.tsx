"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Logo } from "@/components/Logo";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/recherche", label: "Rechercher" },
  { href: "/bibliotheque", label: "Ma bibliothèque" },
  { href: "/recommandations", label: "Pour moi" },
  { href: "/statistiques", label: "Statistiques" },
  { href: "/reglages", label: "Réglages" },
];

export function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-800 bg-ink-950/85 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link className="flex items-center gap-2 text-lg font-semibold tracking-tight" href="/">
          <Logo className="size-7 rounded-[6px]" />
          <span>
            Suivi<span className="text-gold-500">Film</span>
          </span>
        </Link>

        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                aria-current={isActive(link.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive(link.href)
                    ? "bg-ink-800 text-gold-400"
                    : "text-mist-300 hover:bg-ink-850 hover:text-mist-200"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          aria-expanded={open}
          aria-label="Ouvrir le menu"
          className="ml-auto rounded-lg border border-ink-700 px-3 py-2 text-sm text-mist-300 md:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          ☰
        </button>
      </nav>

      {open && (
        <ul className="border-t border-ink-800 px-4 pb-3 md:hidden">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                className={`block rounded-lg px-3 py-2 text-sm ${
                  isActive(link.href) ? "text-gold-400" : "text-mist-300"
                }`}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
