import type { NextRequest } from "next/server";
import { z } from "zod";
import { oauthProviderIds } from "@/domain/auth/oauth";
import { AppError } from "@/domain/shared/app-error";
import { logger } from "@/infrastructure/observability/logger";
import { getCurrentIdentity } from "@/lib/auth/dal";
import { completeOAuth } from "@/lib/auth/oauth.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<Response> {
  const parsedProvider = z.enum(oauthProviderIds).safeParse((await params).provider);
  if (!parsedProvider.success) {
    return Response.redirect(new URL("/login?oauth_error=invalid_provider", request.url));
  }

  try {
    const result = await completeOAuth(
      parsedProvider.data,
      request.nextUrl.searchParams,
      await getCurrentIdentity(),
    );
    return Response.redirect(new URL(result.redirectPath, request.url));
  } catch (error) {
    logger.warn(
      {
        provider: parsedProvider.data,
        errorCode: error instanceof AppError ? error.code : "OAUTH_CALLBACK_FAILED",
        errorType: error instanceof Error ? error.name : "unknown",
      },
      "OAuth callback failed",
    );
    const code = error instanceof AppError ? error.code.toLowerCase() : "callback_failed";
    const destination = (await getCurrentIdentity()) ? "/settings" : "/login";
    return Response.redirect(
      new URL(`${destination}?oauth_error=${encodeURIComponent(code)}`, request.url),
    );
  }
}
