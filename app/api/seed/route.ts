import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { seedInitialData } from "@/lib/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authResult = verifyAdminRequest(request);

  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.message },
      { status: authResult.status },
    );
  }

  try {
    const result = await seedInitialData(getAdminDb());

    return NextResponse.json({
      ok: true,
      message: "Initial companies and sample jobs seeded.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown seed failure.",
      },
      { status: 500 },
    );
  }
}
