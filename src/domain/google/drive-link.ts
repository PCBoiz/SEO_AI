/**
 * Đọc link Google Drive người dùng dán vào — phần thuần, KHÔNG gọi mạng.
 *
 * Người dùng dán đủ kiểu: link "Chia sẻ" (`/drive/folders/<id>?usp=sharing`),
 * link từ trình duyệt đang đăng nhập nhiều tài khoản (`/drive/u/1/folders/…`),
 * link đời cũ (`open?id=`, `folderview?id=`), hoặc chỉ mã. Và rất hay dán nhầm
 * link của MỘT ẢNH thay vì thư mục chứa nó.
 *
 * Trường hợp cuối cần câu chữ riêng: "đây là link một tệp" chỉ đúng chỗ sai;
 * "link không hợp lệ" bắt người dùng đoán.
 */

export type KetQuaLinkDrive =
  | { loai: "thu-muc"; id: string }
  | { loai: "tep"; id: string }
  | { loai: "khong-hop-le" };

/** Mã Drive: chữ, số, `-`, `_`; thực tế dài 19–44 ký tự. */
const MA = /^[A-Za-z0-9_-]{15,}$/;

export function docLinkDrive(dauVao: string): KetQuaLinkDrive {
  const s = dauVao.trim();
  if (!s) return { loai: "khong-hop-le" };

  // Chỉ dán mã — coi là thư mục (chỗ này chỉ nhận thư mục).
  if (MA.test(s)) return { loai: "thu-muc", id: s };

  let url: URL;
  try {
    url = new URL(s);
  } catch {
    return { loai: "khong-hop-le" };
  }
  if (!/(^|\.)drive\.google\.com$|(^|\.)docs\.google\.com$/.test(url.hostname)) {
    return { loai: "khong-hop-le" };
  }

  const doan = url.pathname.split("/").filter(Boolean);
  const viTriFolders = doan.indexOf("folders");
  if (viTriFolders >= 0 && MA.test(doan[viTriFolders + 1] ?? "")) {
    return { loai: "thu-muc", id: doan[viTriFolders + 1] };
  }
  // `/file/d/<id>/view` — link của một tệp.
  const viTriD = doan.indexOf("d");
  if (doan[0] === "file" && viTriD >= 0 && MA.test(doan[viTriD + 1] ?? "")) {
    return { loai: "tep", id: doan[viTriD + 1] };
  }
  // Đời cũ: `open?id=`, `folderview?id=`. `open` có thể là tệp hoặc thư mục —
  // không biết được từ link, nên coi là thư mục và để bước kiểm truy cập nói.
  const id = url.searchParams.get("id");
  if (id && MA.test(id) && (doan[0] === "open" || doan[0] === "folderview")) {
    return { loai: "thu-muc", id };
  }
  return { loai: "khong-hop-le" };
}
