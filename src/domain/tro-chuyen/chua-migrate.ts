/**
 * "Cơ sở dữ liệu chưa có bảng trò chuyện" — nhận ra nó, và nói đúng việc cần làm.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO TÁCH RA KHỎI TẦNG MÁY CHỦ (30/09/2026)
 *
 * Hai thứ dưới đây là logic THUẦN — một hàm soi lỗi và một câu chữ — nhưng
 * chúng nằm trong tệp `*.server.ts` mang dấu `server-only`, nên phép thử
 * không nhập được. Kết quả: cả hai chạy suốt từ 15/09 mà **chưa có một phép
 * thử nào**, kể cả hàm soi lỗi vốn dựa vào hình dạng lỗi của hai nhà cung cấp
 * cơ sở dữ liệu khác nhau — loại mã hỏng lặng lẽ khi thư viện đổi bản.
 *
 * Vercel dựng mã ngay khi đẩy, còn migration thì đợi chủ dự án chạy tay. Giữa
 * hai việc đó màn Trò chuyện không được chết 500 — nó phải nói việc cần làm.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Lỗi này có phải "chưa có bảng trò chuyện" không?
 *
 * Hai hình dạng, vì hai nơi chạy:
 * - **Neon/Postgres**: mã `42P01` (undefined_table), và Drizzle BỌC lỗi nên mã
 *   nằm ở `cause` chứ không ở lớp ngoài — phải soi cả hai lớp.
 * - **SQLite** (bản chạy ở máy): câu `no such table: …`.
 *
 * Chỉ nhận đúng hai bảng của trò chuyện: thiếu bảng KHÁC là lỗi thật, không
 * được nuốt thành lời nhắc "chạy migration đi".
 */
export function thieuBangTroChuyen(loi: unknown): boolean {
  const cacLop = [loi, (loi as { cause?: unknown } | null)?.cause];
  return cacLop.some((lop) => {
    const e = lop as { code?: unknown; message?: unknown } | null | undefined;
    if (!e) return false;
    return (
      e.code === "42P01" ||
      /no such table: (tro_chuyen|tin_nhan_tro_chuyen)|relation "(tro_chuyen|tin_nhan_tro_chuyen)" does not exist/i.test(
        String(e.message ?? ""),
      )
    );
  });
}

/**
 * Câu lỗi cho các TUYẾN API (màn Trò chuyện có bản hướng dẫn đủ ba bước riêng).
 *
 * ⚠️ KHÔNG được rút gọn về mỗi `npm run db:neon:migrate`. Chạy đúng câu lệnh
 * cụt ấy là HỎNG: kịch bản đòi `DATABASE_URL` trỏ vào Postgres của Neon, mà
 * `.env` trên máy chủ dự án trỏ vào SQLite (bản chạy thử ở máy). Bản cũ đưa
 * đúng câu lệnh cụt đó suốt từ 15/09 đến 30/09 — tức là màn hình dẫn người
 * đọc thẳng vào lỗi, trong khi bản đính chính chỉ nằm trong một tệp .md.
 * `tests/unit/tro-chuyen-chua-migrate.test.ts` giữ cho nó không quay lại.
 */
export const LOI_CHUA_MIGRATE =
  "Trò chuyện chưa sẵn sàng: cơ sở dữ liệu chưa có hai bảng trò chuyện. Cần chạy migration một lần, KÈM địa chỉ Neon (`DATABASE_URL` lấy từ Vercel — lệnh không kèm địa chỉ này sẽ báo lỗi). Mở màn Trò chuyện (/tro-chuyen) để xem đủ ba bước.";
