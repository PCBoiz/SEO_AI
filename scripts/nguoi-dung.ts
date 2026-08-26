// Quản lý người dùng đăng nhập bằng Google — thêm, khoá, mở, gỡ liên kết.
//
// ═══════════════════════════════════════════════════════════════════════════
// VÌ SAO CÓ FILE NÀY, KHI ĐÃ CÓ `seed-neon.ts`
//
// `seed-neon.ts` là bộ GIEO MẦM: nó dựng một workspace mẫu, một dự án mẫu, và
// đúng MỘT chủ sở hữu với id cố định `user_staging_owner`. Chạy lại với email
// khác không thêm người — nó ĐỔI email của chính chủ sở hữu cũ. Đúng cho lần
// dựng đầu, sai cho mọi lần sau.
//
// File này làm việc còn lại: quản lý danh sách ai được vào, như một việc thường
// ngày chứ không phải một lần dựng hệ thống.
//
// ⚠️ ĐỔI EMAIL KHÔNG THU HỒI QUYỀN CỦA TÀI KHOẢN CŨ.
//
// Đường đăng nhập tra bảng `auth_accounts` theo MÃ ĐỊNH DANH Google trước, chỉ
// khi không thấy mới xét tới email. Nên một tài khoản Google đã từng liên kết
// vẫn vào được, kể cả sau khi email trong bảng `users` đã đổi sang người khác.
//
// Muốn chặn hẳn một tài khoản thì phải `go-lien-ket` hoặc `khoa`. Chỉ sửa email
// là để lại một cánh cửa mở mà không ai nhìn thấy.
//
// CÁCH CHẠY (PowerShell) — DATABASE_URL phải là chuỗi Neon của Antigravity,
// KHÔNG phải chuỗi của trang Hạ Long Xanh:
//
//   $env:DATABASE_URL = "postgresql://…"
//   npx tsx scripts/nguoi-dung.ts xem
//   npx tsx scripts/nguoi-dung.ts them ban@gmail.com "Tên hiển thị"
//   npx tsx scripts/nguoi-dung.ts khoa nguoi-cu@gmail.com
//   npx tsx scripts/nguoi-dung.ts mo   nguoi-cu@gmail.com
//   npx tsx scripts/nguoi-dung.ts go-lien-ket nguoi-cu@gmail.com
// ═══════════════════════════════════════════════════════════════════════════

import { randomBytes, randomUUID } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { NeonDatabaseAdapter } from "@/infrastructure/database/neon-adapter";
import {
  pgAuthAccounts,
  pgUsers,
  pgWorkspaceMembers,
  pgWorkspaces,
} from "@/lib/db/postgres-schema";
import { hashPassword } from "@/infrastructure/auth/password";

loadEnvConfig(process.cwd());

const moiTruong = z
  .object({
    // Chốt cứng phải là Postgres. Thiếu dòng này thì lệnh chạy trên `local.db`
    // của máy cá nhân trong khi người chạy đinh ninh đang sửa máy chủ thật —
    // và không có gì báo cho họ biết.
    DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//i, {
      message:
        "DATABASE_URL phải là chuỗi Neon của Antigravity. Đang thấy giá trị " +
        "không phải Postgres (rất có thể là `local.db` trong .env). Đặt biến " +
        "trong phiên PowerShell trước khi chạy.",
    }),
  })
  .parse(process.env);

const db = new NeonDatabaseAdapter(moiTruong.DATABASE_URL).db;

function chuanHoa(email: string): string {
  return email.trim().toLowerCase();
}

async function xem(): Promise<void> {
  const dong = await db
    .select({
      email: pgUsers.email,
      ten: pgUsers.displayName,
      trangThai: pgUsers.status,
      id: pgUsers.id,
    })
    .from(pgUsers);

  if (dong.length === 0) {
    console.log("Chưa có người dùng nào.");
    return;
  }

  const lienKet = await db
    .select({ userId: pgAuthAccounts.userId, provider: pgAuthAccounts.provider })
    .from(pgAuthAccounts);

  console.log(`${dong.length} người dùng:\n`);
  for (const n of dong) {
    const g = lienKet.filter((l) => l.userId === n.id).map((l) => l.provider);
    console.log(
      `  ${n.trangThai === "active" ? "●" : "○"} ${n.email.padEnd(34)} ` +
        `${n.trangThai.padEnd(9)} ${g.length ? "đã liên kết: " + g.join(", ") : "chưa liên kết"}`,
    );
  }
  console.log(
    "\n● = đang hoạt động, đăng nhập được." +
      "\n○ = đã khoá, không đăng nhập được dù có liên kết.",
  );
}

async function them(email: string, ten: string): Promise<void> {
  const e = chuanHoa(email);
  const luc = new Date();

  const [daCo] = await db
    .select({ id: pgUsers.id })
    .from(pgUsers)
    .where(eq(pgUsers.email, e))
    .limit(1);

  if (daCo) {
    await db
      .update(pgUsers)
      .set({ status: "active", displayName: ten, updatedAt: luc })
      .where(eq(pgUsers.id, daCo.id));
    console.log(`Đã có sẵn ${e} — đặt lại trạng thái hoạt động.`);
    return;
  }

  // Mật khẩu là chuỗi ngẫu nhiên KHÔNG AI BIẾT, kể cả người chạy lệnh này.
  //
  // Cột `password_hash` không cho phép rỗng, mà người dùng này đăng nhập bằng
  // Google chứ không bằng mật khẩu. Đặt một chuỗi ngẫu nhiên rồi vứt đi là cách
  // đúng: ô dữ liệu được điền, còn đường đăng nhập bằng mật khẩu thì đóng —
  // không phải vì bị chặn, mà vì không tồn tại mật khẩu nào mở được nó.
  const khoaChet = await hashPassword(`${randomBytes(48).toString("base64url")}!Aa1`);
  const id = `user_${randomUUID()}`;

  await db.insert(pgUsers).values({
    id,
    email: e,
    displayName: ten,
    passwordHash: khoaChet,
    status: "active",
    createdAt: luc,
    updatedAt: luc,
  });

  // Người dùng không thuộc workspace nào thì đăng nhập được mà không thấy gì —
  // một trạng thái trông y hệt lỗi. Gắn vào workspace đầu tiên đang có.
  const [ws] = await db.select({ id: pgWorkspaces.id }).from(pgWorkspaces).limit(1);
  if (ws) {
    await db
      .insert(pgWorkspaceMembers)
      .values({
        workspaceId: ws.id,
        userId: id,
        role: "owner",
        createdAt: luc,
        updatedAt: luc,
      })
      .onConflictDoUpdate({
        target: [pgWorkspaceMembers.workspaceId, pgWorkspaceMembers.userId],
        set: { role: "owner", updatedAt: luc },
      });
    console.log(`Đã thêm ${e}, gắn vào workspace ${ws.id} với vai trò owner.`);
  } else {
    console.log(
      `Đã thêm ${e}, NHƯNG chưa có workspace nào để gắn vào. ` +
        "Người này đăng nhập được mà sẽ không thấy dự án nào.",
    );
  }

  console.log(
    "\nLần đăng nhập Google đầu tiên bằng đúng email này sẽ tự liên kết tài khoản.",
  );
}

async function doiTrangThai(email: string, sang: "active" | "disabled"): Promise<void> {
  const e = chuanHoa(email);
  const ket = await db
    .update(pgUsers)
    .set({ status: sang, updatedAt: new Date() })
    .where(eq(pgUsers.email, e))
    .returning({ id: pgUsers.id });

  if (ket.length === 0) {
    console.log(`Không tìm thấy ${e}.`);
    return;
  }
  console.log(
    sang === "disabled"
      ? `Đã khoá ${e}. Tài khoản này không đăng nhập được nữa, kể cả khi đã liên kết Google.`
      : `Đã mở lại ${e}.`,
  );
}

async function goLienKet(email: string): Promise<void> {
  const e = chuanHoa(email);
  const [nd] = await db
    .select({ id: pgUsers.id })
    .from(pgUsers)
    .where(eq(pgUsers.email, e))
    .limit(1);

  if (!nd) {
    console.log(`Không tìm thấy ${e}.`);
    return;
  }

  const bo = await db
    .delete(pgAuthAccounts)
    .where(and(eq(pgAuthAccounts.userId, nd.id), eq(pgAuthAccounts.provider, "google")))
    .returning({ id: pgAuthAccounts.id });

  console.log(
    bo.length === 0
      ? `${e} chưa liên kết tài khoản Google nào.`
      : `Đã gỡ ${bo.length} liên kết Google khỏi ${e}. ` +
          "Lần sau đăng nhập sẽ phải liên kết lại từ đầu.",
  );
}

async function chinh(): Promise<void> {
  const [viec, email, ...phanConLai] = process.argv.slice(2);

  if (!viec || viec === "xem") {
    await xem();
    return;
  }

  if (!email) {
    console.error(`Thiếu email. Ví dụ: npx tsx scripts/nguoi-dung.ts ${viec} ban@gmail.com`);
    process.exitCode = 1;
    return;
  }

  switch (viec) {
    case "them":
      await them(email, phanConLai.join(" ").trim() || email.split("@")[0]);
      break;
    case "khoa":
      await doiTrangThai(email, "disabled");
      break;
    case "mo":
      await doiTrangThai(email, "active");
      break;
    case "go-lien-ket":
      await goLienKet(email);
      break;
    default:
      console.error(
        `Không hiểu việc "${viec}". Dùng: xem | them | khoa | mo | go-lien-ket`,
      );
      process.exitCode = 1;
  }
}

// `void` chứ không phải `await`: tsx dịch script này sang CommonJS, và ở đó
// `await` ngoài cùng là lỗi biên dịch.
void chinh();
