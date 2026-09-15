import { describe, expect, it } from "vitest";
import { tinhAnDanh, type DongSearchConsole } from "@/domain/seo/search-console";

const dong = (clicks: number, impressions: number): DongSearchConsole => ({
  clicks,
  impressions,
  ctr: impressions > 0 ? clicks / impressions : 0,
  position: 5,
  keys: ["truy vấn"],
});

describe("tinhAnDanh — phần thuộc truy vấn Google ẩn", () => {
  it("bảng truy vấn trống mà tổng có lượt hiển thị: toàn bộ là truy vấn bị ẩn (ca thật halongxanh360 13/09)", () => {
    expect(tinhAnDanh({ clicks: 1, impressions: 2 }, [], 1000)).toEqual({ clicks: 1, impressions: 2 });
  });

  it("có dòng truy vấn: phần ẩn = tổng − cộng các dòng", () => {
    expect(tinhAnDanh({ clicks: 10, impressions: 550 }, [dong(4, 300), dong(1, 150)], 1000)).toEqual({
      clicks: 5,
      impressions: 100,
    });
  });

  it("các dòng cộng vượt tổng (Google làm tròn/đếm lệch) thì không ra số âm", () => {
    expect(tinhAnDanh({ clicks: 1, impressions: 2 }, [dong(2, 5)], 1000)).toEqual({ clicks: 0, impressions: 0 });
  });

  it("số dòng chạm trần: còn truy vấn công bố chưa lấy hết → không tính (null), không đoán", () => {
    const day = Array.from({ length: 3 }, () => dong(0, 1));
    expect(tinhAnDanh({ clicks: 0, impressions: 100 }, day, 3)).toBeNull();
  });
});
