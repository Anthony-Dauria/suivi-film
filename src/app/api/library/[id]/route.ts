import { NextResponse } from "next/server";

import { errorResponse, readJson } from "@/lib/api";
import { deleteEntry, getEntry, updateEntry } from "@/lib/store";
import type { WatchStatus } from "@/lib/types";

const STATUSES: WatchStatus[] = ["seen", "watchlist", "dismissed"];

function parseId(id: string): number | null {
  const movieId = Number(id);
  return Number.isInteger(movieId) && movieId > 0 ? movieId : null;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const movieId = parseId((await context.params).id);
    if (!movieId) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    const entry = await getEntry(movieId);
    if (!entry) return NextResponse.json({ error: "Film absent de la bibliothèque." }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}

interface PatchBody {
  status?: WatchStatus;
  rating?: number | null;
  favorite?: boolean;
  watchedAt?: string | null;
  notes?: string;
  rewatchCount?: number;
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const movieId = parseId((await context.params).id);
    if (!movieId) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });

    const body = await readJson<PatchBody>(request);
    if (body.status && !STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Statut inconnu." }, { status: 400 });
    }

    const entry = await updateEntry(movieId, body);
    if (!entry) {
      return NextResponse.json({ error: "Film absent de la bibliothèque." }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const movieId = parseId((await context.params).id);
    if (!movieId) return NextResponse.json({ error: "Identifiant invalide." }, { status: 400 });
    const removed = await deleteEntry(movieId);
    if (!removed) {
      return NextResponse.json({ error: "Film absent de la bibliothèque." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
