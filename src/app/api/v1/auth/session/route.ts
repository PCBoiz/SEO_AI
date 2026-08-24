import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    return Response.json(
      { identity },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
