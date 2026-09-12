"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyPassword } from "@/infrastructure/auth/password";
import {
  ghiNhanDung,
  ghiNhanSai,
  kiemTraChan,
  layDiaChiIp,
} from "@/lib/auth/chan-do-mat-khau";
import { createSession } from "@/lib/auth/session.server";
import { databaseAdapter } from "@/lib/db";
import { pgUsers } from "@/lib/db/postgres-schema";
import { users } from "@/lib/db/schema";
import { layCheDo } from "@/lib/che-do-don-gian.server";

const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(256),
});

export interface LoginState {
  message?: string;
  fieldErrors?: {
    email?: string[];
    password?: string[];
  };
}

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  // Kiểm chặn TRƯỚC KHI đụng tới cơ sở dữ liệu và trước khi băm mật khẩu.
  // Băm mật khẩu bằng scrypt cố tình tốn CPU; để máy dò gọi được vào đó là biến
  // chính lớp bảo vệ mật khẩu thành cách làm sập máy chủ.
  const diaChiIp = layDiaChiIp(await headers());
  const chan = kiemTraChan(diaChiIp);
  if (chan.biChan) {
    const phut = Math.ceil(chan.conLaiGiay / 60);
    return {
      message: `Sai quá nhiều lần. Vui lòng thử lại sau ${phut} phút.`,
    };
  }

  const validated = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return {
      message: "Vui lòng kiểm tra các trường được đánh dấu.",
      fieldErrors: validated.error.flatten().fieldErrors,
    };
  }

  const [user] =
    databaseAdapter.kind === "neon"
      ? await databaseAdapter.db
          .select({
            id: pgUsers.id,
            passwordHash: pgUsers.passwordHash,
            status: pgUsers.status,
          })
          .from(pgUsers)
          .where(eq(pgUsers.email, validated.data.email))
          .limit(1)
      : await databaseAdapter.db
          .select({
            id: users.id,
            passwordHash: users.passwordHash,
            status: users.status,
          })
          .from(users)
          .where(eq(users.email, validated.data.email))
          .limit(1);

  const validCredentials =
    user?.status === "active" &&
    (await verifyPassword(validated.data.password, user.passwordHash));

  if (!validCredentials) {
    ghiNhanSai(diaChiIp);
    // Thông báo CỐ Ý không phân biệt "email không tồn tại" với "mật khẩu sai".
    // Phân biệt là nói cho người lạ biết email nào có thật trong hệ thống.
    return { message: "Email hoặc mật khẩu không chính xác." };
  }

  ghiNhanDung(diaChiIp);
  await createSession(user.id);
  // Chế độ Đơn giản (mặc định) không có /dashboard trong thanh bên — vào thẳng
  // màn "Bắt đầu". Nâng cao thì giữ Tổng quan như cũ.
  redirect((await layCheDo()) === "don-gian" ? "/bat-dau" : "/dashboard");
}
