import Link from "next/link";
import { ArrowRight, Globe, ShieldAlert } from "lucide-react";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import {
  layTrangThaiChiMuc,
  type KetQuaChiMuc,
} from "@/lib/seo/lap-chi-muc.server";
import type { DongChiMuc, NhomChiMuc } from "@/domain/seo/lap-chi-muc";

/**
 * Khối "Google đã lập chỉ mục trang nào" — component máy chủ riêng, Suspense riêng.
 *
 * ⚠️ PHẢI TÁCH KHỎI KHỐI SỐ LIỆU. Soi 31 địa chỉ mất ~10–20 giây; gộp chung thì
 * bốn thẻ số clicks/hiển thị phải chờ theo, dù chúng chỉ cần bốn lượt gọi.
 */
export async function KhoiLapChiMuc({
  identity,
  duAn,
}: {
  identity: AuthenticatedIdentity;
  duAn: { id: string; name: string; website: string } | null;
}) {
  if (!duAn) return null;
  const kq = await layTrangThaiChiMuc(identity, duAn.website);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Globe className="h-4 w-4 text-seo" />
        <h2 className="text-base font-medium text-foreground">
          Google đã lập chỉ mục trang nào
        </h2>
        <span className="text-xs text-muted-foreground">
          · dự án <span className="text-foreground">{duAn.name}</span>
        </span>
        {kq.trangThai === "ok" && (
          <span className="metric ml-auto text-[11px] text-muted-foreground">
            soi lúc {gioVN(kq.soiLuc)} · đệm 30 phút
          </span>
        )}
      </div>

      {kq.trangThai === "ok" ? (
        <BangChiMuc kq={kq} />
      ) : (
        <div className="glass flex flex-col gap-2 p-5">
          <p className="text-sm text-foreground">{tieuDe(kq)}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{moTa(kq)}</p>
          {kq.trangThai === "khong-thay-property" && (
            <Link
              href={`/projects/${duAn.id}`}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Sửa website của dự án {duAn.name} <ArrowRight className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

export function KhungChoLapChiMuc() {
  return (
    <section className="flex flex-col gap-4" aria-busy="true">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-seo" />
        <h2 className="text-base font-medium text-foreground">
          Google đã lập chỉ mục trang nào
        </h2>
        <span className="rounded-full border border-border bg-accent/40 px-2 py-0.5 text-[11px] text-muted-foreground">
          đang soi từng địa chỉ trong sitemap — mất 10–20 giây…
        </span>
      </div>
      <div className="glass h-48 animate-pulse p-5" />
    </section>
  );
}

/* -------------------------------------------------------------------------- */

function BangChiMuc({ kq }: { kq: Extract<KetQuaChiMuc, { trangThai: "ok" }> }) {
  const t = kq.tomTat;
  const canXem = t.dong.filter((d) => d.nhom !== "da-vao");
  const trangChu = t.dong.find((d) => d.duongDan === "/");

  return (
    <div className="glass flex flex-col gap-4 p-5">
      {/* Một dòng tổng — câu trả lời cho "Google index được chưa". */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="metric text-2xl font-semibold text-foreground">
          {t.daVao}/{t.tong}
        </span>
        <span className="text-sm text-muted-foreground">
          địa chỉ trong sitemap đã vào chỉ mục Google
        </span>
        {t.chuaVao > 0 && <Nhan mau="var(--warning)">{t.chuaVao} chưa vào</Nhan>}
        {t.biChan > 0 && <Nhan mau="var(--destructive)">{t.biChan} bị chặn</Nhan>}
        {t.loiTai > 0 && <Nhan mau="var(--destructive)">{t.loiTai} không tải được</Nhan>}
      </div>

      {/* Trang chủ là trang quyết định TÊN SITE. Google đọc bản mới chưa là
          câu hỏi cụ thể nhất người dùng đang có sau khi đổi tên. */}
      {trangChu && (
        <p className="text-xs text-muted-foreground">
          Trang chủ: Google crawl lần cuối{" "}
          <span className="metric text-foreground">
            {trangChu.crawlGanNhat ? gioVN(trangChu.crawlGanNhat) : "chưa bao giờ"}
          </span>
          . Đổi gì trên trang chủ sau mốc đó thì Google chưa thấy — vào Search
          Console → Kiểm tra URL → Yêu cầu lập chỉ mục để nó đọc lại.
        </p>
      )}

      {canXem.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
          Cả {t.tong} địa chỉ đều đã vào chỉ mục. Không có gì cần làm ở đây.
        </p>
      ) : (
        <>
          <h3 className="text-xs font-medium text-foreground">
            {canXem.length} địa chỉ cần để ý — xếp theo mức cần sửa
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-normal">Trang</th>
                  <th className="pb-2 font-normal">Google nói</th>
                  <th className="pb-2 text-right font-normal">Crawl gần nhất</th>
                </tr>
              </thead>
              <tbody>
                {canXem.map((d) => (
                  <DongBang key={d.duongDan} d={d} />
                ))}
              </tbody>
            </table>
          </div>
          <GiaiThich dong={canXem} />
        </>
      )}

      {/* Cảnh báo canonical lệch — Google gộp trang này vào trang khác. */}
      {t.dong.some((d) => d.canonicalLech) && (
        <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <span>
            {t.dong.filter((d) => d.canonicalLech).length} trang bị Google gộp
            vào trang khác (canonical lệch): {t.dong.filter((d) => d.canonicalLech).map((d) => d.duongDan).join(", ")}.
            Thường vì nội dung quá giống nhau — trang này sẽ không bao giờ tự xếp hạng.
          </span>
        </p>
      )}
    </div>
  );
}

function DongBang({ d }: { d: DongChiMuc }) {
  return (
    <tr className="border-t border-border/60">
      <td className="max-w-[16rem] truncate py-2 text-foreground" title={d.duongDan}>
        {d.duongDan}
      </td>
      <td className="py-2">
        <Nhan mau={mauNhom(d.nhom)}>{d.lyDo}</Nhan>
      </td>
      <td className="metric py-2 text-right text-muted-foreground">
        {d.crawlGanNhat ? gioVN(d.crawlGanNhat) : "chưa"}
      </td>
    </tr>
  );
}

/**
 * Dịch câu của Google sang việc cần làm. Chỉ ba câu hay gặp nhất — không dịch
 * cả bảng mã, vì câu Google đã đủ rõ và người dùng dán nó vào ô tìm kiếm được.
 */
function GiaiThich({ dong }: { dong: DongChiMuc[] }) {
  /* ⚠️ GOOGLE TRẢ CÂU TIẾNG VIỆT VÌ TA GỬI `languageCode: "vi"`.

     Bản đầu so chuỗi tiếng Anh ("discovered", "crawled") nên khối giải thích
     không bao giờ hiện — lộ ra ngay lần chạm Google thật đầu tiên (11/09):
     15 dòng "Đã phát hiện thấy – hiện chưa được lập chỉ mục" và "Google
     không xác định được URL" mà bên dưới trống trơn. So cả hai thứ tiếng. */
  const co = (...m: string[]) =>
    dong.some((d) => m.some((x) => d.lyDo.toLowerCase().includes(x)));
  const muc: string[] = [];
  if (co("không xác định được", "unknown to google")) {
    muc.push(
      '"Google không xác định được URL": Google CHƯA TỪNG thấy địa chỉ này — dù nó nằm trong sitemap. Thường là Google chưa đọc lại sitemap từ lúc địa chỉ được thêm. Vào Search Console → Sơ đồ trang web → nộp lại sitemap.xml; và với trang quan trọng thì Kiểm tra URL → Yêu cầu lập chỉ mục cho từng trang.',
    );
  }
  if (co("đã phát hiện", "discovered")) {
    muc.push(
      '"Đã phát hiện thấy – hiện chưa được lập chỉ mục": Google biết địa chỉ này nhưng chưa ghé. Với site mới, Google crawl trang nó cho là đáng nhất trước, trang mỏng hoặc giống nhau thì chờ. Bình thường trong 2–3 tuần đầu; kéo dài hơn thì trang cần thêm nội dung riêng — và liên kết nội bộ từ trang đã vào chỉ mục.',
    );
  }
  if (co("đã thu thập", "crawled")) {
    muc.push(
      '"Đã thu thập dữ liệu – hiện chưa được lập chỉ mục": Google đã đọc và CHỌN không đưa vào. Đây là tín hiệu chất lượng: trang mỏng, trùng, hoặc quá giống trang khác. Cần thêm nội dung riêng, không phải chờ.',
    );
  }
  if (co("trùng lặp", "duplicate", "thay thế", "alternate")) {
    muc.push(
      '"Trang trùng lặp / thay thế": Google coi trang này là bản sao của trang khác và chỉ giữ một. Kiểm canonical.',
    );
  }
  if (muc.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5 text-xs leading-relaxed text-muted-foreground">
      {muc.map((m) => (
        <li key={m}>· {m}</li>
      ))}
    </ul>
  );
}

function Nhan({ mau, children }: { mau: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[11px] leading-tight"
      style={{ background: `color-mix(in oklab, ${mau} 14%, transparent)`, color: mau }}
    >
      {children}
    </span>
  );
}

function mauNhom(nhom: NhomChiMuc): string {
  switch (nhom) {
    case "da-vao":
      return "var(--success)";
    case "chua-vao":
      return "var(--warning)";
    default:
      return "var(--destructive)";
  }
}

function tieuDe(kq: KetQuaChiMuc): string {
  switch (kq.trangThai) {
    case "chua-ket-noi":
      return "Chưa kết nối Google";
    case "thieu-quyen":
      return "Kết nối thiếu quyền Search Console";
    case "khong-thay-property":
      return "Không thấy property khớp website của dự án";
    case "khong-doc-duoc-sitemap":
      return "Không đọc được sitemap của website";
    case "loi":
      return "Không soi được lúc này";
    default:
      return "";
  }
}

function moTa(kq: KetQuaChiMuc): string {
  switch (kq.trangThai) {
    case "chua-ket-noi":
    case "thieu-quyen":
      return "Khối này dùng cùng kết nối với khối Search Console ở trên — sửa ở đó là khối này chạy theo.";
    case "khong-thay-property":
      return `Website của dự án là ${kq.website}. Xem khối Search Console ở trên để biết tài khoản đang quản lý property nào.`;
    case "khong-doc-duoc-sitemap":
      return `${kq.lyDo}. Không có sitemap thì không biết soi địa chỉ nào.`;
    case "loi":
      return kq.lyDo;
    default:
      return "";
  }
}

function gioVN(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
