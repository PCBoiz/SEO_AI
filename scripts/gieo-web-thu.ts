/**
 * Gieo (hoặc nhổ) một bản dựng web GIẢ vào cơ sở dữ liệu ở máy — để xem thẻ
 * "Website dựng sẵn" và mục web khách ở trang Bắt đầu bằng mắt, KHÔNG tốn lượt
 * gọi AI nào.
 *
 * Chạy:  npx tsx scripts/gieo-web-thu.ts [projectId]        # gieo
 *        npx tsx scripts/gieo-web-thu.ts --nho [projectId]  # nhổ (xoá job đã gieo)
 *
 * Job gieo vào mang idempotencyKey bắt đầu bằng `gieo-web-thu:` — lệnh nhổ chỉ
 * xoá đúng những job đó, không đụng job thật.
 */
import { randomUUID } from "node:crypto";
import { eq, like } from "drizzle-orm";
import { SqliteDatabaseAdapter } from "@/infrastructure/database/sqlite-adapter";
import { SqliteModuleJobRepository } from "@/infrastructure/modules/sqlite-module-job-repository";
import { moduleJobs } from "@/lib/db/schema";
import "@/domain/modules/registry";

const WORKSPACE = process.env.WORKSPACE_ID ?? "workspace_local";
const USER = process.env.USER_ID ?? "user_local_owner";
const DAU = "gieo-web-thu:";

const KIEN_TRUC = {
  tenWebsite: "Nha khoa Bình Minh (thử)",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer", "lien-he-noi", "du-lieu-co-cau-truc"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Người đau răng tìm thấy nơi khám gần nhà và gọi ngay trong đêm.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu lớn: khám trong ngày, có bác sĩ trực tối." },
        { ma: "gia-thuc-tra", noiDung: "Giá từng dịch vụ, nói rõ đã gồm gì." },
        { ma: "cau-hoi-thuong-gap", noiDung: "Câu hỏi hay gặp về đau, bảo hiểm, thời gian." },
        { ma: "dang-ky-form", noiDung: "Để lại số, phòng khám gọi lại xếp lịch." },
      ],
    },
    {
      duong: "/bang-gia",
      tieuDe: "Bảng giá",
      mucDich: "Xem giá thật trước khi tới, không phải hỏi.",
      khoi: [
        { ma: "gia-thuc-tra", noiDung: "Bảng giá đầy đủ." },
        { ma: "khoi-chot", noiDung: "Chốt: gọi để được tư vấn đúng trường hợp." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: ["số giấy phép hoạt động"],
};

const THIET_KE = {
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Nền tối chữ sáng đỡ chói khi xem buổi tối.",
};

const rao = (du: unknown) => "```json\n" + JSON.stringify(du, null, 2) + "\n```";

async function main(): Promise<void> {
  const nho = process.argv.includes("--nho");
  const projectId = process.argv.filter((a) => !a.startsWith("--"))[2] ?? "project_local_demo";
  const adapter = new SqliteDatabaseAdapter(process.env.DATABASE_URL ?? "local.db");

  if (nho) {
    const ra = adapter.db
      .delete(moduleJobs)
      .where(like(moduleJobs.idempotencyKey, `${DAU}%`))
      .returning({ id: moduleJobs.id })
      .all();
    console.log(`Đã nhổ ${ra.length} job gieo thử.`);
    adapter.close();
    return;
  }

  const kho = new SqliteModuleJobRepository(adapter.db);
  const now = new Date();
  const gieo = async (moduleKey: string, khoaRa: string, du: unknown) => {
    const { job } = await kho.create({
      id: randomUUID(),
      workspaceId: WORKSPACE,
      userId: USER,
      projectId,
      moduleKey,
      idempotencyKey: `${DAU}${moduleKey}:${randomUUID()}`,
      input: { projectId, ai: { provider: "deepseek", model: "deepseek-v4-flash" } },
      now,
    });
    await kho.setStatus(WORKSPACE, job.id, "succeeded", now, { output: { [khoaRa]: rao(du) } });
    return job.id;
  };
  console.log("Gieo #25:", await gieo("RIS_WEB_KIEN_TRUC", "json", KIEN_TRUC));
  console.log("Gieo #26:", await gieo("RIS_WEB_THIET_KE", "json", THIET_KE));
  const daGieo = adapter.db.select({ id: moduleJobs.id }).from(moduleJobs).where(eq(moduleJobs.projectId, projectId)).all();
  console.log(`Dự án ${projectId} giờ có ${daGieo.length} job. Nhổ bằng: npx tsx scripts/gieo-web-thu.ts --nho`);
  adapter.close();
}

void main();
