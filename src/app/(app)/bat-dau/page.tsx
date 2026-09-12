import Link from "next/link";
import { ArrowRight, CircleAlert, CircleCheck, Clock, Globe2, Plus } from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { getAiKeyService } from "@/lib/ai/ai-key-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
// Nạp registry để `danhSachViec()` thấy đủ 19 module. Import chỉ-để-tác-dụng-phụ
// này BẮT BUỘC phải có — thiếu nó thì danh sách việc trống trơn mà không báo lỗi.
import "@/domain/modules/registry";
import {
  danhSachViec,
  tenHienThi,
  THU_TU_NHOM,
  type ViecLam,
} from "@/domain/modules/ngon-ngu-nguoi-dung";
import { layCheDo } from "@/lib/che-do-don-gian.server";
import { docHopDongWeb } from "@/lib/dung-web/tu-job.server";
import { khoWebCuaDuAn } from "@/lib/dung-web/github.server";
import { DoiCheDo } from "./doi-che-do";
import { HomNay } from "./hom-nay";
import { TaoBaiNhanh } from "./tao-bai-nhanh";

export const metadata = { title: "Bắt đầu" };

/**
 * Chế độ ĐƠN GIẢN — màn hình chính cho người không biết lập trình.
 *
 * Ba khối, đúng ba việc mà người vận hành cần, xếp theo mức độ thường dùng:
 *
 *   0. HÔM NAY     — máy đã tự làm gì (lịch đăng, khách mới), có gì cần duyệt.
 *   1. TẠO BÀI     — một ô nhập, hệ thống lo phần còn lại.
 *   2. VIỆC KHÁC   — danh sách việc gọi theo NGÔN NGỮ NGƯỜI DÙNG, có ghi rõ
 *                    "dùng khi nào" và "cần làm gì trước".
 *   3. VỪA XONG    — kết quả gần đây, xem và dùng lại được ngay.
 *
 * Những gì CỐ Ý KHÔNG hiện ở đây: số hiệu module, mã module, tên nhà cung cấp
 * AI, khái niệm ghim/nối luồng, trạng thái hàng đợi. Người cần chúng thì bấm
 * sang bản đầy đủ — không mất gì cả.
 */
export default async function TrangBatDau() {
  const identity = await requirePageIdentity();
  const khoaNguoiDung = await getAiKeyService().listStatus(identity.userId);
  const [cheDo, projects, recentJobs] = await Promise.all([
    layCheDo(),
    getProjectService().list(identity),
    getModuleJobService().listRecentActivity(identity, 20),
  ]);

  const duAnHoatDong = projects.filter((p) => p.status === "active");
  const tenDuAn = new Map(projects.map((p) => [p.id, p.name]));
  const viecs = danhSachViec();

  // Chỉ lấy việc đã CHẠY XONG và có kết quả. Việc đang chạy hoặc lỗi thuộc về
  // khối cảnh báo riêng bên dưới, không trộn vào danh sách "dùng lại được".
  const daXong = recentJobs.filter((j) => j.status === "succeeded").slice(0, 6);
  const dangChay = recentJobs.filter((j) =>
    ["queued", "dispatching", "running"].includes(j.status),
  );
  const bicLoi = recentJobs.filter((j) =>
    ["failed", "timed_out"].includes(j.status),
  );

  // Website khách đã dựng: để người dùng thấy ngay cái nào CHƯA lên mạng —
  // bản dựng xong mà nằm im trong máy là việc chưa xong, và trang Bắt đầu là
  // chỗ duy nhất họ nhìn mỗi ngày. Tối đa 12 dự án: mỗi dự án vài truy vấn.
  const webKhach = (
    await Promise.all(
      duAnHoatDong.slice(0, 12).map(async (p) => {
        const hd = await docHopDongWeb(identity, p.id).catch(() => null);
        if (!hd) return null;
        const kho = await khoWebCuaDuAn(p.id).catch(() => null);
        return { id: p.id, tenWebsite: hd.kienTruc.tenWebsite, soTrang: hd.kienTruc.trang.length, kho };
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => x !== null);

  const theoNhom = THU_TU_NHOM.map((nhom) => ({
    nhom,
    viec: viecs.filter((v) => v.nhom === nhom),
  })).filter((g) => g.viec.length > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
            Hôm nay bạn muốn làm gì?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Chọn một việc bên dưới. Mỗi việc có ghi rõ dùng khi nào.
          </p>
        </div>
        <DoiCheDo cheDo={cheDo} />
      </div>

      {/* ==================== 1. CHƯA CÓ DỰ ÁN NÀO ==========================
          Chặn sớm và nói rõ, thay vì để người dùng bấm vào một việc rồi mới
          phát hiện ô "Dự án" trống và không hiểu vì sao không chạy được. */}
      {duAnHoatDong.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Cần tạo một dự án trước
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Một dự án là một website mà bạn viết bài cho nó. Hệ thống cần biết
            website đó nói về lĩnh vực gì để viết cho đúng giọng.
          </p>
          <Link
            href="/projects/new"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" aria-hidden /> Tạo dự án đầu tiên
          </Link>
        </div>
      ) : (
        <>
          {/* ==================== 0. HÔM NAY ============================= */}
          <HomNay identity={identity} duAn={duAnHoatDong.map((p) => ({ id: p.id, ten: p.name }))} />

          {/* ==================== 2. TẠO BÀI NHANH ======================== */}
          <TaoBaiNhanh
            duAn={duAnHoatDong.map((p) => ({
              id: p.id,
              ten: p.name,
              // Bốn trường này KHÔNG phải để hiển thị — chúng là đầu vào bắt
              // buộc của module. Bỏ sót là luồng chết ngay bước đầu tiên.
              diaDiem: p.location,
              ngonNgu: p.language,
              giongVan: p.tone,
              nganh: p.industry,
              website: p.website,
            }))}
            // Danh sách model để luồng nhanh gửi kèm trường `ai`. Thiếu nó thì
            // máy chủ từ chối ngay ở bước đầu — xem ghi chú trong tao-bai-nhanh.
            moHinh={listAiProviderStatuses().map(({ id, label, model }) => ({
              ma: id,
              ten: label,
              model,
              // ⚠️ KHOA CUA CHINH NGUOI DUNG, khong phai trang thai theo bien moi truong.
              //
              // listAiProviderStatuses tra ve available = true khi chay che do mock,
              // ke ca khi khong ai co khoa nao. Duong chay that da chuyen sang BYOK —
              // moi loi goi model dung khoa cua chinh nguoi dung — nen tin vao co do
              // se bao "san sang" trong khi bam vao la hong.
              daCoKhoa: khoaNguoiDung.some((k) => k.provider === id && k.configured),
            }))}
          />

          {/* ============ 2b. DỰNG WEBSITE MỚI (cho khách) =============== */}
          <section className="mt-10 rounded-xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Globe2 className="h-5 w-5 text-muted-foreground" aria-hidden /> Dựng một website mới
            </h2>
            <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-muted-foreground">
              Kể bằng lời website để làm gì, cho ai — máy chọn trang, khối, màu chữ rồi viết nội dung. Xong thì
              ở thẻ <strong>Website dựng sẵn</strong> trong trang của website đó: bấm <strong>Đẩy lên GitHub</strong>{" "}
              để Cloudflare tự đưa lên mạng (không cần máy), hoặc tải mã nguồn về. Mất khoảng 4 lượt gọi AI.
            </p>
            {webKhach.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2 text-sm" data-testid="web-khach-da-dung">
                {webKhach.map((w) => (
                  <li key={w.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                    <span>
                      <strong className="text-foreground">{w.tenWebsite}</strong>{" "}
                      <span className="text-muted-foreground">
                        · {w.soTrang} trang ·{" "}
                        {w.kho
                          ? `đã đẩy lên GitHub ${new Date(w.kho.dayLuc).toLocaleDateString("vi-VN")}`
                          : "chưa đưa lên mạng"}
                      </span>
                    </span>
                    <Link href={`/projects/${w.id}#dung-web`} className="text-xs font-medium underline underline-offset-2">
                      {w.kho ? "Đẩy bản mới" : "Đưa lên mạng"} →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/pipelines?luong=website_draft"
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Bắt đầu dựng website <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          {/* ==================== 3. VIỆC KHÁC =========================== */}
          <section className="mt-10">
            <h2 className="text-lg font-semibold text-foreground">
              Hoặc chọn một việc cụ thể
            </h2>

            {theoNhom.map(({ nhom, viec }) => (
              <div key={nhom} className="mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {nhom}
                </h3>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {viec.map((v) => (
                    <li key={v.maModule}>
                      <TheViec viec={v} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </>
      )}

      {/* ==================== 4. ĐANG CHẠY / LỖI ========================= */}
      {dangChay.length > 0 || bicLoi.length > 0 ? (
        <section className="mt-10 grid gap-3 sm:grid-cols-2">
          {dangChay.length > 0 ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
                Đang chạy ({dangChay.length})
              </p>
              <ul className="mt-2 space-y-1">
                {dangChay.slice(0, 3).map((j) => (
                  <li key={j.id} className="text-sm text-muted-foreground">
                    {tenHienThi(j.moduleKey)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {bicLoi.length > 0 ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CircleAlert className="h-4 w-4 text-destructive" aria-hidden />
                Có {bicLoi.length} việc chưa xong
              </p>
              {/* Nói LÀM GÌ TIẾP, không chỉ nói là hỏng. */}
              <p className="mt-2 text-sm text-muted-foreground">
                Thường là do hết lượt dùng AI hoặc mạng chập chờn. Mở việc đó ra
                và bấm chạy lại là được.
              </p>
              <Link
                href="/outputs"
                className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-foreground underline underline-offset-4"
              >
                Xem chi tiết <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ==================== 5. VỪA LÀM XONG ============================ */}
      {daXong.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">
              Vừa làm xong
            </h2>
            <Link
              href="/outputs"
              className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Xem tất cả
            </Link>
          </div>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {daXong.map((j) => (
              <li key={j.id}>
                <Link
                  href={`/automations/run/${j.moduleKey}`}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent"
                >
                  <CircleCheck
                    className="h-4 w-4 shrink-0 text-success"
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground">
                      {tenHienThi(j.moduleKey)}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {tenDuAn.get(j.projectId) ?? "Dự án đã xoá"} ·{" "}
                      {dinhDangLuc(j.updatedAt)}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * Một thẻ việc.
 *
 * Ghi rõ "cần làm gì trước" NGAY TRÊN THẺ. Ở bản cũ, thứ tự phụ thuộc chỉ tồn
 * tại trong đầu người viết code — người dùng bấm vào "Viết thân bài" rồi mới
 * gặp một ô bắt dán tiêu đề vào, mà không biết tiêu đề lấy ở đâu ra.
 */
function TheViec({ viec }: { viec: ViecLam }) {
  const truoc = viec.canTruoc.map((ma) => tenHienThi(ma));
  return (
    <Link
      href={`/automations/run/${viec.maModule}`}
      className="flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
    >
      <span className="text-sm font-medium text-foreground">{viec.ten}</span>
      <span className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {viec.dungKhiNao}
      </span>
      {truoc.length > 0 ? (
        <span className="mt-3 text-xs text-muted-foreground">
          Cần làm trước: <strong className="font-medium">{truoc.join(", ")}</strong>
        </span>
      ) : null}
    </Link>
  );
}

/** Thời điểm theo cách người Việt hay nói, không phải dấu thời gian máy. */
function dinhDangLuc(luc: Date): string {
  const phut = Math.round((Date.now() - luc.getTime()) / 60000);
  if (phut < 1) return "vừa xong";
  if (phut < 60) return `${phut} phút trước`;
  const gio = Math.round(phut / 60);
  if (gio < 24) return `${gio} giờ trước`;
  return luc.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
