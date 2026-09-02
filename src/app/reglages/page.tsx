import type { Metadata } from "next";

import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = { title: "Réglages" };

export default function SettingsPage() {
  return <SettingsClient />;
}
