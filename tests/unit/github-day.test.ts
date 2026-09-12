import { describe, expect, it } from "vitest";
import { PHIEN_BAN_CLOUDFLARE, chuanBiChoCloudflare, mucGitTuCay, tenRepo } from "@/domain/dung-web/github-day";
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema } from "@/domain/dung-web/he-thiet-ke";
import { soatCayTep } from "@/domain/dung-web/soat-cay-tep";
import type { CayTep } from "@/domain/dung-web/moi-truong-dung";
import { GitHubApi, LoiGitHub, type HamFetch } from "@/lib/dung-web/github-api";

const THIET_KE = heThietKeSchema.parse({
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "vua",
  goc: "bo-nhe",
  giong: ["rõ ràng", "điềm đạm"],
  lyDo: "x",
});
const KIEN_TRUC = kienTrucSchema.parse({
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer", "lien-he-noi"],
  trang: [
    { duong: "/", tieuDe: "Trang chủ", mucDich: "Gọi ngay.", khoi: [{ ma: "hero-anh", noiDung: "a" }, { ma: "khoi-chot", noiDung: "b" }] },
  ],
  canVietMoi: [],
  duLieuCan: [],
});

function cayThat(): CayTep {
  return dungCayTep(KIEN_TRUC, THIET_KE, { dienThoai: "0912 345 678", diaChi: "https://binhminh.vn" }, {}, [
    { ten: "mat-tien.webp", alt: "Mặt tiền", bytes: Buffer.from([0xff, 0x00, 0x10, 0x80]) },
  ]).cay;
}

describe("chuẩn bị cây tệp cho Cloudflare Workers Builds", () => {
  it("cấu hình ra gốc, hai gói vào devDependencies (đóng cứng), hai lệnh npm; phần còn lại y nguyên", () => {
    const goc = cayThat();
    const cf = chuanBiChoCloudflare(goc);
    const doc = (d: string) => {
      const t = cf.tep.find((x) => x.duongDan === d);
      return typeof t?.noiDung === "string" ? t.noiDung : "";
    };
    expect(doc("wrangler.jsonc")).toContain('"main": ".open-next/worker.js"');
    expect(doc("open-next.config.ts")).toContain("defineCloudflareConfig");
    const goi = JSON.parse(doc("package.json")) as { scripts: Record<string, string>; devDependencies: Record<string, string>; dependencies: Record<string, string> };
    expect(goi.devDependencies["@opennextjs/cloudflare"]).toBe(PHIEN_BAN_CLOUDFLARE.opennext);
    expect(goi.devDependencies.wrangler).toBe(PHIEN_BAN_CLOUDFLARE.wrangler);
    expect(goi.scripts["dung-cloudflare"]).toBe("opennextjs-cloudflare build");
    expect(goi.scripts["day-cloudflare"]).toBe("opennextjs-cloudflare deploy");
    // Không dùng ^ — cùng luật với mọi phụ thuộc của web khách.
    for (const v of Object.values({ ...goi.dependencies, ...goi.devDependencies })) expect(v).not.toMatch(/^[\^~]/);
    expect(doc("CLOUDFLARE.md")).toContain("npm run dung-cloudflare");
    // Mọi tệp gốc vẫn còn (kể cả ảnh nhị phân), chỉ package.json bị thay.
    for (const t of goc.tep) {
      if (t.duongDan === "package.json") continue;
      expect(cf.tep.find((x) => x.duongDan === t.duongDan)?.noiDung, t.duongDan).toBe(t.noiDung);
    }
    expect(cf.tep.filter((t) => t.duongDan === "package.json")).toHaveLength(1);
    // Bản Cloudflare vẫn qua soát sạch.
    expect(soatCayTep(cf)).toEqual([]);
  });

  it("không phải cây do bộ dựng sinh ra thì từ chối, không đoán", () => {
    expect(() => chuanBiChoCloudflare({ tep: [{ duongDan: "a.txt", noiDung: "x" }] })).toThrow(/thiếu cấu hình Cloudflare/);
  });

  it("tên kho: web-<slug>, không dấu, không ký tự lạ", () => {
    expect(tenRepo("Nha khoa Bình Minh")).toBe("web-nha-khoa-binh-minh");
    expect(tenRepo("Đồ gỗ Tùng!!!")).toBe("web-do-go-tung");
  });
});

describe("cây tệp → blob Git", () => {
  it("chữ đi utf-8, nhị phân đi base64, sắp theo đường dẫn, chặn đường dẫn thoát", () => {
    const muc = mucGitTuCay(cayThat());
    const anh = muc.find((m) => m.duongDan === "public/anh/mat-tien.webp")!;
    expect(anh.maHoa).toBe("base64");
    expect(Buffer.from(anh.noiDung, "base64")).toEqual(Buffer.from([0xff, 0x00, 0x10, 0x80]));
    expect(muc.find((m) => m.duongDan === "package.json")!.maHoa).toBe("utf-8");
    const duong = muc.map((m) => m.duongDan);
    expect(duong).toEqual([...duong].sort());
    expect(() => mucGitTuCay({ tep: [{ duongDan: "../ngoai.txt", noiDung: "x" }] })).toThrow(/không hợp lệ/);
    expect(() => mucGitTuCay({ tep: [{ duongDan: "/tuyet-doi.txt", noiDung: "x" }] })).toThrow(/không hợp lệ/);
    expect(() => mucGitTuCay({ tep: [{ duongDan: "a.txt", noiDung: "x" }, { duongDan: "a.txt", noiDung: "y" }] })).toThrow(/lặp/);
  });
});

/** GitHub giả: ghi lại từng lượt gọi, trả lời theo kịch bản. */
function gitHubGia(kichBan: { khoCo?: boolean; nhanhCo?: boolean; nhanhMacDinh?: string; loiBlob?: number } = {}) {
  const goi: Array<{ method: string; duong: string; than?: unknown }> = [];
  let demBlob = 0;
  const fetchGia: HamFetch = async (url, init) => {
    const duong = url.replace("https://api.github.com", "");
    const method = init?.method ?? "GET";
    const than = typeof init?.body === "string" ? (JSON.parse(init.body) as unknown) : undefined;
    goi.push({ method, duong, than });
    const tra = (status: number, du: unknown) => new Response(JSON.stringify(du), { status, headers: { "content-type": "application/json" } });
    if (duong === "/user") return tra(200, { login: "cogiang" });
    if (method === "GET" && /^\/repos\/[^/]+\/[^/]+$/.test(duong)) {
      return kichBan.khoCo === false
        ? tra(404, { message: "Not Found" })
        : tra(200, { default_branch: kichBan.nhanhMacDinh ?? "main", html_url: `https://github.com${duong.replace("/repos", "")}` });
    }
    if (method === "POST" && duong === "/user/repos") {
      const t = than as { name: string; private: boolean; auto_init: boolean };
      return tra(201, { name: t.name, owner: { login: "cogiang" }, default_branch: "main", html_url: `https://github.com/cogiang/${t.name}` });
    }
    if (method === "GET" && duong.includes("/git/ref/heads/")) {
      return kichBan.nhanhCo === false ? tra(404, { message: "Not Found" }) : tra(200, { object: { sha: "cha000" } });
    }
    if (method === "POST" && duong.endsWith("/git/blobs")) {
      demBlob += 1;
      if (kichBan.loiBlob && demBlob === kichBan.loiBlob) return tra(403, { message: "Resource not accessible by personal access token" });
      return tra(201, { sha: `blob${demBlob}` });
    }
    if (method === "POST" && duong.endsWith("/git/trees")) return tra(201, { sha: "tree111" });
    if (method === "POST" && duong.endsWith("/git/commits")) return tra(201, { sha: "commit222" });
    if (method === "PATCH" && duong.includes("/git/refs/heads/")) return tra(200, { object: { sha: "commit222" } });
    if (method === "POST" && duong.endsWith("/git/refs")) return tra(201, { object: { sha: "commit222" } });
    return tra(500, { message: `không có kịch bản cho ${method} ${duong}` });
  };
  return { goi, fetchGia };
}

describe("GitHubApi — trọn một cây thành một commit", () => {
  const muc = [
    { duongDan: "README.md", maHoa: "utf-8" as const, noiDung: "# a" },
    { duongDan: "public/anh/x.webp", maHoa: "base64" as const, noiDung: "/wAQgA==" },
    { duongDan: "src/app/page.tsx", maHoa: "utf-8" as const, noiDung: "export default function P(){return null}" },
  ];

  it("kho đã có nhánh: blob cho từng tệp → MỘT cây đầy đủ (không base_tree) → commit có cha → PATCH nhánh", async () => {
    const { goi, fetchGia } = gitHubGia();
    const api = new GitHubApi("token-gia", fetchGia);
    const kq = await api.dayCay("cogiang", "web-x", "main", muc, "Antigravity: thử");
    expect(kq).toEqual({ sha: "commit222", nhanh: "main", lanDau: false, soTep: 3 });

    // Mọi lượt gọi đều mang token và phiên bản API.
    expect(goi.length).toBeGreaterThan(0);
    const blobs = goi.filter((g) => g.duong.endsWith("/git/blobs"));
    expect(blobs).toHaveLength(3);
    expect(blobs.map((b) => (b.than as { encoding: string }).encoding).sort()).toEqual(["base64", "utf-8", "utf-8"]);

    const cay = goi.find((g) => g.duong.endsWith("/git/trees"))!.than as { tree: Array<{ path: string; mode: string; type: string; sha: string }>; base_tree?: string };
    expect(cay.base_tree).toBeUndefined();
    expect(cay.tree.map((t) => t.path)).toEqual(["README.md", "public/anh/x.webp", "src/app/page.tsx"]);
    expect(cay.tree.every((t) => t.mode === "100644" && t.type === "blob" && /^blob\d$/.test(t.sha))).toBe(true);

    const commit = goi.find((g) => g.duong.endsWith("/git/commits"))!.than as { parents: string[]; tree: string; message: string };
    expect(commit).toEqual({ message: "Antigravity: thử", tree: "tree111", parents: ["cha000"] });

    const ref = goi.find((g) => g.method === "PATCH")!;
    expect(ref.duong).toBe("/repos/cogiang/web-x/git/refs/heads/main");
    expect(ref.than).toEqual({ sha: "commit222", force: false });
    // Thứ tự: đọc nhánh trước, cập nhật nhánh sau cùng.
    expect(goi[0]!.duong).toContain("/git/ref/heads/main");
    expect(goi.at(-1)!.method).toBe("PATCH");
  });

  it("nhánh chưa có: commit không cha, tạo nhánh bằng POST /git/refs, báo lần đầu", async () => {
    const { goi, fetchGia } = gitHubGia({ nhanhCo: false });
    const kq = await new GitHubApi("t", fetchGia).dayCay("cogiang", "web-x", "main", muc, "m");
    expect(kq.lanDau).toBe(true);
    const commit = goi.find((g) => g.duong.endsWith("/git/commits"))!.than as { parents: string[] };
    expect(commit.parents).toEqual([]);
    const ref = goi.find((g) => g.method === "POST" && g.duong.endsWith("/git/refs"))!;
    expect(ref.than).toEqual({ ref: "refs/heads/main", sha: "commit222" });
  });

  it("tạo kho: riêng tư, có README sẵn (kho trống thì Git Data API từ chối)", async () => {
    const { goi, fetchGia } = gitHubGia();
    const kho = await new GitHubApi("t", fetchGia).taoRepo("web-x", "mô tả");
    expect(kho).toEqual({ owner: "cogiang", repo: "web-x", nhanhMacDinh: "main", url: "https://github.com/cogiang/web-x" });
    const than = goi[0]!.than as { private: boolean; auto_init: boolean; name: string };
    expect(than.private).toBe(true);
    expect(than.auto_init).toBe(true);
  });

  it("thông tin kho: 404 → chưa có; có thì trả nhánh mặc định thật (tài khoản cũ có thể là master)", async () => {
    expect(await new GitHubApi("t", gitHubGia({ khoCo: false }).fetchGia).thongTinRepo("a", "b")).toMatchObject({ co: false, nhanhMacDinh: "main" });
    expect(await new GitHubApi("t", gitHubGia({ nhanhMacDinh: "master" }).fetchGia).thongTinRepo("a", "b")).toMatchObject({ co: true, nhanhMacDinh: "master" });
  });

  it("GitHub từ chối giữa chừng: ném lỗi có câu của GitHub + gợi ý quyền, không ghi nhánh", async () => {
    const { goi, fetchGia } = gitHubGia({ loiBlob: 2 });
    await expect(new GitHubApi("t", fetchGia).dayCay("cogiang", "web-x", "main", muc, "m")).rejects.toThrow(/403 — Resource not accessible.*thiếu quyền/);
    expect(goi.some((g) => g.duong.endsWith("/git/commits") || g.method === "PATCH")).toBe(false);
  });

  it("một blob hỏng thì các worker còn lại DỪNG — không đẩy nốt vài chục blob cho kết quả sẽ vứt", async () => {
    const nhieu = Array.from({ length: 40 }, (_, i) => ({ duongDan: `t/${String(i).padStart(2, "0")}.txt`, maHoa: "utf-8" as const, noiDung: String(i) }));
    const { goi, fetchGia } = gitHubGia({ loiBlob: 3 });
    await expect(new GitHubApi("t", fetchGia).dayCay("cogiang", "web-x", "main", nhieu, "m")).rejects.toThrow(/403/);
    const soBlob = goi.filter((g) => g.duong.endsWith("/git/blobs")).length;
    // Tối đa 4 worker đang dở tay + vài cái đã gửi trước khi cờ hỏng được đặt — không phải 40.
    expect(soBlob).toBeLessThanOrEqual(8);
  });

  it("giới hạn tốc độ phụ của GitHub (403 'rate limit') được nói đúng tên, không đổ cho token", async () => {
    const fetchGia: HamFetch = async () => new Response(JSON.stringify({ message: "You have exceeded a secondary rate limit. Please wait a few minutes before you try again." }), { status: 403 });
    const loi = (await new GitHubApi("t", fetchGia).nguoiDung().catch((e: unknown) => e)) as LoiGitHub;
    expect(loi.message).toMatch(/giới hạn tốc độ/);
    expect(loi.message).not.toMatch(/thiếu quyền/);
  });

  it("chờ nhánh sau auto_init: hỏi lại tới khi có commit đầu", async () => {
    let lan = 0;
    const fetchGia: HamFetch = async () => {
      lan += 1;
      return lan < 3
        ? new Response(JSON.stringify({ message: "Git Repository is empty." }), { status: 409 })
        : new Response(JSON.stringify({ object: { sha: "abc" } }), { status: 200 });
    };
    expect(await new GitHubApi("t", fetchGia).choNhanhSanSang("a", "b", "main")).toBe(true);
    expect(lan).toBe(3);
  });

  it("mỗi lượt gọi có trần thời gian (AbortSignal) — kết nối treo không giữ cả hàm", async () => {
    let coSignal = false;
    const fetchGia: HamFetch = async (_u, init) => {
      coSignal = init?.signal instanceof AbortSignal;
      return new Response(JSON.stringify({ login: "x" }), { status: 200 });
    };
    await new GitHubApi("t", fetchGia).nguoiDung();
    expect(coSignal).toBe(true);
  });

  it("token sai → 401 với câu rõ ràng", async () => {
    const fetchGia: HamFetch = async () => new Response(JSON.stringify({ message: "Bad credentials" }), { status: 401 });
    const loi = await new GitHubApi("t", fetchGia).nguoiDung().catch((e: unknown) => e);
    expect(loi).toBeInstanceOf(LoiGitHub);
    expect((loi as LoiGitHub).message).toMatch(/Bad credentials.*hết hạn/);
  });

  it("mọi lượt gọi mang Bearer token, Accept GitHub JSON và phiên bản API", async () => {
    const headers: Array<Record<string, string>> = [];
    const fetchGia: HamFetch = async (_u, init) => {
      headers.push(init?.headers as Record<string, string>);
      return new Response(JSON.stringify({ login: "x" }), { status: 200 });
    };
    await new GitHubApi("bi-mat", fetchGia).nguoiDung();
    expect(headers[0]).toMatchObject({
      authorization: "Bearer bi-mat",
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    });
  });
});
