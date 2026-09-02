import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { searchMovies } from "@/lib/tmdb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const page = Number(searchParams.get("page") ?? 1);
    const data = await searchMovies(query, Number.isFinite(page) ? page : 1);
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}
