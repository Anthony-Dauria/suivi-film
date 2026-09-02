import { NextResponse } from "next/server";

import { errorResponse, readJson } from "@/lib/api";
import { computeStats } from "@/lib/stats";
import { getAllEntries, upsertEntry } from "@/lib/store";
import { getMovieDetails, toSnapshot } from "@/lib/tmdb";
import type { WatchStatus } from "@/lib/types";

const STATUSES: WatchStatus[] = ["seen", "watchlist", "dismissed"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const entries = await getAllEntries();
    const filtered =
      status && STATUSES.includes(status as WatchStatus)
        ? entries.filter((entry) => entry.status === status)
        : entries;
    return NextResponse.json({ entries: filtered, stats: computeStats(entries) });
  } catch (error) {
    return errorResponse(error);
  }
}

interface CreateBody {
  movieId?: number;
  status?: WatchStatus;
  rating?: number | null;
  favorite?: boolean;
  watchedAt?: string | null;
  notes?: string;
  rewatchCount?: number;
}

/** Ajoute (ou met à jour) un film : l'instantané est reconstruit depuis TMDB. */
export async function POST(request: Request) {
  try {
    const body = await readJson<CreateBody>(request);
    const movieId = Number(body.movieId);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      return NextResponse.json({ error: "Identifiant de film invalide." }, { status: 400 });
    }
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
    }

    const details = await getMovieDetails(movieId);
    const entry = await upsertEntry({
      status: body.status,
      rating: body.rating,
      favorite: body.favorite,
      watchedAt: body.watchedAt,
      notes: body.notes,
      rewatchCount: body.rewatchCount,
      movie: toSnapshot(details),
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
