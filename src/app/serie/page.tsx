import type { Metadata } from "next";
import { Suspense } from "react";

import { MediaClient } from "@/components/MediaClient";

export const metadata: Metadata = { title: "Fiche série" };

export default function SeriesPage() {
  return (
    <Suspense
      fallback={<p className="py-16 text-center text-sm text-mist-400">Chargement de la fiche…</p>}
    >
      <MediaClient mediaType="tv" />
    </Suspense>
  );
}
