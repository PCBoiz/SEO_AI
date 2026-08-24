import { after } from "next/server";
import { ValidationError } from "@/domain/shared/app-error";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity, requirePermission } from "@/lib/auth/dal";
import { runSitemapJobAppNative } from "@/lib/sitemap/app-native-sitemap-executor.server";
import { getSitemapPilotService } from "@/lib/sitemap/sitemap-pilot-service.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// after() chạy trong cùng invocation — cần đủ thời gian cho hai lần gọi model.
export const maxDuration = 300;

// Lịch sử run Sitemap của dự án — cho dropdown preset input + xem lại output.
export async function GET(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      throw new ValidationError(
        "PROJECT_ID_REQUIRED",
        "Thiếu projectId để xem lịch sử.",
      );
    }
    const limit = Number(url.searchParams.get("limit") ?? "10");
    const jobs = await getSitemapPilotService().listHistory(
      identity,
      projectId,
      Number.isFinite(limit) ? limit : 10,
    );
    return Response.json(
      { jobs },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requirePermission("pipeline.run");
    const input = stripLegacyFlags(await readJson(request));
    const job = await getSitemapPilotService().create(identity, input);
    // App-native: trả response ngay (UI polling), phần gọi model chạy nền sau
    // response bằng API key BYOK của chính user đang đăng nhập.
    if (["queued", "dispatching"].includes(job.status)) {
      const { workspaceId, userId } = identity;
      after(() => runSitemapJobAppNative(workspaceId, userId, job.id));
    }
    return Response.json(
      { job },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

// Input schema dùng .strict() nên phải bỏ cờ cũ confirmLiveExecution nếu client
// phiên bản trước còn gửi lên, tránh job hỏng trong lúc người dùng chưa tải lại tab.
function stripLegacyFlags(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = { ...(value as Record<string, unknown>) };
  delete input.confirmLiveExecution;
  return input;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError(
      "INVALID_JSON",
      "Nội dung yêu cầu phải là JSON hợp lệ.",
    );
  }
}
