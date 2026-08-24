import { requireApiIdentity } from "@/lib/auth/dal";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    await requireApiIdentity();
    return Response.json(
      { providers: listAiProviderStatuses() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
