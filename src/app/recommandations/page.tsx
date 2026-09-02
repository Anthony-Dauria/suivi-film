import type { Metadata } from "next";

import { RecommendationsClient } from "@/components/RecommendationsClient";

export const metadata: Metadata = { title: "Recommandations" };

export default function RecommendationsPage() {
  return <RecommendationsClient />;
}
