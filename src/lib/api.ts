import "server-only";

import { NextResponse } from "next/server";

import { TmdbError } from "./tmdb";

/** Convertit une exception en réponse JSON lisible par l'interface. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof TmdbError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { error: "Une erreur inattendue est survenue côté serveur." },
    { status: 500 },
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new TmdbError("Corps de requête JSON invalide.", 400);
  }
}
