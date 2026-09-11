import { describe, expect, it } from "vitest";
import {
  canonicalLech,
  daCrawlSau,
  docSitemap,
  tomTatChiMuc,
  xepNhom,
  type KetQuaSoiUrl,
} from "@/domain/seo/lap-chi-muc";

const GOC = "https://halongxanh360.vn";

function kq(phan: Partial<KetQuaSoiUrl> & { url: string }): KetQuaSoiUrl {
  return { verdict: "NEUTRAL", coverageState: "", ...phan };
}

describe("xepNhom", () => {
  it("bị chặn xếp TRƯỚC verdict — chặn là sửa cấu hình, chưa vào là chờ", () => {
    // Trang bị robots chặn cũng mang verdict FAIL. Xếp theo verdict trước thì
    // nó rơi vào "chưa vào" — đúng về kết quả, sai về việc cần làm.
    expect(
      xepNhom(kq({ url: `${GOC}/a`, verdict: "FAIL", robotsTxtState: "DISALLOWED" })),
    ).toBe("bi-chan");
    expect(
      xepNhom(kq({ url: `${GOC}/b`, verdict: "FAIL", indexingState: "BLOCKED_BY_META_TAG" })),
    ).toBe("bi-chan");
  });

  it("Google không tải được thì là lỗi tải, không phải chưa vào", () => {
    expect(
      xepNhom(kq({ url: `${GOC}/c`, verdict: "FAIL", pageFetchState: "SERVER_ERROR" })),
    ).toBe("loi-tai");
    expect(
      xepNhom(kq({ url: `${GOC}/d`, verdict: "FAIL", pageFetchState: "SOFT_404" })),
    ).toBe("loi-tai");
  });

  it("PASS là đã vào; NEUTRAL là chưa", () => {
    expect(xepNhom(kq({ url: `${GOC}/e`, verdict: "PASS", pageFetchState: "SUCCESSFUL" }))).toBe(
      "da-vao",
    );
    expect(xepNhom(kq({ url: `${GOC}/f`, verdict: "NEUTRAL" }))).toBe("chua-vao");
  });
});

describe("tomTatChiMuc", () => {
  it("đếm đúng bốn nhóm và xếp trang CHƯA vào lên đầu", () => {
    const tom = tomTatChiMuc(
      [
        kq({ url: `${GOC}/`, verdict: "PASS", coverageState: "Submitted and indexed" }),
        kq({ url: `${GOC}/gia`, verdict: "NEUTRAL", coverageState: "Crawled - currently not indexed" }),
        kq({ url: `${GOC}/duyet-bai`, verdict: "FAIL", indexingState: "BLOCKED_BY_META_TAG" }),
        kq({ url: `${GOC}/x`, verdict: "FAIL", pageFetchState: "NOT_FOUND" }),
      ],
      GOC,
    );

    expect([tom.tong, tom.daVao, tom.chuaVao, tom.biChan, tom.loiTai]).toEqual([4, 1, 1, 1, 1]);
    expect(tom.dong.map((d) => d.nhom)).toEqual(["bi-chan", "loi-tai", "chua-vao", "da-vao"]);
    expect(tom.dong[3].duongDan).toBe("/");
  });

  it("giữ nguyên câu Google mô tả — đó là thứ người dùng tra cứu", () => {
    const tom = tomTatChiMuc(
      [kq({ url: `${GOC}/gia`, verdict: "NEUTRAL", coverageState: "Discovered - currently not indexed" })],
      GOC,
    );
    expect(tom.dong[0].lyDo).toBe("Discovered - currently not indexed");
  });
});

describe("canonicalLech", () => {
  it("không báo lệch khi Google chưa chọn canonical (trang mới)", () => {
    // So với rỗng ra "lệch" là báo động giả cho MỌI trang mới.
    expect(canonicalLech(kq({ url: `${GOC}/a`, userCanonical: `${GOC}/a` }))).toBe(false);
  });

  it("bỏ qua dấu / cuối và hoa/thường", () => {
    expect(
      canonicalLech(kq({ url: `${GOC}/a`, userCanonical: `${GOC}/a/`, googleCanonical: `${GOC}/A` })),
    ).toBe(false);
  });

  it("báo lệch khi Google chọn trang khác", () => {
    expect(
      canonicalLech(
        kq({ url: `${GOC}/gia`, userCanonical: `${GOC}/gia`, googleCanonical: `${GOC}/du-an` }),
      ),
    ).toBe(true);
  });
});

describe("daCrawlSau", () => {
  const moc = new Date("2026-09-11T10:00:00Z");

  it("null khi chưa từng crawl — là 'chưa biết', không phải 'chưa'", () => {
    expect(daCrawlSau(undefined, moc)).toBeNull();
    expect(daCrawlSau("khong-phai-ngay", moc)).toBeNull();
  });

  it("đúng chiều thời gian", () => {
    expect(daCrawlSau("2026-09-11T12:00:00Z", moc)).toBe(true);
    expect(daCrawlSau("2026-09-10T12:00:00Z", moc)).toBe(false);
  });
});

describe("docSitemap", () => {
  it("lấy đúng các <loc>, bỏ khoảng trắng", () => {
    const xml = `<urlset><url><loc> https://a.vn/ </loc></url><url><loc>https://a.vn/b</loc></url></urlset>`;
    expect(docSitemap(xml)).toEqual(["https://a.vn/", "https://a.vn/b"]);
  });
});
