import type { Metadata } from "next";

import { LibraryClient } from "@/components/LibraryClient";

export const metadata: Metadata = { title: "Ma bibliothèque" };

const TABS = ["seen", "watchlist", "dismissed", "favorites", "all"] as const;
type Tab = (typeof TABS)[number];

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;
  const initialTab: Tab = TABS.includes(statut as Tab) ? (statut as Tab) : "seen";
  return <LibraryClient initialTab={initialTab} />;
}
