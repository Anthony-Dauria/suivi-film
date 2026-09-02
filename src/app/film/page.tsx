import type { Metadata } from "next";
import { Suspense } from "react";

import { MovieClient } from "@/components/MovieClient";

export const metadata: Metadata = { title: "Fiche film" };

export default function MoviePage() {
  return (
    <Suspense
      fallback={<p className="py-16 text-center text-sm text-mist-400">Chargement de la fiche…</p>}
    >
      <MovieClient />
    </Suspense>
  );
}
