import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getEntry } from "@/lib/store";
import { getMovieDetails } from "@/lib/tmdb";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const movieId = Number(id);
    if (!Number.isInteger(movieId) || movieId <= 0) {
      return NextResponse.json({ error: "Identifiant de film invalide." }, { status: 400 });
    }
    const [details, entry] = await Promise.all([getMovieDetails(movieId), getEntry(movieId)]);
    return NextResponse.json({ details, entry });
  } catch (error) {
    return errorResponse(error);
  }
}
