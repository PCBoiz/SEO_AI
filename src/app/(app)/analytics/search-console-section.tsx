import Link from "next/link";
import {
  ArrowRight,
  Eye,
  FileCheck2,
  MousePointerClick,
  Percent,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { getOAuthProviderStatuses } from "@/infrastructure/config/oauth-environment";
import { listOAuthConnectionSummaries } from "@/lib/auth/oauth.server";
import {
  layHieuQuaTimKiem,
  type KetQuaHieuQua,
  type TrangTop,
  type TuKhoaTop,
} from "@/lib/seo/search-console.server";
import { Kpi, EmptyPanel } from "@/app/(app)/analytics/thanh-phan-chung";

interface DuAn {
  id: string;
  name: string;
  website: string;
  status: string;
}

/**
 * Khối Google Search Console — component máy chủ RIÊNG để bọc `Suspense`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO TÁCH KHỎI `page.tsx`
 *
 * Khối này gọi Search Console bốn lượt, mỗi lượt chờ tối đa 20 giây. Khi nó
 * `await` thẳng trong component trang, Google chậm là TOÀN BỘ trang trắng — kể
 * cả bốn thẻ số hoạt động nội bộ và biểu đồ 14 ngày, những thứ đọc từ cơ sở dữ
 * liệu của chính mình và chẳng liên quan gì tới Google.
 *
 * Người mở trang "Phân tích hiệu quả" rồi nhìn màn hình trắng 20 giây sẽ kết
 * luận app hỏng, không kết luận "Google đang chậm".
 * ═══════════════════════════════════════════════════════════════════════════
 */
export async function KhoiSearchConsole({
  identity,
  projects,
}: {
  identity: AuthenticatedIdentity;
  projects: DuAn[];
}) {
  const daCauHinh =
    getOAuthProviderStatuses().find((x) => x.id === "google")?.configured ?? false;
  const ketNoi = await listOAuthConnectionSummaries(identity);

  // ⚠️ BIẾN MÔI TRƯỜNG CÓ ĐỦ KHÔNG PHẢI LÀ ĐÃ KẾT NỐI.
  //
  // `configured` chỉ trả lời "workspace có OAuth client chưa". Câu đó đúng
  // nhưng không phải câu người đang đứng ở trang này cần: họ cần biết token của
  // MÌNH có đọc được Search Console không.
  const google = ketNoi.find((x) => x.provider === "google");
  const thieuSearchConsole = google?.quyenConThieu.includes("Search Console") ?? false;
  const daNoiSearchConsole =
    (google?.connectedForAutomation ?? false) && !thieuSearchConsole;

  // Lấy website của dự án hoạt động ĐẦU TIÊN. Chưa có ô chọn dự án ở màn này
  // nên phải NÓI RÕ đang xem dự án nào, thay vì để người đọc tự đoán.
  const duAnHoatDong = projects.filter((p) => p.status === "active");
  const duAnDangXem = duAnHoatDong[0];
  const hieuQua = duAnDangXem
    ? await layHieuQuaTimKiem(identity, duAnDangXem.website)
    : null;
  const soLieu = hieuQua?.trangThai === "ok" ? hieuQua.duLieu : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-geo" />
        <h2 className="text-base font-medium text-foreground">
          Google Search Console
        </h2>
        <span
          className={
            daNoiSearchConsole
              ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400"
              : "rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] text-warning"
          }
        >
          {daNoiSearchConsole
            ? "Đã kết nối"
            : thieuSearchConsole
              ? "Thiếu quyền Search Console"
              : "Chưa kết nối"}
        </span>
      </div>

      {soLieu && (
        <p className="text-xs text-muted-foreground">
          Property <span className="metric text-foreground">{soLieu.property}</span>{" "}
          · {soLieu.khoang.batDau} → {soLieu.khoang.ketThuc}
          {duAnDangXem && ` · dự án ${duAnDangXem.name}`}
          {/* Có nhiều dự án mà chỉ đo được một thì phải nói ra. Im lặng ở đây
              làm người dùng tưởng số này là của cả workspace. */}
          {duAnHoatDong.length > 1 &&
            ` (đang xem 1 trong ${duAnHoatDong.length} dự án)`}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={<MousePointerClick className="h-4 w-4" />}
          label="Clicks (28 ngày)"
          value={soLieu ? soLieu.kyNay.clicks.toLocaleString("vi-VN") : "—"}
          sub={soLieu ? undefined : lyDoNganGon(hieuQua)}
          delta={soLieu?.thayDoi.clicks}
          accent="var(--spectrum-1)"
          muted={!soLieu}
        />
        <Kpi
          icon={<Eye className="h-4 w-4" />}
          label="Hiển thị"
          value={soLieu ? soLieu.kyNay.impressions.toLocaleString("vi-VN") : "—"}
          sub={soLieu ? undefined : lyDoNganGon(hieuQua)}
          delta={soLieu?.thayDoi.impressions}
          accent="var(--spectrum-2)"
          muted={!soLieu}
        />
        <Kpi
          icon={<Percent className="h-4 w-4" />}
          label="CTR"
          value={soLieu ? `${(soLieu.kyNay.ctr * 100).toFixed(1)}%` : "—"}
          sub={soLieu ? undefined : lyDoNganGon(hieuQua)}
          accent="var(--spectrum-3)"
          muted={!soLieu}
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Vị trí TB"
          value={
            soLieu?.kyNay.viTri !== null && soLieu?.kyNay.viTri !== undefined
              ? soLieu.kyNay.viTri.toFixed(1)
              : "—"
          }
          // Có kết nối mà chưa lượt hiển thị nào thì KHÔNG có vị trí trung
          // bình — và đó là sự thật đáng nói, không phải lỗi.
          sub={
            soLieu
              ? soLieu.kyNay.viTri === null
                ? "chưa có lượt hiển thị nào"
                : undefined
              : lyDoNganGon(hieuQua)
          }
          accent="var(--spectrum-4)"
          muted={!soLieu}
        />
      </div>

      {/* ⚠️ KHỐI HƯỚNG DẪN CHỈ HIỆN KHI CHƯA XONG VIỆC.

          Trước đây nó hiện MÃI MÃI. Người đã kết nối vẫn đọc "Bấm nút bên dưới,
          chọn tài khoản Google" ngay dưới huy hiệu xanh "Đã kết nối" — hai câu
          trên cùng màn hình nói ngược nhau, và câu sai là câu to hơn.

          Một hướng dẫn còn nằm đó sau khi đã làm xong thì không còn là hướng
          dẫn, nó là lời nghi ngờ rằng mình chưa làm xong. */}
      {!soLieu && (
        <div className="glass flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            {/* ⚠️ ĐÃ RÚT TỪ BỐN BƯỚC XUỐNG HAI, VÀ ĐỔI GIỌNG. ĐỪNG VIẾT DÀI LẠI.

                Bản cũ liệt kê: tạo OAuth Client ID, thêm redirect URI, đặt biến
                môi trường trên Vercel, rồi mới bấm nút. Bốn bước đó ĐÚNG về kỹ
                thuật nhưng sai về người đọc — chúng viết cho người dựng hệ
                thống, trong khi người mở trang này là người muốn xem số liệu.

                Hệ quả đo được: chủ trang đọc xong bảo "lằng nhằng", và bỏ dở.
                Một hướng dẫn không ai làm theo thì bằng không có hướng dẫn. */}
            <h3 className="text-sm font-medium text-foreground">
              {tieuDeTrangThai(hieuQua)}
            </h3>
            <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
              {moTaTrangThai(hieuQua)}
            </p>
            {hieuQua?.trangThai === "khong-thay-property" && (
              <div className="mt-2 flex flex-col gap-1 rounded-lg border border-border bg-accent/30 p-3">
                <span className="text-xs text-muted-foreground">
                  Website dự án:{" "}
                  <span className="metric text-foreground">{hieuQua.website}</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {hieuQua.daThay.length > 0
                    ? "Tài khoản này đang quản lý:"
                    : "Tài khoản này chưa quản lý property nào."}
                </span>
                {hieuQua.daThay.map((p) => (
                  <span key={p} className="metric text-xs text-foreground">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
          <ol className="flex flex-col gap-2">
            {buocTiepTheo(hieuQua).map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 text-xs text-muted-foreground"
              >
                <span className="metric mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] text-foreground">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center gap-3">
            {daCauHinh ? (
              <a
                href="/api/v1/oauth/google/start?intent=connect"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent px-3 py-1.5 text-xs text-foreground transition-colors hover:bg-accent/70"
              >
                <Search className="h-3.5 w-3.5" />{" "}
                {thieuSearchConsole
                  ? "Cấp quyền Search Console"
                  : daNoiSearchConsole
                    ? "Kết nối lại Search Console"
                    : "Kết nối Search Console"}
              </a>
            ) : (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-accent/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="h-3.5 w-3.5" /> Cấu hình OAuth trước đã
              </Link>
            )}
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Cấu hình kết nối <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {soLieu && soLieu.trangTop.length > 0 ? (
          <BangTrangTop trang={soLieu.trangTop} />
        ) : (
          <EmptyPanel
            icon={<FileCheck2 className="h-4 w-4 text-seo" />}
            title="Top trang theo bài đã đăng"
            text={
              soLieu
                ? "Đã kết nối, nhưng 28 ngày qua chưa trang nào có lượt hiển thị."
                : "Kết nối GSC để xem trang nào lên hạng, kèm thay đổi vị trí."
            }
          />
        )}
        {soLieu && soLieu.tuKhoaTop.length > 0 ? (
          <BangTuKhoa tuKhoa={soLieu.tuKhoaTop} />
        ) : (
          <EmptyPanel
            icon={<Search className="h-4 w-4 text-geo" />}
            title="Truy vấn người ta thật sự gõ"
            text={
              soLieu
                ? "Đã kết nối, nhưng 28 ngày qua chưa có truy vấn nào."
                : "Kết nối GSC để xem câu chữ người tìm thật sự dùng."
            }
          />
        )}
      </div>

      <GhiChuGeo />
    </section>
  );
}

/**
 * Khung chờ trong lúc Search Console trả lời.
 *
 * Giữ đúng dáng của khối thật (một hàng bốn thẻ, hai bảng) để trang không nhảy
 * layout khi số liệu về — nhảy layout ở đây khó chịu hơn ở chỗ khác, vì người
 * dùng đang đọc phần trên thì cả trang giật xuống.
 */
export function KhungChoSearchConsole() {
  return (
    <section className="flex flex-col gap-4" aria-busy="true">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-geo" />
        <h2 className="text-base font-medium text-foreground">
          Google Search Console
        </h2>
        <span className="rounded-full border border-border bg-accent/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          đang hỏi Google…
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="glass flex h-[104px] animate-pulse flex-col gap-3 p-4" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass h-40 animate-pulse p-5" />
        <div className="glass h-40 animate-pulse p-5" />
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */

/* ⚠️ SÁU TRẠNG THÁI, SÁU CÂU CHỮ. ĐỪNG GỘP LẠI THÀNH "CHƯA CÓ DỮ LIỆU".

   Mỗi trạng thái dưới đây cần một hành động khác nhau của người đọc: bấm kết
   nối · cấp thêm quyền · kết nối lại vì token chết · thêm property vào Search
   Console · tạo dự án · chờ rồi thử lại.

   Gộp chúng thành một câu là bắt người dùng tự đoán mình đang ở đâu trong sáu
   chỗ đó. Bản trước gộp cả sáu thành đúng hai chữ "cần kết nối", kể cả cho
   người đã kết nối xong. */

function tieuDeTrangThai(ketQua: KetQuaHieuQua | null): string {
  if (!ketQua) return "Chưa có dự án nào để đo";
  switch (ketQua.trangThai) {
    case "thieu-quyen":
      return "Kết nối thiếu quyền Search Console";
    case "can-ket-noi-lai":
      return "Kết nối đã ngừng hoạt động";
    case "khong-thay-property":
      return "Đã kết nối, nhưng không thấy property của website này";
    case "loi":
      return "Không lấy được số liệu lúc này";
    default:
      return "Kết nối Search Console để đo hiệu quả thật";
  }
}

function moTaTrangThai(ketQua: KetQuaHieuQua | null): string {
  if (!ketQua) {
    return "Trang này đo theo website của dự án. Tạo một dự án và điền địa chỉ website trước đã.";
  }
  switch (ketQua.trangThai) {
    case "thieu-quyen":
      return `Token hiện tại chưa có quyền: ${ketQua.quyenConThieu.join(", ")}. Google không tự nới quyền cho token đã cấp, nên phải cấp lại.`;
    case "can-ket-noi-lai":
      return ketQua.lyDo;
    case "khong-thay-property":
      return "Tài khoản Google đang kết nối không quản lý property nào khớp website của dự án. Kiểm lại xem đúng tài khoản chưa, hoặc thêm website vào Search Console.";
    case "loi":
      return ketQua.lyDo;
    default:
      return "Sau khi kết nối, trang này hiển thị clicks / hiển thị / CTR / vị trí trung bình 28 ngày, top trang, và truy vấn người ta thật sự gõ.";
  }
}

function buocTiepTheo(ketQua: KetQuaHieuQua | null): string[] {
  if (ketQua?.trangThai === "khong-thay-property") {
    return [
      "Mở search.google.com/search-console và kiểm xem website đã được thêm và xác minh chưa.",
      "Nếu đã có, bấm kết nối lại và chọn đúng tài khoản Google đang quản lý property đó.",
    ];
  }
  if (ketQua?.trangThai === "loi") {
    return ["Thử tải lại trang sau ít phút. Nếu vẫn vậy thì bấm kết nối lại."];
  }
  return [
    "Bấm nút bên dưới, chọn tài khoản Google đang quản lý Search Console.",
    "Chọn property trùng với website của dự án.",
  ];
}

/** Lý do ngắn đặt dưới thẻ số — đủ để biết vì sao trống, không dài hơn. */
function lyDoNganGon(ketQua: KetQuaHieuQua | null): string {
  if (!ketQua) return "chưa có dự án";
  switch (ketQua.trangThai) {
    case "chua-ket-noi":
      return "cần kết nối";
    case "thieu-quyen":
      return "thiếu quyền";
    case "can-ket-noi-lai":
      return "cần kết nối lại";
    case "khong-thay-property":
      return "không thấy property";
    case "loi":
      return "lỗi khi gọi";
    default:
      return "—";
  }
}

function BangTrangTop({ trang }: { trang: TrangTop[] }) {
  return (
    <div className="glass flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <FileCheck2 className="h-4 w-4 text-seo" />
        <h3 className="text-sm font-medium text-foreground">
          Top trang theo bài đã đăng
        </h3>
      </div>
      {/* Bảng là thứ DUY NHẤT trong trang được phép rộng hơn khung, và chỉ khi
          nằm trong hộp cuộn riêng của nó. */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 font-normal">Trang</th>
              <th className="pb-2 text-right font-normal">Clicks</th>
              <th className="pb-2 text-right font-normal">Hiển thị</th>
              <th className="pb-2 text-right font-normal">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            {trang.map((t) => (
              <tr key={t.duongDan} className="border-t border-border/60">
                <td
                  className="max-w-[18rem] truncate py-2 text-foreground"
                  title={t.duongDan}
                >
                  {t.duongDan}
                </td>
                <td className="metric py-2 text-right text-foreground">
                  {t.clicks.toLocaleString("vi-VN")}
                </td>
                <td className="metric py-2 text-right text-muted-foreground">
                  {t.impressions.toLocaleString("vi-VN")}
                </td>
                <td className="metric py-2 text-right text-muted-foreground">
                  {t.viTri.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Truy vấn người ta thật sự gõ.
 *
 * ⚠️ ĐÂY LÀ BẢNG ĐÁNG HÀNH ĐỘNG NHẤT TRONG CẢ TRANG, và trước đây không có.
 *
 * Top trang cho biết cái gì đang chạy được; top truy vấn cho biết NÊN VIẾT GÌ
 * TIẾP. Một truy vấn đã có hiển thị mà vị trí 15–30 là một bài đáng viết lại —
 * nó chứng minh Google đã hiểu trang này nói về chủ đề đó, chỉ chưa xếp đủ cao.
 *
 * Nhãn "đuôi dài" đánh dấu truy vấn ≥7 chữ: nghiên cứu vòng 7 đo được nhóm này
 * kích hoạt AI Overviews 46,4% so với truy vấn 1 chữ chỉ 9,5%, và trang mới
 * không backlink chỉ có cửa thật ở nhóm đó.
 */
function BangTuKhoa({ tuKhoa }: { tuKhoa: TuKhoaTop[] }) {
  const soDuoiDai = tuKhoa.filter((t) => t.duoiDai).length;
  return (
    <div className="glass flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-geo" />
          <h3 className="text-sm font-medium text-foreground">
            Truy vấn người ta thật sự gõ
          </h3>
        </div>
        {soDuoiDai > 0 && (
          <span className="metric text-[11px] text-muted-foreground">
            {soDuoiDai}/{tuKhoa.length} đuôi dài
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="pb-2 font-normal">Truy vấn</th>
              <th className="pb-2 text-right font-normal">Clicks</th>
              <th className="pb-2 text-right font-normal">Hiển thị</th>
              <th className="pb-2 text-right font-normal">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            {tuKhoa.map((t) => (
              <tr key={t.truyVan} className="border-t border-border/60">
                <td className="max-w-[16rem] py-2 text-foreground" title={t.truyVan}>
                  <span className="truncate">{t.truyVan}</span>
                  {t.duoiDai && (
                    <span
                      className="ml-1.5 rounded px-1 py-0.5 text-[10px] leading-none"
                      style={{
                        background:
                          "color-mix(in oklab, var(--spectrum-2) 16%, transparent)",
                        color: "var(--spectrum-2)",
                      }}
                      title="Từ 7 chữ trở lên — nhóm đáng viết bài nhất"
                    >
                      đuôi dài
                    </span>
                  )}
                </td>
                <td className="metric py-2 text-right text-foreground">
                  {t.clicks.toLocaleString("vi-VN")}
                </td>
                <td className="metric py-2 text-right text-muted-foreground">
                  {t.impressions.toLocaleString("vi-VN")}
                </td>
                <td className="metric py-2 text-right text-muted-foreground">
                  {t.viTri.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * ⚠️ THAY CHO BẢNG "ĐƯỢC AI TRÍCH DẪN (GEO)" — MỘT BẢNG KHÔNG BAO GIỜ CÓ DỮ LIỆU.
 *
 * Bảng cũ ghi "Theo dõi nội dung được ChatGPT / Perplexity / AI Overviews nhắc
 * tới" bên dưới một ô trống. Câu đó hứa một tính năng **không có nguồn dữ liệu
 * nào cấp được**:
 *
 *   · Search Console KHÔNG tách riêng AI Overviews — Google gộp lượt hiển thị
 *     trong AIO vào tổng chung, không có chiều nào lọc ra.
 *   · ChatGPT và Perplexity không phát API nào cho chủ trang biết mình có được
 *     trích dẫn hay không.
 *   · `log-bot.mjs` bên kho halongxanh360 nghe như bản ghi lượt bot, nhưng nó
 *     GIẢ LÀM bot để kiểm trang có phục vụ nội dung không — nó không ghi lượt
 *     truy cập thật của ai cả.
 *
 * Nên bảng đó chính là thứ mà chú thích ở đầu `page.tsx` gọi tên: một tấm biển
 * đội lốt tính năng. Người dùng nhìn ô trống rồi chờ nó đầy lên, và nó sẽ không
 * bao giờ đầy.
 *
 * Thay bằng lời nói thẳng + thứ ĐO ĐƯỢC THẬT ngay bên trên (truy vấn đuôi dài).
 * Nếu sau này Google mở chiều dữ liệu AIO, thay khối này bằng bảng thật.
 */
function GhiChuGeo() {
  return (
    <div className="glass flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-geo" />
        <h3 className="text-sm font-medium text-foreground">
          Vì sao không có bảng &quot;được AI trích dẫn&quot;
        </h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Không nguồn nào cấp được số đó. Search Console gộp lượt hiển thị trong AI
        Overviews vào tổng chung và không có chiều nào lọc riêng; ChatGPT và
        Perplexity không phát API cho chủ trang. Một ô trống kèm lời hứa &quot;sẽ
        theo dõi&quot; thì tệ hơn không có ô nào — nên nó đã được gỡ.
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Thứ đo được thật nằm ngay trên: <strong>truy vấn đuôi dài</strong>. Truy
        vấn từ 7 chữ trở lên kích hoạt AI Overviews <strong>46,4%</strong> số lần,
        so với truy vấn 1 chữ chỉ 9,5%. Lên hạng ở nhóm đó là đường vào AI thật sự
        đo được — chứ không phải chờ một bảng không có dữ liệu.
      </p>
    </div>
  );
}
