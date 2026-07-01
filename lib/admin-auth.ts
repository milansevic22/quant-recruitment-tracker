export interface AdminAuthResult {
  ok: boolean;
  status: number;
  message?: string;
}

export function verifyAdminRequest(request: Request): AdminAuthResult {
  const expectedSecret = process.env.ADMIN_API_SECRET;

  if (!expectedSecret) {
    return {
      ok: false,
      status: 500,
      message: "ADMIN_API_SECRET is not configured.",
    };
  }

  const providedSecret =
    request.headers.get("x-admin-secret") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (providedSecret !== expectedSecret) {
    return {
      ok: false,
      status: 401,
      message: "Missing or invalid admin secret.",
    };
  }

  return {
    ok: true,
    status: 200,
  };
}
