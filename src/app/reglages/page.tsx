import type { Metadata } from "next";

import { SettingsClient } from "@/components/SettingsClient";
import { REGION, isConfigured } from "@/lib/tmdb";

export const metadata: Metadata = { title: "Réglages" };
export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return <SettingsClient configured={isConfigured()} region={REGION} />;
}
