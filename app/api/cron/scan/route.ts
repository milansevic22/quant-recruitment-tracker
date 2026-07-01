import { NextResponse } from "next/server";

import { getAdminDb } from "@/lib/firebase/admin";
import { runCareersScan } from "@/lib/scanner/scanner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function verifyCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unauthorized cron request.",
      },
      { status: 401 },
    );
  }

  try {
    const schedule = request.headers.get("x-vercel-cron-schedule");
    const result = await runCareersScan(getAdminDb());

    return NextResponse.json({
      ok: true,
      message: "Scheduled careers-page scan completed.",
      schedule,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown scheduled scan failure.",
      },
      { status: 500 },
    );
  }
}
