import { describe, expect, it } from "vitest";
import { uuTienAnh } from "@/domain/dung-web/thu-tu-anh";

const DS = [
  { id: "a", ten: "con-1.jpg", thuMucCon: "noi-that" },
  { id: "b", ten: "goc-1.jpg", thuMucCon: "" },
  { id: "c", ten: "goc-2.jpg", thuMucCon: "" },
  { id: "d", ten: "con-2.jpg", thuMucCon: "ngoai-that" },
];

describe("thứ tự ảnh đưa vào website", () => {
  it("không chọn: thư mục gốc trước, thứ tự Drive giữ nguyên", () => {
    expect(uuTienAnh(DS).map((a) => a.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("chọn ảnh mở đầu: tấm đó lên đầu kể cả khi nằm trong thư mục con", () => {
    expect(uuTienAnh(DS, "d").map((a) => a.id)).toEqual(["d", "b", "c", "a"]);
    expect(uuTienAnh(DS, "c").map((a) => a.id)).toEqual(["c", "b", "a", "d"]);
  });

  it("id không có trong thư mục (ảnh đã xoá) → như không chọn, không nổ", () => {
    expect(uuTienAnh(DS, "khong-co").map((a) => a.id)).toEqual(["b", "c", "a", "d"]);
    expect(uuTienAnh([], "x")).toEqual([]);
  });
});
