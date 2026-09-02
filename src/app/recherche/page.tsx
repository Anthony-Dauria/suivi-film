import type { Metadata } from "next";

import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = { title: "Rechercher" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  return <SearchClient initialQuery={q ?? ""} />;
}
