import { NextResponse } from "next/server";

import { errorResponse, readJson } from "@/lib/api";
import { exportDatabase, replaceDatabase } from "@/lib/store";

/** Export complet de la bibliothèque (fichier JSON telechargeable). */
export async function GET() {
  try {
    const database = await exportDatabase();
    return new NextResponse(`${JSON.stringify(database, null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="suivi-film-${new Date()
          .toISOString()
          .slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Import d'une sauvegarde : remplace intégralement la bibliothèque. */
export async function POST(request: Request) {
  try {
    const body = await readJson<unknown>(request);
    const database = await replaceDatabase(body);
    return NextResponse.json({
      ok: true,
      count: Object.keys(database.entries).length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
