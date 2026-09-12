import type { MucGit } from "@/domain/dung-web/github-day";

/**
 * GitHub qua Git Data API — đủ để tạo kho và đẩy TRỌN một cây tệp thành một
 * commit. Không `git` trên máy, không thư mục tạm: chạy được từ Vercel.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO GIT DATA API CHỨ KHÔNG PHẢI "CONTENTS API"
 *
 * `PUT /repos/o/r/contents/<path>` mỗi tệp một commit: 50 tệp là 50 commit,
 * và tệp bị xoá khỏi bản dựng mới (một khối bỏ đi) vẫn nằm lại trong kho —
 * Cloudflare sẽ dựng cả tệp mồ côi đó. Git Data API tạo MỘT cây đầy đủ rồi
 * một commit: kho luôn là ảnh chụp đúng của bản dựng, tệp cũ tự biến mất.
 *
 * `fetch` được tiêm vào để test chạy không cần mạng — và để phép thử khẳng
 * định được THỨ TỰ và NỘI DUNG từng lượt gọi, không chỉ kết quả cuối.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type HamFetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface KetQuaDay {
  /** Commit vừa tạo. */
  sha: string;
  /** Nhánh đã đẩy vào. */
  nhanh: string;
  /** Kho trước đó chưa có commit nào của Antigravity (lần đầu). */
  lanDau: boolean;
  soTep: number;
}

export class LoiGitHub extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "LoiGitHub";
  }
}

const GOC = "https://api.github.com";

export class GitHubApi {
  constructor(
    private readonly token: string,
    private readonly fetchFn: HamFetch = (u, i) => fetch(u, i),
  ) {}

  private async goi<T>(method: string, duong: string, than?: unknown): Promise<{ status: number; du: T }> {
    const dap = await this.fetchFn(`${GOC}${duong}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "user-agent": "antigravity-os",
        ...(than !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: than !== undefined ? JSON.stringify(than) : undefined,
      // Một kết nối treo không được giữ cả lượt đẩy tới khi Vercel cắt hàm
      // với một lỗi 500 không nói gì. 30 giây là dư cho một blob.
      signal: AbortSignal.timeout(30_000),
    });
    const chu = await dap.text();
    let du: T;
    try {
      du = (chu ? JSON.parse(chu) : {}) as T;
    } catch {
      du = {} as T;
    }
    return { status: dap.status, du };
  }

  /** Ném lỗi có câu của GitHub — người dùng đọc được vì sao (token hết hạn, thiếu quyền…). */
  private static kiem(status: number, du: unknown, viec: string): void {
    if (status >= 200 && status < 300) return;
    const m = (du as { message?: string; errors?: Array<{ message?: string }> }) ?? {};
    const chiTiet = m.errors?.map((e) => e.message).filter(Boolean).join("; ");
    // GitHub trả 403 cho CẢ thiếu quyền lẫn "secondary rate limit" (>80 lượt
    // tạo nội dung/phút, >500/giờ — một lượt đẩy là ~40). Gộp làm một là bảo
    // người dùng đi tạo token mới trong khi token vẫn tốt.
    const gioiHan = /rate limit/i.test(m.message ?? "") || status === 429;
    const goiY = gioiHan
      ? " GitHub đang giới hạn tốc độ (đẩy nhiều lần liền nhau) — chờ vài phút rồi đẩy lại; token vẫn tốt."
      : status === 401
        ? " Token GitHub sai hoặc đã hết hạn."
        : status === 403
          ? " Token thiếu quyền (cần quyền Contents: Read and write, và Administration để tạo kho)."
          : status === 409
            ? " Kho đang trống — tạo kho có README rồi đẩy lại."
            : "";
    throw new LoiGitHub(`${viec}: GitHub trả ${status}${m.message ? ` — ${m.message}` : ""}${chiTiet ? ` (${chiTiet})` : ""}.${goiY}`, status);
  }

  async nguoiDung(): Promise<{ login: string }> {
    const { status, du } = await this.goi<{ login?: string }>("GET", "/user");
    GitHubApi.kiem(status, du, "Kiểm token");
    if (!du.login) throw new LoiGitHub("GitHub không trả tên tài khoản.", status);
    return { login: du.login };
  }

  /** Kho có chưa, và nhánh mặc định là gì (tài khoản cũ có thể là `master`). */
  async thongTinRepo(owner: string, repo: string): Promise<{ co: boolean; nhanhMacDinh: string; url: string; moTa: string }> {
    const { status, du } = await this.goi<{ default_branch?: string; html_url?: string; description?: string | null }>("GET", `/repos/${owner}/${repo}`);
    if (status === 404) return { co: false, nhanhMacDinh: "main", url: `https://github.com/${owner}/${repo}`, moTa: "" };
    GitHubApi.kiem(status, du, "Đọc kho");
    return { co: true, nhanhMacDinh: du.default_branch ?? "main", url: du.html_url ?? `https://github.com/${owner}/${repo}`, moTa: du.description ?? "" };
  }

  /**
   * Tạo kho RIÊNG TƯ, có sẵn README (`auto_init`) — kho trống thì Git Data
   * API từ chối tạo blob (409). Commit đầu của Antigravity thay cả cây, README
   * đó không còn.
   */
  async taoRepo(ten: string, moTa: string): Promise<{ owner: string; repo: string; nhanhMacDinh: string; url: string }> {
    const { status, du } = await this.goi<{ name?: string; owner?: { login?: string }; default_branch?: string; html_url?: string }>(
      "POST",
      "/user/repos",
      { name: ten, description: moTa.slice(0, 300), private: true, auto_init: true, has_issues: false, has_wiki: false, has_projects: false },
    );
    GitHubApi.kiem(status, du, "Tạo kho");
    const owner = du.owner?.login;
    if (!owner || !du.name) throw new LoiGitHub("GitHub không trả tên kho vừa tạo.", status);
    return { owner, repo: du.name, nhanhMacDinh: du.default_branch ?? "main", url: du.html_url ?? `https://github.com/${owner}/${du.name}` };
  }

  /**
   * Đợi nhánh mặc định có commit đầu.
   *
   * `auto_init` tạo README BẤT ĐỒNG BỘ: `POST /user/repos` trả 201 xong, vài
   * trăm mili giây sau nhánh mới có. Đẩy ngay thì đọc nhánh ra 409/404, commit
   * không cha, rồi tạo nhánh trả 422 "Reference already exists" — lỗi khó
   * hiểu, đẩy lại thì được. Hỏi lại vài lần, giãn dần, tối đa ~7 giây.
   */
  async choNhanhSanSang(owner: string, repo: string, nhanh: string): Promise<boolean> {
    for (const cho of [0, 300, 700, 1500, 2000, 2500]) {
      if (cho) await new Promise((r) => setTimeout(r, cho));
      const ref = await this.goi<{ object?: { sha?: string } }>("GET", `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(nhanh)}`);
      if (ref.status === 200 && ref.du.object?.sha) return true;
      if (ref.status !== 404 && ref.status !== 409) GitHubApi.kiem(ref.status, ref.du, "Đọc nhánh");
    }
    return false;
  }

  /** Đẩy TRỌN cây thành một commit lên nhánh. */
  async dayCay(owner: string, repo: string, nhanh: string, muc: readonly MucGit[], thongDiep: string): Promise<KetQuaDay> {
    const goc = `/repos/${owner}/${repo}/git`;

    // 1. Commit hiện tại của nhánh (không có = nhánh chưa tồn tại).
    const ref = await this.goi<{ object?: { sha?: string } }>("GET", `${goc}/ref/heads/${encodeURIComponent(nhanh)}`);
    let cha: string | undefined;
    if (ref.status === 200) cha = ref.du.object?.sha;
    else if (ref.status !== 404 && ref.status !== 409) GitHubApi.kiem(ref.status, ref.du, "Đọc nhánh");

    // 2. Blob cho từng tệp — vài cái một lúc, không dội cả trăm yêu cầu cùng
    //    lúc vào giới hạn phụ của GitHub.
    const sha = new Map<string, string>();
    const hang = [...muc];
    const CUNG_LUC = 4;
    // Một blob hỏng là cả lượt hỏng: các worker còn lại phải DỪNG, không tiếp
    // tục đẩy vài chục blob nữa cho một kết quả sẽ bị vứt (và ăn vào giới hạn
    // tốc độ của GitHub).
    let hong = false;
    await Promise.all(
      Array.from({ length: Math.min(CUNG_LUC, hang.length) }, async () => {
        for (let m = hang.shift(); m && !hong; m = hang.shift()) {
          try {
            const { status, du } = await this.goi<{ sha?: string }>("POST", `${goc}/blobs`, { content: m.noiDung, encoding: m.maHoa });
            GitHubApi.kiem(status, du, `Đưa tệp ${m.duongDan}`);
            if (!du.sha) throw new LoiGitHub(`GitHub không trả sha cho ${m.duongDan}.`, status);
            sha.set(m.duongDan, du.sha);
          } catch (loi) {
            hong = true;
            throw loi;
          }
        }
      }),
    );

    // 3. Một cây ĐẦY ĐỦ (không base_tree): tệp không còn trong bản dựng thì
    //    không còn trong kho.
    const cay = await this.goi<{ sha?: string }>("POST", `${goc}/trees`, {
      tree: muc.map((m) => ({ path: m.duongDan, mode: "100644", type: "blob", sha: sha.get(m.duongDan) })),
    });
    GitHubApi.kiem(cay.status, cay.du, "Tạo cây");

    // 4. Commit.
    const commit = await this.goi<{ sha?: string }>("POST", `${goc}/commits`, {
      message: thongDiep,
      tree: cay.du.sha,
      parents: cha ? [cha] : [],
    });
    GitHubApi.kiem(commit.status, commit.du, "Tạo commit");
    if (!commit.du.sha) throw new LoiGitHub("GitHub không trả sha commit.", commit.status);

    // 5. Trỏ nhánh vào commit.
    const refMoi = cha
      ? await this.goi("PATCH", `${goc}/refs/heads/${encodeURIComponent(nhanh)}`, { sha: commit.du.sha, force: false })
      : await this.goi("POST", `${goc}/refs`, { ref: `refs/heads/${nhanh}`, sha: commit.du.sha });
    GitHubApi.kiem(refMoi.status, refMoi.du, "Cập nhật nhánh");

    return { sha: commit.du.sha, nhanh, lanDau: !cha, soTep: muc.length };
  }
}
