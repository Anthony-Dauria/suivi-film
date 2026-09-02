import type { Metadata } from "next";
import { Suspense } from "react";

import { SearchClient } from "@/components/SearchClient";

export const metadata: Metadata = { title: "Rechercher" };

export default function SearchPage() {
  return (
    <Suspense fallback={<p className="text-sm text-mist-400">Chargement…</p>}>
      <SearchClient />
    </Suspense>
  );
}
