import type { NextRequest } from "next/server";
import { z } from "zod";
import { oauthIntents, oauthProviderIds } from "@/domain/auth/oauth";
import { AppError } from "@/domain/shared/app-error";
import { getCurrentIdentity } from "@/lib/auth/dal";
import { beginOAuth } from "@/lib/auth/oauth.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const inputSchema = z.object({
  provider: z.enum(oauthProviderIds),
  intent: z.enum(oauthIntents),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const parsed = inputSchema.safeParse({
    provider: (await params).provider,
    intent: request.nextUrl.searchParams.get("intent") ?? "login",
  });
  if (!parsed.success) {
    return Response.redirect(new URL("/login?oauth_error=invalid_request", request.url));
  }

  try {
    const identity = await getCurrentIdentity();
    const target = await beginOAuth(
      parsed.data.provider,
      parsed.data.intent,
      identity,
    );
    return Response.redirect(target);
  } catch (error) {
    const destination = parsed.data.intent === "login" ? "/login" : "/settings";
    const code = error instanceof AppError ? error.code.toLowerCase() : "start_failed";
    return Response.redirect(
      new URL(`${destination}?oauth_error=${encodeURIComponent(code)}`, request.url),
    );
  }
}
