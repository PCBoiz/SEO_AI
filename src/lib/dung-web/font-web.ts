import { createHash } from "node:crypto";
import {
  SUBSET_GIU,
  docCssGoogleFont,
  ghepFontChoWeb,
  urlGoogleFont,
  type FontChoWeb,
} from "@/domain/dung-web/font-web";
import type { HeThietKe } from "@/domain/dung-web/he-thiet-ke";

/**
 * Tải font Google về để website khách TỰ LƯU — xem lý do ở
 * `domain/dung-web/font-web.ts`.
 *
 * KHÔNG `server-only`: kịch bản dựng thử (`scripts/dung-web-thu.ts`) chạy bằng
 * tsx cũng gọi hàm này, và `server-only` ném lỗi ngay dòng nhập ngoài Next.
 * Mọi thứ ở đây chỉ là `fetch` + băm, chạy được ở mọi nơi có mạng.
 *
 * Hỏng ở bất kỳ bước nào → `null`, bộ sinh mã dùng thẻ `<link>` dự phòng.
 */

export type HamFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Google trả CSS khác nhau theo trình duyệt: phải xưng là Chrome hiện đại thì
 * mới nhận `woff2` chia theo vùng ký tự. Không có dòng này là nhận một tệp
 * `ttf` to cho mọi thứ.
 */
const UA_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

/** Trần tổng dung lượng — một bộ font tiếng Việt thường 150–300 KB; vượt xa là có gì bất thường. */
const TRAN_BYTE = 3 * 1024 * 1024;

/** Nhớ theo địa chỉ CSS trong một ngày: cùng hệ thiết kế thì tải, xem thử, đẩy GitHub dùng lại. */
const KHO = new Map<string, { luc: number; font: FontChoWeb }>();
const SONG_MS = 24 * 60 * 60_000;

/** Cho phép thử: xoá bộ nhớ đệm. */
export function xoaKhoFont(): void {
  KHO.clear();
}

export async function layFontChoWeb(
  tk: Pick<HeThietKe, "font">,
  fetchFn: HamFetch = (u, i) => fetch(u, i),
): Promise<FontChoWeb | null> {
  const diaChi = urlGoogleFont(tk);
  const daCo = KHO.get(diaChi);
  if (daCo && Date.now() - daCo.luc < SONG_MS) return daCo.font;

  try {
    const r = await fetchFn(diaChi, { headers: { "user-agent": UA_CHROME }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) return null;
    const mat = docCssGoogleFont(await r.text()).filter((f) => SUBSET_GIU.includes(f.subset));
    if (mat.length === 0) return null;

    const taiVe = new Map<string, { bytes: Buffer; bam: string }>();
    let tong = 0;
    await Promise.all(
      [...new Set(mat.map((f) => f.url))].map(async (u) => {
        const t = await fetchFn(u, { signal: AbortSignal.timeout(15_000) });
        if (!t.ok) throw new Error(`HTTP ${t.status}`);
        const bytes = Buffer.from(await t.arrayBuffer());
        // Tệp woff2 luôn bắt đầu bằng "wOF2" — trang lỗi HTML trả 200 cũng bị chặn ở đây.
        if (bytes.length < 4 || bytes.toString("latin1", 0, 4) !== "wOF2") throw new Error("không phải woff2");
        tong += bytes.length;
        if (tong > TRAN_BYTE) throw new Error("bộ font quá lớn");
        taiVe.set(u, { bytes, bam: createHash("sha256").update(bytes).digest("hex") });
      }),
    );

    const font = ghepFontChoWeb(mat, taiVe, tk);
    if (font) {
      KHO.set(diaChi, { luc: Date.now(), font });
      if (KHO.size > 8) KHO.delete(KHO.keys().next().value!);
    }
    return font;
  } catch {
    return null;
  }
}
