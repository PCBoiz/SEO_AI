import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, CircleCheck, Clock, ExternalLink, Users } from "lucide-react";
import { roleHasPermission } from "@/domain/auth/permissions";
import type { AuthenticatedIdentity } from "@/lib/auth/dal";
import { trangThaiLich } from "@/lib/lich-dang/lich-dang.server";
import { trangThaiBangKhach } from "@/lib/integrations/lead-sheet.server";
import { tomTatLich, type MucTomTat } from "@/domain/lich-dang/tom-tat";
import { GoHoLich } from "./go-ho-lich";

/**
 * Khối "HÔM NAY" — vòng lặp hằng ngày của người vận hành, gói trong một thẻ.
 *
 * Trước khối này, trang Bắt đầu chỉ có "Tạo bài" và danh sách việc — đúng cho
 * người làm tay, nhưng với lịch tự động thì ba câu hỏi mỗi sáng ("máy có viết
 * chưa? có bài chờ tôi duyệt không? có khách mới không?") không có chỗ nào
 * trả lời ngoài trang dự án, cuộn xuống dưới biểu mẫu cấu hình.
 *
 * Mỗi dự án đang hoạt động một dòng: lịch (một câu + việc cần làm + link
 * duyệt), bảng khách (lần nhận gần nhất). Dự án chưa lập gì thì một dòng
 * mời bật — không giấu, vì đây là tính năng đáng tiền nhất và người dùng
 * không thể tự biết nó tồn tại.
 */
export async function HomNay({
  identity,
  duAn,
}: {
  identity: AuthenticatedIdentity;
  duAn: readonly { id: string; ten: string }[];
}) {
  const bayGio = new Date();
  // Địa chỉ bảng khách là dữ liệu của workspace: chỉ hiện cho vai được quản lý
  // bí mật, đúng như thẻ "Khách liên hệ" trên trang dự án. Vai chỉ đọc thấy
  // dòng lịch (bài viết tới đâu) nhưng không thấy đường vào bảng khách.
  const xemBangKhach = roleHasPermission(identity.role, "workspace.secrets.manage");
  // Gõ hộ lịch cần quyền chạy luồng — vai chỉ đọc mà gõ là 403, hiện ra một
  // câu lỗi vô nghĩa với họ.
  const duocGoHo = roleHasPermission(identity.role, "pipeline.run");
  const dong = await Promise.all(
    duAn.slice(0, 5).map(async (p) => {
      const [lich, khach] = await Promise.all([
        trangThaiLich(identity, p.id).catch(() => null),
        xemBangKhach
          ? trangThaiBangKhach(identity, p.id).catch(() => ({ daLap: false as const }))
          : Promise.resolve({ daLap: false as const }),
      ]);
      return {
        ...p,
        lich: lich ? tomTatLich(lich, bayGio) : null,
        // Lưới an toàn: máy chủ nói trang có nên gõ hộ một nhịp không.
        goTuTrang: lich?.goTuTrang ?? null,
        khach: khach.daLap ? { lanNhanCuoi: khach.lanNhanCuoi, spreadsheetUrl: khach.spreadsheetUrl } : null,
      };
    }),
  );
  if (dong.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="hom-nay">
      <h2 id="hom-nay" className="text-lg font-semibold text-foreground">
        Hôm nay máy đã làm gì
      </h2>
      <ul className="mt-3 flex flex-col gap-3">
        {dong.map((d) => (
          <li key={d.id} className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">{d.ten}</p>
              <Link
                href={`/projects/${d.id}#lich-dang`}
                className="inline-flex min-h-8 items-center gap-1 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Mở lịch &amp; cài đặt <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>

            {d.lich && d.lich.muc !== "chua-lap" ? (
              <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-foreground">
                <BieuTuong muc={d.lich.muc} />
                <span>
                  {d.lich.cau}
                  {d.lich.viecCanLam ? <> <strong className="font-medium">{d.lich.viecCanLam}</strong></> : null}
                  {d.lich.duyetUrl ? (
                    <>
                      {" "}
                      <a
                        href={d.lich.duyetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium underline underline-offset-4"
                      >
                        Mở trang duyệt bài <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    </>
                  ) : null}
                </span>
              </p>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Chưa bật lịch tự viết bài. Bật một lần, mỗi ngày máy viết một bài rồi chờ bạn duyệt —{" "}
                  <Link href={`/projects/${d.id}#lich-dang`} className="underline underline-offset-4">
                    bật ở đây
                  </Link>
                  .
                </span>
              </p>
            )}

            {d.goTuTrang && duocGoHo ? <GoHoLich projectId={d.id} lyDo={d.goTuTrang} /> : null}

            {xemBangKhach ? (
            <p className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
              <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {d.khach ? (
                <span>
                  Khách để lại số trên website:{" "}
                  {d.khach.lanNhanCuoi ? `lần gần nhất ${lucVN(d.khach.lanNhanCuoi)}` : "chưa có lượt nào"} —{" "}
                  <a href={d.khach.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
                    mở bảng khách
                  </a>
                  .
                </span>
              ) : (
                <span>Chưa lập bảng khách — khách để lại số trên website sẽ không tự vào Google Sheets.</span>
              )}
            </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function BieuTuong({ muc }: { muc: MucTomTat }) {
  const lop = "mt-0.5 h-4 w-4 shrink-0";
  switch (muc) {
    case "cho-duyet":
    case "on":
      return <CircleCheck className={`${lop} text-success`} aria-hidden />;
    case "dang-chay":
      return <Clock className={`${lop} text-warning`} aria-hidden />;
    case "can-xem":
      return <CircleAlert className={`${lop} text-destructive`} aria-hidden />;
    default:
      return <CalendarClock className={`${lop} text-muted-foreground`} aria-hidden />;
  }
}

function lucVN(iso: string): string {
  return new Date(iso).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
