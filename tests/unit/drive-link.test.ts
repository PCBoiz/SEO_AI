import { describe, expect, it } from "vitest";
import { docLinkDrive } from "@/domain/google/drive-link";

const ID = "1AbCdEfGhIjKlMnOpQrStUvWxYz012345";

describe("docLinkDrive", () => {
  it("link Chia sẻ của thư mục", () => {
    expect(docLinkDrive(`https://drive.google.com/drive/folders/${ID}?usp=sharing`)).toEqual({
      loai: "thu-muc",
      id: ID,
    });
  });

  it("link từ trình duyệt đăng nhập nhiều tài khoản (/u/1/)", () => {
    expect(docLinkDrive(`https://drive.google.com/drive/u/1/folders/${ID}?usp=drive_link`)).toEqual({
      loai: "thu-muc",
      id: ID,
    });
  });

  it("link đời cũ open?id= và folderview?id=", () => {
    expect(docLinkDrive(`https://drive.google.com/open?id=${ID}`)).toEqual({ loai: "thu-muc", id: ID });
    expect(docLinkDrive(`https://drive.google.com/folderview?id=${ID}`)).toEqual({ loai: "thu-muc", id: ID });
  });

  it("chỉ dán mã, kể cả có khoảng trắng hai đầu", () => {
    expect(docLinkDrive(`  ${ID}  `)).toEqual({ loai: "thu-muc", id: ID });
  });

  it("nhận ra link của MỘT TỆP — lỗi dán nhầm hay gặp nhất", () => {
    // Người dùng mở một tấm ảnh, bấm Chia sẻ, dán link đó. Nói "link không hợp
    // lệ" là bắt họ đoán; nói "đây là link một tệp" là chỉ đúng chỗ sai.
    expect(docLinkDrive(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toEqual({
      loai: "tep",
      id: ID,
    });
  });

  it("từ chối tên miền khác — không dò mã trong link bất kỳ", () => {
    expect(docLinkDrive(`https://evil.example/drive/folders/${ID}`)).toEqual({ loai: "khong-hop-le" });
    expect(docLinkDrive("https://drive.google.com/drive/my-drive")).toEqual({ loai: "khong-hop-le" });
    expect(docLinkDrive("")).toEqual({ loai: "khong-hop-le" });
    expect(docLinkDrive("abc")).toEqual({ loai: "khong-hop-le" });
  });
});
