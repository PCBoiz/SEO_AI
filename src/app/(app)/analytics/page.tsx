import Link from "next/link";
import {
  Activity,
  FileCheck2,
  FolderOpen,
  Boxes,
  Search,
  Sparkles,
  ArrowRight,
  MousePointerClick,
  Eye,
  Percent,
  TrendingUp,
} from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import { getModuleJobService } from "@/lib/modules/module-service.server";
import { listAiProviderStatuses } from "@/lib/ai/ai-provider-registry.server";
import { getOAuthProviderStatuses } from "@/infrastructure/config/oauth-environment";
import { listOAuthConnectionSummaries } from "@/lib/auth/oauth.server";
import { AreaChart } from "@/components/viz/area-chart";
import { AnalyticsInsights } from "@/app/(app)/analytics/analytics-insights";
import {
  layHieuQuaTimKiem,
  type KetQuaHieuQua,
  type TrangTop,
} from "@/lib/seo/search-console.server";

export const dynamic = "force-dynamic";

const DAYS = 14;

export default async function AnalyticsPage() {
  // Trạng thái ĐỌC TỪ CẤU HÌNH THẬT, không đóng cứng.
  //
  // Bản trước vẽ một <span> với `cursor-not-allowed` và chữ “(cần cấu hình)”
  // — luôn luôn tắt, kể cả khi đã cấu hình xong. Người dùng làm đủ bốn bước
  // hướng dẫn rồi quay lại vẫn thấy đúng cái nút chết đó, và không có cách
  // nào biết mình đã làm đúng hay chưa.
  //
  // Một nút không bao giờ bật thì không phải nút, nó là một tấm biển.
  const googleOAuth = getOAuthProviderStatuses().find((x) => x.id === "google");
  const daCauHinh = googleOAuth?.configured ?? false;
  const identity = await requirePageIdentity();
  const [projects, recentJobs, ketNoi] = await Promise.all([
    getProjectService().list(identity),
    getModuleJobService().listRecentActivity(identity, 50),
    listOAuthConnectionSummaries(identity),
  ]);

  // ⚠️ BIẾN MÔI TRƯỜNG CÓ ĐỦ KHÔNG PHẢI LÀ ĐÃ KẾT NỐI.
  //
  // Bản trước chỉ hỏi `configured` — tức là "workspace có OAuth client chưa".
  // Câu đó đúng, nhưng không phải câu người đang đứng ở trang này cần trả lời.
  // Họ cần biết: token của TÔI có đọc được Search Console không.
  //
  // Ba trạng thái khác nhau, ba câu chữ khác nhau, và trước đây bị gộp thành
  // một: chưa cấu hình workspace / đã cấu hình mà chưa kết nối / kết nối rồi
  // nhưng token thiếu đúng quyền Search Console.
  const google = ketNoi.find((x) => x.provider === "google");
  const thieuSearchConsole = google?.quyenConThieu.includes("Search Console") ?? false;
  const daNoiSearchConsole =
    (google?.connectedForAutomation ?? false) && !thieuSearchConsole;

  // ⚠️ ĐI HỎI SEARCH CONSOLE THẬT. TRƯỚC ĐÂY KHỐI DƯỚI CHỈ LÀ MỘT BỨC TRANH.
  //
  // Bốn thẻ số của phần Search Console từng viết cứng `value="—"` và
  // `sub="cần kết nối"` ngay trong JSX. Không đọc từ đâu cả, nên chúng hiện y
  // hệt nhau dù người dùng đã kết nối hay chưa — và cả kho không có một dòng
  // nào gọi API Search Console để mà đọc.
  //
  // Đó đúng là lỗi mà chú thích ở đầu tệp này cảnh báo cho phần bên trên: "một
  // nút không bao giờ bật thì không phải nút, nó là một tấm biển". Bốn thẻ số
  // không bao giờ đổi cũng vậy.
  //
  // Lấy website của dự án hoạt động ĐẦU TIÊN. Chưa có chọn dự án ở màn này nên
  // nói rõ đang xem dự án nào, thay vì để người đọc tự đoán.
  const duAnDangXem = projects.find((p) => p.status === "active");
  const hieuQua = duAnDangXem
    ? await layHieuQuaTimKiem(identity, duAnDangXem.website)
    : null;
  const soLieu = hieuQua?.trangThai === "ok" ? hieuQua.duLieu : null;

  // Gom hoạt động theo ngày (14 ngày gần nhất) — dữ liệu nội bộ thật.
  const buckets = buildDayBuckets(DAYS);
  for (const job of recentJobs) {
    const key = startOfDay(new Date(job.createdAt));
    const bucket = buckets.find((b) => b.day === key);
    if (!bucket) continue;
    bucket.total += 1;
    if (job.status === "succeeded") bucket.ok += 1;
  }

  const totalRuns = buckets.reduce((sum, b) => sum + b.total, 0);
  const totalOk = buckets.reduce((sum, b) => sum + b.ok, 0);
  const activeProjects = projects.filter((p) => p.status === "active").length;
  const modulesUsed = new Set(recentJobs.map((j) => j.moduleKey)).size;
  const rate = totalRuns > 0 ? Math.round((totalOk / totalRuns) * 100) : null;
  // So sánh nửa sau với nửa đầu của khoảng đang xem để biết đang tăng hay giảm.
  const half = Math.floor(buckets.length / 2);
  const previousRuns = buckets.slice(0, half).reduce((sum, b) => sum + b.total, 0);
  const currentRuns = buckets.slice(half).reduce((sum, b) => sum + b.total, 0);
  const previousOk = buckets.slice(0, half).reduce((sum, b) => sum + b.ok, 0);
  const currentOk = buckets.slice(half).reduce((sum, b) => sum + b.ok, 0);
  const runsDelta = percentChange(previousRuns, currentRuns);
  const okDelta = percentChange(previousOk, currentOk);
  const aiProviders = listAiProviderStatuses().map(({ id, label, model }) => ({
    id,
    label,
    model,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <span className="eyebrow">Theo dõi · SEO + GEO</span>
        <h1 className="display-balance text-2xl font-semibold tracking-tight text-foreground">
          Phân tích hiệu quả
        </h1>
        <p className="text-sm text-muted-foreground">
          Hoạt động tự động hóa trong app + xếp hạng thực tế từ Google Search
          Console (khi kết nối).
        </p>
      </header>

      {/* Hoạt động nội bộ — dữ liệu thật */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            icon={<Activity className="h-4 w-4" />}
            label={`Lần chạy (${DAYS} ngày)`}
            value={String(totalRuns)}
            accent="var(--spectrum-3)"
            delta={runsDelta}
            spark={buckets.map((b) => b.total)}
          />
          <Kpi
            icon={<FileCheck2 className="h-4 w-4" />}
            label="Thành công"
            value={String(totalOk)}
            sub={rate === null ? undefined : `${rate}% tỷ lệ`}
            accent="var(--spectrum-1)"
            delta={okDelta}
            spark={buckets.map((b) => b.ok)}
          />
          <Kpi icon={<FolderOpen className="h-4 w-4" />} label="Dự án hoạt động" value={String(activeProjects)} accent="var(--spectrum-2)" />
          <Kpi icon={<Boxes className="h-4 w-4" />} label="Loại module đã dùng" value={String(modulesUsed)} accent="var(--spectrum-4)" />
        </div>

        <div className="glass p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <TrendingUp className="h-4 w-4 text-seo" /> Hoạt động {DAYS} ngày
            </h2>
            <span className="metric text-xs text-muted-foreground">
              lần chạy / thành công theo ngày
            </span>
          </div>
          <div className="text-foreground">
            <AreaChart
              labels={buckets.map((b) => b.label)}
              series={[
                { label: "Lần chạy", color: "#9b8cff", points: buckets.map((b) => b.total) },
                { label: "Thành công", color: "#4fe3c1", points: buckets.map((b) => b.ok) },
              ]}
            />
          </div>
        </div>

        <AnalyticsInsights aiProviders={aiProviders} />
      </section>

      {/* Google Search Console — kết nối để có dữ liệu thật */}
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

            Trước đây nó hiện MÃI MÃI. Người đã kết nối vẫn đọc "Bấm nút bên
            dưới, chọn tài khoản Google" ngay dưới huy hiệu xanh "Đã kết nối" —
            hai câu trên cùng màn hình nói ngược nhau, và câu sai là câu to hơn.

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
                Một hướng dẫn không ai làm theo thì bằng không có hướng dẫn.

                Ba bước đầu là việc CHỈ LÀM MỘT LẦN cho cả workspace, và đã có
                trang Cài đặt lo. Nên ở đây chỉ còn đúng thứ người đọc cần biết:
                đã cấu hình chưa, và bấm vào đâu. */}
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
              <li key={i} className="flex items-start gap-2.5 text-xs text-muted-foreground">
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
          <EmptyPanel
            icon={<Sparkles className="h-4 w-4 text-geo" />}
            title="Được AI trích dẫn (GEO)"
            text="Theo dõi nội dung được ChatGPT / Perplexity / AI Overviews nhắc tới."
          />
        </div>
      </section>
    </div>
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
      return "Sau khi kết nối, trang này hiển thị clicks / hiển thị / CTR / vị trí trung bình 28 ngày, và top trang theo từng bài đã đăng.";
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
                <td className="max-w-[18rem] truncate py-2 text-foreground" title={t.duongDan}>
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

function Kpi({
  icon,
  label,
  value,
  sub,
  accent,
  muted,
  delta,
  spark,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  muted?: boolean;
  // Thay đổi so với kỳ liền trước cùng độ dài (đơn vị %). null = chưa đủ dữ liệu.
  delta?: number | null;
  // Chuỗi số để vẽ biểu đồ mini trong thẻ.
  spark?: number[];
}) {
  return (
    <div className="glass flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{
            background: `color-mix(in oklab, ${accent} ${muted ? 8 : 16}%, transparent)`,
            color: muted ? "var(--muted-foreground)" : accent,
          }}
        >
          {icon}
        </span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span
          className={`metric text-2xl font-semibold ${muted ? "text-muted-foreground" : "text-foreground"}`}
        >
          {value}
        </span>
        {spark && spark.some((point) => point > 0) && (
          <Sparkline points={spark} color={accent} />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {delta !== undefined && delta !== null && <DeltaBadge value={delta} />}
        {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// Nhãn tăng/giảm so với kỳ trước. Màu theo hướng, kèm mũi tên để không phụ
// thuộc hoàn toàn vào màu (người mù màu vẫn đọc được).
function DeltaBadge({ value }: { value: number }) {
  const flat = Math.abs(value) < 1;
  const up = value > 0;
  // Dùng TOKEN chứ không viết cứng mã màu.
  //
  // Ba mã cũ (#8a8aa0, #4fe3c1, #e0a04a) đều là sắc của chế độ TỐI, viết thẳng
  // vào đây nên không đổi theo chủ đề. Trên nền sáng chúng đo được 3,22 — dưới
  // ngưỡng WCAG 4,5, và là bốn lượt trượt tương phản CUỐI CÙNG còn lại của cả
  // ứng dụng sau khi đã sửa token chữ mờ và thẻ nhãn.
  const color = flat
    ? "var(--muted-foreground)"
    : up
      ? "var(--success)"
      : "var(--warning)";
  return (
    <span
      className="metric inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none"
      style={{
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        color,
      }}
      title="So với kỳ liền trước cùng độ dài"
    >
      {flat ? "→" : up ? "↑" : "↓"} {flat ? "không đổi" : `${Math.abs(Math.round(value))}%`}
    </span>
  );
}

// Biểu đồ mini trong thẻ chỉ số — tự vẽ, không thêm thư viện.
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const width = 64;
  const height = 22;
  const max = Math.max(...points, 1);
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const path = points
    .map((point, index) => {
      const x = index * step;
      const y = height - (point / max) * (height - 2) - 1;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className="shrink-0 opacity-80"
    >
      <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function EmptyPanel({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="glass flex flex-col gap-2 p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
      <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground/60">
        Chưa có dữ liệu
      </div>
    </div>
  );
}

interface DayBucket {
  day: number;
  label: string;
  total: number;
  ok: number;
}

// Không có gì ở kỳ trước thì không kết luận tăng/giảm (tránh hiện "+100%" vô nghĩa).
function percentChange(previous: number, current: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDayBuckets(days: number): DayBucket[] {
  const out: DayBucket[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({
      day: d.getTime(),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      total: 0,
      ok: 0,
    });
  }
  return out;
}
