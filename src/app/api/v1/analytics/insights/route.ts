import { ValidationError } from "@/domain/shared/app-error";
import { aiProviderIds, type AiProviderId } from "@/domain/ai/ai-model-provider";
import { listModuleDefinitions } from "@/domain/modules/module-definition";
import "@/domain/modules/registry";
import type { ModuleJob } from "@/domain/modules/module-job";
import { errorResponse } from "@/lib/api-response";
import { requireApiIdentity } from "@/lib/auth/dal";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getUserAiModelProvider } from "@/lib/ai/ai-provider-registry.server";
import {
  layHieuQuaTimKiem,
  type HieuQuaTimKiem,
} from "@/lib/seo/search-console.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Nhận định AI trên dữ liệu nội bộ (module_jobs): gom số liệu → gọi model bằng
// API key BYOK của chính user → trả khuyến nghị hành động. On-demand (nút bấm).
export async function POST(request: Request): Promise<Response> {
  try {
    const identity = await requireApiIdentity();
    const body = (await request.json().catch(() => ({}))) as {
      provider?: unknown;
      model?: unknown;
    };
    const provider = body.provider;
    if (typeof provider !== "string" || !aiProviderIds.includes(provider as AiProviderId)) {
      throw new ValidationError("AI_PROVIDER_INVALID", "Provider AI không hợp lệ.");
    }
    const requestedModel = typeof body.model === "string" ? body.model.trim() : "";

    const usable = await getAiKeyService().getUsableKey(
      identity.userId,
      provider as AiProviderId,
    );
    if (!usable) {
      throw new ValidationError(
        "AI_USER_KEY_MISSING",
        `Chưa có API key ${provider} — vào trang "API Keys" để thêm và verify trước.`,
      );
    }
    const model = usable.model?.trim() || requestedModel;
    if (!model) {
      throw new ValidationError(
        "AI_MODEL_MISSING",
        "Chưa xác định model AI — lưu model ở trang API Keys.",
      );
    }

    const [projects, jobs] = await Promise.all([
      getProjectService().list(identity),
      getModuleJobService().listRecentActivity(identity, 50),
    ]);

    /* ═══════════════════════════════════════════════════════════════════════
       NẠP SỐ LIỆU SEARCH CONSOLE VÀO NHẬN ĐỊNH.

       ⚠️ TRƯỚC ĐÂY CỐ VẤN NÀY CHỈ NHÌN THẤY `module_jobs`.

       Nó tự xưng là "cố vấn nội dung SEO + GEO" nhưng dữ liệu duy nhất nó có là
       "workspace đã chạy bao nhiêu lần module nào". Từ đó thì lời khuyên hay
       nhất nó đưa được cũng chỉ là "chạy thêm module" — một câu về CÔNG CỤ,
       trong khi người dùng cần câu về THỨ HẠNG.

       Giao diện đã hứa sẵn ở dòng chữ dưới nút bấm: "Sẽ mở rộng sang dữ liệu
       xếp hạng GSC khi kết nối". Giờ có dữ liệu thật thì phải giữ lời.

       Chưa kết nối thì bỏ qua trong im lặng: phần nhận định nội bộ vẫn chạy
       được, và câu chữ dưới đây nói rõ với model rằng nó KHÔNG có số thứ hạng —
       để nó đừng bịa ra.
       ═══════════════════════════════════════════════════════════════════════ */
    const duAn = projects.find((p) => p.status === "active");
    const hieuQua = duAn
      ? await layHieuQuaTimKiem(identity, duAn.website).catch(() => null)
      : null;
    const khoiGsc =
      hieuQua?.trangThai === "ok" ? buildGscSummary(hieuQua.duLieu) : null;

    const adapter = getUserAiModelProvider({
      provider: provider as AiProviderId,
      model,
      apiKey: usable.apiKey,
      timeoutMs: 60_000,
      maxOutputTokens: 1_024,
    });
    const result = await adapter.generate({
      systemPrompt: [
        "Bạn là cố vấn nội dung SEO + GEO. Đọc số liệu và đưa khuyến nghị hành động cụ thể, thực tế. Chỉ trả về khuyến nghị.",
        // Ràng buộc chống bịa số. Model rất hay "làm tròn" một con số thành một
        // câu chuyện — mà ở đây con số là thứ duy nhất người dùng tin được.
        "TUYỆT ĐỐI không bịa con số nào không có trong dữ liệu được cung cấp. Không có số thì nói là chưa có số.",
        khoiGsc
          ? "Ưu tiên khuyến nghị dựa trên số liệu Search Console (thứ hạng thật) hơn là dựa trên số lần chạy module."
          : "Workspace này CHƯA kết nối Search Console, nên bạn KHÔNG có bất kỳ số liệu thứ hạng nào. Đừng suy đoán về thứ hạng, traffic hay từ khoá.",
      ].join("\n"),
      prompt: [
        "Số liệu hoạt động gần đây của workspace:",
        buildStatsSummary(projects.length, jobs),
        "",
        khoiGsc
          ? khoiGsc
          : "Search Console: chưa kết nối — không có số liệu thứ hạng.",
        "",
        khoiGsc
          ? "Hãy đưa 3–5 khuyến nghị hành động bằng tiếng Việt, xếp theo mức tác động. Mỗi khuyến nghị đánh số, 1–2 câu. Ưu tiên: truy vấn đã có hiển thị mà vị trí 11–30 (gần trang 1, đáng viết lại nhất); truy vấn đuôi dài chưa có bài riêng; trang có hiển thị cao mà CTR thấp (tiêu đề chưa khớp ý định tìm). Nêu đích danh truy vấn hoặc trang trong số liệu."
          : "Hãy đưa 3–5 khuyến nghị hành động bằng tiếng Việt, xếp theo mức tác động. Mỗi khuyến nghị đánh số, 1–2 câu, nêu rõ nên làm gì tiếp theo với các module. Khuyến nghị đầu tiên nên là kết nối Search Console, vì không có nó thì mọi lời khuyên về thứ hạng đều là phỏng đoán.",
      ].join("\n"),
      maxOutputTokens: 1_024,
    });

    return Response.json(
      { insights: result.text },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}

function buildStatsSummary(projectCount: number, jobs: ModuleJob[]): string {
  const titleByKey = new Map(
    listModuleDefinitions().map((m) => [m.key, `#${m.moduleNumber} ${m.title}`]),
  );
  const total = jobs.length;
  const succeeded = jobs.filter((j) => j.status === "succeeded").length;
  const failed = jobs.filter((j) =>
    ["failed", "timed_out"].includes(j.status),
  ).length;
  const rate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

  const perModule = new Map<string, number>();
  for (const job of jobs) {
    perModule.set(job.moduleKey, (perModule.get(job.moduleKey) ?? 0) + 1);
  }
  const topModules = [...perModule.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([key, count]) => `- ${titleByKey.get(key) ?? key}: ${count} lần`);

  const failedModules = [
    ...new Set(
      jobs
        .filter((j) => ["failed", "timed_out"].includes(j.status))
        .map((j) => titleByKey.get(j.moduleKey) ?? j.moduleKey),
    ),
  ];

  const usedModuleCount = perModule.size;
  const allModuleCount = titleByKey.size;

  return [
    `- Số dự án: ${projectCount}`,
    `- Lần chạy gần đây (tối đa 50): ${total}; thành công ${succeeded} (${rate}%); lỗi ${failed}`,
    `- Số loại module đã dùng: ${usedModuleCount}/${allModuleCount}`,
    topModules.length > 0 ? `- Module chạy nhiều nhất:\n${topModules.join("\n")}` : "",
    failedModules.length > 0
      ? `- Module từng lỗi/quá giờ: ${failedModules.join(", ")}`
      : "- Không có module nào lỗi gần đây",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Gói số liệu Search Console thành đoạn văn cho model đọc.
 *
 * ⚠️ ĐƯA SỐ THÔ, KHÔNG DIỄN GIẢI HỘ. Việc của hàm này là bày số ra; việc kết
 * luận là của model. Viết sẵn "trang này đang yếu" ở đây là nhét kết luận của
 * mình vào miệng nó, rồi lại đọc kết luận đó như thể model tự nghĩ ra.
 *
 * Có LỌC một thứ: chỉ giữ truy vấn có ít nhất một lượt hiển thị. Truy vấn 0
 * hiển thị không nói lên điều gì mà lại chiếm chỗ trong cửa sổ ngữ cảnh.
 */
function buildGscSummary(du: HieuQuaTimKiem): string {
  const k = du.kyNay;
  const dong = [
    `Search Console (property ${du.property}, ${du.khoang.batDau} → ${du.khoang.ketThuc}):`,
    `- Clicks: ${k.clicks}; Hiển thị: ${k.impressions}; CTR: ${(k.ctr * 100).toFixed(2)}%; Vị trí TB: ${k.viTri === null ? "chưa có" : k.viTri.toFixed(1)}`,
  ];

  const tuKhoa = du.tuKhoaTop.filter((t) => t.impressions > 0);
  if (tuKhoa.length > 0) {
    dong.push("- Truy vấn (truy vấn | clicks | hiển thị | vị trí | đuôi dài):");
    for (const t of tuKhoa) {
      dong.push(
        `    ${t.truyVan} | ${t.clicks} | ${t.impressions} | ${t.viTri.toFixed(1)} | ${t.duoiDai ? "có" : "không"}`,
      );
    }
  } else {
    dong.push("- Chưa truy vấn nào có lượt hiển thị.");
  }

  const trang = du.trangTop.filter((t) => t.impressions > 0);
  if (trang.length > 0) {
    dong.push("- Trang (đường dẫn | clicks | hiển thị | vị trí):");
    for (const t of trang) {
      dong.push(
        `    ${t.duongDan} | ${t.clicks} | ${t.impressions} | ${t.viTri.toFixed(1)}`,
      );
    }
  }

  return dong.join("\n");
}
