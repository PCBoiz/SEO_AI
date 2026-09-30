import { describe, expect, it } from "vitest";
import { LOI_CHUA_MIGRATE, thieuBangTroChuyen } from "@/domain/tro-chuyen/chua-migrate";

/**
 * Hai thứ này chạy từ 15/09 mà chưa có phép thử nào (nằm trong tệp
 * `server-only` nên không nhập được). Tách ra tầng miền 30/09 để kiểm.
 */
describe("thieuBangTroChuyen — nhận đúng lỗi 'chưa chạy migration'", () => {
  it("Neon/Postgres: mã 42P01 ở lớp ngoài HOẶC ở `cause` (Drizzle bọc lỗi)", () => {
    expect(thieuBangTroChuyen({ code: "42P01" })).toBe(true);
    expect(thieuBangTroChuyen(Object.assign(new Error("Failed query"), { cause: { code: "42P01" } }))).toBe(true);
    expect(thieuBangTroChuyen(new Error('relation "tro_chuyen" does not exist'))).toBe(true);
  });

  it("SQLite ở máy: câu 'no such table' của đúng hai bảng trò chuyện", () => {
    expect(thieuBangTroChuyen(new Error("no such table: tro_chuyen"))).toBe(true);
    expect(thieuBangTroChuyen(new Error("no such table: tin_nhan_tro_chuyen"))).toBe(true);
  });

  it("KHÔNG nuốt lỗi khác thành lời nhắc chạy migration", () => {
    // Bảng khác thiếu là lỗi thật — nuốt nó đi thì màn Trò chuyện mời người
    // dùng chạy migration trong khi hỏng ở chỗ hoàn toàn khác.
    expect(thieuBangTroChuyen(new Error("no such table: projects"))).toBe(false);
    expect(thieuBangTroChuyen(new Error('relation "module_jobs" does not exist'))).toBe(false);
    expect(thieuBangTroChuyen({ code: "42P07" })).toBe(false); // đã tồn tại — ngược lại
    expect(thieuBangTroChuyen(new Error("connect ETIMEDOUT"))).toBe(false);
    expect(thieuBangTroChuyen(null)).toBe(false);
    expect(thieuBangTroChuyen(undefined)).toBe(false);
  });
});

describe("LOI_CHUA_MIGRATE — không được rút về câu lệnh cụt", () => {
  it("nói rõ phải kèm địa chỉ Neon, và chỉ chỗ xem đủ các bước", () => {
    expect(LOI_CHUA_MIGRATE).toMatch(/DATABASE_URL/);
    expect(LOI_CHUA_MIGRATE).toMatch(/Neon/);
    expect(LOI_CHUA_MIGRATE).toMatch(/\/tro-chuyen/);
  });

  it("KHÔNG đưa `npm run db:neon:migrate` trần — chạy đúng thế là hỏng", () => {
    // Bản 15/09–30/09 đưa đúng câu lệnh này mà không nói phải kèm địa chỉ
    // Neon, nên ai làm theo cũng gặp lỗi thiếu DATABASE_URL.
    const coLenhTran = /db:neon:migrate/.test(LOI_CHUA_MIGRATE) && !/DATABASE_URL/.test(LOI_CHUA_MIGRATE);
    expect(coLenhTran).toBe(false);
  });
});
