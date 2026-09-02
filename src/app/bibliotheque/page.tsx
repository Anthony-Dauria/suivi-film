import type { Metadata } from "next";
import { Suspense } from "react";

import { LibraryClient } from "@/components/LibraryClient";

export const metadata: Metadata = { title: "Ma bibliothèque" };

export default function LibraryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-mist-400">Chargement…</p>}>
      <LibraryClient />
    </Suspense>
  );
}
