import type { Metadata } from "next";

import { StatsClient } from "@/components/StatsClient";

export const metadata: Metadata = { title: "Statistiques" };

export default function StatsPage() {
  return <StatsClient />;
}
