import { NextResponse } from "next/server";

import { errorResponse, readJson } from "@/lib/api";
import { getSettings, updateSettings } from "@/lib/store";
import { isConfigured } from "@/lib/tmdb";
import type { Settings } from "@/lib/types";

export async function GET() {
  try {
    return NextResponse.json({ settings: await getSettings(), configured: isConfigured() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await readJson<Partial<Settings>>(request);
    const patch: Partial<Settings> = {};

    if (Array.isArray(body.providers)) {
      patch.providers = body.providers
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
        .slice(0, 50);
    }
    if (typeof body.onlyMyProviders === "boolean") patch.onlyMyProviders = body.onlyMyProviders;
    if (typeof body.region === "string" && /^[A-Z]{2}$/.test(body.region)) {
      patch.region = body.region;
    }

    return NextResponse.json({ settings: await updateSettings(patch) });
  } catch (error) {
    return errorResponse(error);
  }
}
