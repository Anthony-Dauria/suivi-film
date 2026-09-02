import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api";
import { getAvailableProviders } from "@/lib/tmdb";

export async function GET() {
  try {
    return NextResponse.json({ providers: await getAvailableProviders() });
  } catch (error) {
    return errorResponse(error);
  }
}
