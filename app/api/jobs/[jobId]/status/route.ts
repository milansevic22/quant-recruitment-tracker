import { NextResponse } from "next/server";

import { verifyAdminRequest } from "@/lib/admin-auth";
import { getAdminDb } from "@/lib/firebase/admin";
import type { JobStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_STATUSES = new Set<JobStatus>(["new", "seen", "applied", "ignored"]);

function isJobStatus(value: unknown): value is JobStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as JobStatus);
}

export async function PATCH(
  request: Request,
  { params }: { params: { jobId: string } },
) {
  const authResult = verifyAdminRequest(request);

  if (!authResult.ok) {
    return NextResponse.json(
      { ok: false, error: authResult.message },
      { status: authResult.status },
    );
  }

  if (!params.jobId) {
    return NextResponse.json(
      { ok: false, error: "Missing job id." },
      { status: 400 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const status = (body as { status?: unknown }).status;

  if (!isJobStatus(status)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Status must be one of: new, seen, applied, ignored.",
      },
      { status: 400 },
    );
  }

  try {
    const db = getAdminDb();
    const jobRef = db.collection("jobs").doc(params.jobId);
    const jobSnapshot = await jobRef.get();

    if (!jobSnapshot.exists) {
      return NextResponse.json(
        { ok: false, error: "Job was not found." },
        { status: 404 },
      );
    }

    await jobRef.update({
      status,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      message: "Job status updated.",
      result: {
        jobId: params.jobId,
        status,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "Unknown job status update failure.",
      },
      { status: 500 },
    );
  }
}
