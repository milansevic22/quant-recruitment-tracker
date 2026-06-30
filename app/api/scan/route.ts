import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import { runCareersScan } from "@/lib/scanner/scanner";

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
    const result = await runCareersScan(getAdminDb());

    return NextResponse.json({
      ok: true,
      message: "Careers-page scan completed.",
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown scan failure.",
      },
      { status: 500 },
    );
  }
}
