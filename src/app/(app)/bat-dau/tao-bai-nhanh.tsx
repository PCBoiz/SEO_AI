"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  CircleCheck,
  CircleAlert,
  Loader2,
  PenLine,
  RotateCcw,
} from "lucide-react";

/**
 * TẠO BÀI NHANH — một ô nhập, hệ thống chạy cả chuỗi.
 *
 * VẤN ĐỀ NÀY GIẢI QUYẾT: ở bản đầy đủ, muốn có một bài viết hoàn chỉnh phải mở
 * bốn màn hình khác nhau theo đúng thứ tự, mỗi màn điền 8 ô, rồi tự chép kết
 * quả màn trước sang màn sau. Không có chỗ nào trên giao diện nói ra trình tự
 * đó — nó chỉ tồn tại trong đầu người viết code. Đo được ở audit: 56 lựa chọn
 * trên trang danh sách việc, 8 ô nhập mỗi màn chạy.
 *
 * Ở đây: 2 ô, một nút.
 *
 * CÁCH CHẠY: gọi lần lượt từng bước qua đúng đường API mà bản đầy đủ dùng
 * (`POST /api/v1/modules/<mã>/jobs` rồi hỏi lại trạng thái). KHÔNG tự viết một
 * đường chạy riêng — làm vậy là có hai chỗ cùng chạy module, và chúng sẽ lệch
 * nhau ngay lần sửa đầu tiên.
 */

const CHO_MOI_LAN_HOI_MS = 2500;
/** Chờ tối đa cho MỘT bước. Bốn bước nên tổng có thể tới 8 phút. */
const CHO_TOI_DA_MS = 120_000;

interface Buoc {
  ma: string;
  ten: string;
}

/**
 * Bốn bước để ra một bài hoàn chỉnh, đúng thứ tự phụ thuộc.
 *
 * Trùng với `CHUOI_VIET_BAI` bên `ngon-ngu-nguoi-dung.ts` nhưng khai lại ở đây
 * kèm tên hiển thị, vì đây là thành phần chạy trên trình duyệt và không nên kéo
 * theo cả tầng định nghĩa module vào gói tải về.
 */
const CAC_BUOC: Buoc[] = [
  { ma: "RIS_CONTENT_HEADLINE", ten: "Đặt tiêu đề" },
  { ma: "RIS_CONTENT_INTRO", ten: "Viết đoạn mở đầu" },
  { ma: "RIS_CONTENT_SECTIONS", ten: "Viết thân bài" },
  { ma: "RIS_GEO_SCHEMA", ten: "Giúp AI hiểu bài" },
];

type TrangThaiBuoc = "cho" | "dang-chay" | "xong" | "loi";

interface TienTrinh {
  ma: string;
  trangThai: TrangThaiBuoc;
  loi?: string;
}

export function TaoBaiNhanh({
  duAn,
}: {
  duAn: { id: string; ten: string }[];
}) {
  const [duAnId, setDuAnId] = useState(duAn[0]?.id ?? "");
  const [chuDe, setChuDe] = useState("");
  const [dangChay, setDangChay] = useState(false);
  const [tienTrinh, setTienTrinh] = useState<TienTrinh[]>([]);
  const [xong, setXong] = useState(false);
  const huyRef = useRef(false);

  const loi = tienTrinh.find((t) => t.trangThai === "loi");

  async function chayMotBuoc(buoc: Buoc, boSung: Record<string, unknown>) {
    const tao = await fetch(`/api/v1/modules/${buoc.ma}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { projectId: duAnId, primaryKeyword: chuDe, ...boSung },
      }),
    });
    if (!tao.ok) {
      const than = (await tao.json().catch(() => ({}))) as {
        error?: { message?: string; details?: { issues?: { message?: string }[] } };
      };
      throw new Error(
        than.error?.details?.issues?.[0]?.message ??
          than.error?.message ??
          "Không gửi được yêu cầu.",
      );
    }
    let viec = ((await tao.json()) as { job: { id: string; status: string } }).job;

    const hetHan = Date.now() + CHO_TOI_DA_MS;
    while (["queued", "dispatching", "running"].includes(viec.status)) {
      if (huyRef.current) throw new Error("Đã dừng theo yêu cầu.");
      if (Date.now() > hetHan) {
        throw new Error("Bước này chạy quá lâu. Thử lại giúp tôi.");
      }
      await new Promise((r) => setTimeout(r, CHO_MOI_LAN_HOI_MS));
      const hoi = await fetch(`/api/v1/modules/${buoc.ma}/jobs/${viec.id}`, {
        cache: "no-store",
      });
      if (!hoi.ok) throw new Error("Mất kết nối khi đang chạy.");
      viec = ((await hoi.json()) as { job: { id: string; status: string } }).job;
    }

    if (viec.status !== "succeeded") {
      throw new Error(
        "Bước này không hoàn thành. Thường do hết lượt dùng AI hoặc mạng chập chờn.",
      );
    }
  }

  async function batDau() {
    if (!duAnId || chuDe.trim().length < 3) return;
    huyRef.current = false;
    setDangChay(true);
    setXong(false);
    setTienTrinh(CAC_BUOC.map((b) => ({ ma: b.ma, trangThai: "cho" })));

    for (const buoc of CAC_BUOC) {
      setTienTrinh((truoc) =>
        truoc.map((t) =>
          t.ma === buoc.ma ? { ...t, trangThai: "dang-chay" } : t,
        ),
      );
      try {
        // Các bước sau tự lấy kết quả bước trước từ máy chủ (cơ chế nối luồng
        // sẵn có), nên ở đây không phải chép tay gì cả.
        await chayMotBuoc(buoc, {});
        setTienTrinh((truoc) =>
          truoc.map((t) => (t.ma === buoc.ma ? { ...t, trangThai: "xong" } : t)),
        );
      } catch (bat) {
        setTienTrinh((truoc) =>
          truoc.map((t) =>
            t.ma === buoc.ma
              ? {
                  ...t,
                  trangThai: "loi",
                  loi: bat instanceof Error ? bat.message : "Có lỗi xảy ra.",
                }
              : t,
          ),
        );
        setDangChay(false);
        return;
      }
    }

    setDangChay(false);
    setXong(true);
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <PenLine className="h-5 w-5 text-primary" aria-hidden />
        Viết một bài mới
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Nhập chủ đề, hệ thống lo phần còn lại. Mất khoảng 2–4 phút.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <div>
          <label
            htmlFor="chu-de-bai"
            className="block text-sm font-medium text-foreground"
          >
            Bài này viết về gì?
          </label>
          <input
            id="chu-de-bai"
            value={chuDe}
            onChange={(e) => setChuDe(e.target.value)}
            disabled={dangChay}
            placeholder="Ví dụ: tiến độ thi công phân khu Vịnh Thiên Đường"
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:opacity-60"
          />
        </div>

        <div>
          <label
            htmlFor="du-an-bai"
            className="block text-sm font-medium text-foreground"
          >
            Đăng cho website nào?
          </label>
          <select
            id="du-an-bai"
            value={duAnId}
            onChange={(e) => setDuAnId(e.target.value)}
            disabled={dangChay}
            className="mt-1.5 h-11 w-full rounded-lg border border-border bg-input px-3 text-sm text-foreground disabled:opacity-60"
          >
            {duAn.map((d) => (
              <option key={d.id} value={d.id}>
                {d.ten}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void batDau()}
          disabled={dangChay || chuDe.trim().length < 3}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {dangChay ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Đang viết…
            </>
          ) : (
            "Bắt đầu viết"
          )}
        </button>

        {/* Nút bị khoá phải NÓI VÌ SAO. Đo được ở audit: bản cũ có nút khoá mà
            không có lời giải thích nào cạnh đó — người dùng bấm không được và
            không biết phải làm gì. */}
        {!dangChay && chuDe.trim().length < 3 ? (
          <span className="text-sm text-muted-foreground">
            Nhập chủ đề trước rồi nút sẽ bật.
          </span>
        ) : null}

        {dangChay ? (
          <button
            type="button"
            onClick={() => {
              huyRef.current = true;
            }}
            className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Dừng lại
          </button>
        ) : null}
      </div>

      {/* ------------------------------ tiến trình --------------------------
          Hiện TỪNG BƯỚC bằng tiếng Việt, không hiện thanh tiến trình mơ hồ.
          Chạy 2–4 phút mà chỉ có một vòng xoay thì người dùng không biết là
          đang chạy hay đã treo. */}
      {tienTrinh.length > 0 ? (
        <ol className="mt-6 space-y-2 border-t border-border pt-5">
          {CAC_BUOC.map((b) => {
            const t = tienTrinh.find((x) => x.ma === b.ma);
            return (
              <li key={b.ma} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0">
                  {t?.trangThai === "xong" ? (
                    <CircleCheck className="h-4 w-4 text-success" aria-hidden />
                  ) : t?.trangThai === "dang-chay" ? (
                    <Loader2
                      className="h-4 w-4 animate-spin text-primary"
                      aria-hidden
                    />
                  ) : t?.trangThai === "loi" ? (
                    <CircleAlert
                      className="h-4 w-4 text-destructive"
                      aria-hidden
                    />
                  ) : (
                    <span className="block h-4 w-4 rounded-full border border-border" />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={
                      t?.trangThai === "cho"
                        ? "text-muted-foreground"
                        : "text-foreground"
                    }
                  >
                    {b.ten}
                  </span>
                  {t?.loi ? (
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {t.loi}
                    </span>
                  ) : null}
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {loi ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void batDau()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-5 text-sm text-foreground transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Thử lại từ đầu
          </button>
        </div>
      ) : null}

      {/* Xong thì DẪN THẲNG tới bản xem trước, không chỉ báo "thành công". */}
      {xong ? (
        <div className="mt-6 rounded-lg border border-success/30 bg-success/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CircleCheck className="h-4 w-4 text-success" aria-hidden />
            Bài đã viết xong
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Xem lại nội dung trước khi đăng — bài do AI viết nên số liệu cần
            người kiểm.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/outputs"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              Xem bài vừa viết
            </Link>
            <Link
              href="/automations/run/RIS_VHGG_PUBLISH"
              className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Đăng lên website
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
