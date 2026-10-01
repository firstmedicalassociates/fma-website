import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../lib/admin-auth";
import {
  getUniqodeClient,
  parseQrRange,
  UniqodeError,
} from "../../../lib/uniqode.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const auth = await requireAdminRequest(request, "qr-codes.view");
  if (!auth.ok) return auth.response;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const params = new URL(request.url).searchParams;
    const range = parseQrRange(params);
    const client = getUniqodeClient();
    const data = params.has("id")
      ? await client.detail(params.get("id"), range)
      : await client.overview(range);
    return NextResponse.json({ ok: true, ...data }, { headers });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof UniqodeError
            ? error.message
            : "QR codes could not be loaded. Please retry.",
      },
      { status: error instanceof UniqodeError ? error.status : 503, headers },
    );
  }
}
