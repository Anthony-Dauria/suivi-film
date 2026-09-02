import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getRecommendations } from "@/lib/reco";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") ?? 24);
    const genreId = Number(searchParams.get("genre") ?? 0);
    const maxRuntime = Number(searchParams.get("duree") ?? 0);

    const { items, profile } = await getRecommendations({
      limit: Number.isFinite(limit) ? Math.min(60, Math.max(1, limit)) : 24,
      genreId: Number.isInteger(genreId) && genreId > 0 ? genreId : undefined,
      maxRuntime: Number.isFinite(maxRuntime) && maxRuntime > 0 ? maxRuntime : undefined,
      onlyMyProviders: searchParams.get("plateformes") === "1" ? true : undefined,
    });

    return NextResponse.json({
      items,
      profile: {
        seenCount: profile.seenCount,
        isRich: profile.isRich,
        topGenres: profile.genres.slice(0, 5),
        topPeople: profile.people.slice(0, 5),
        topKeywords: profile.keywords.slice(0, 8),
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
