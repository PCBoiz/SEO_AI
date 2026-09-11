"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * "Xoá hẳn dự án" — cuối trang chi tiết, tách khỏi form sửa.
 *
 * ⚠️ BẮT GÕ ĐÚNG TÊN DỰ ÁN MỚI BẬT NÚT. Năm dự án của chủ dự án có ba cái tên
 * gần giống nhau; một hộp "Bạn có chắc?" không giúp phân biệt đang xoá cái nào.
 * Máy chủ kiểm lại tên lần nữa — ô này chỉ để người bấm thấy lỗi sớm.
 *
 * Nói rõ CÁI GÌ MẤT và CÁI GÌ CÒN. "Xoá dự án" nghe như xoá luôn bảng khách
 * trong Google Drive hay bài đã đăng lên website — không phải, và người dùng
 * cần biết điều đó trước khi quyết.
 */
export function XoaDuAnCard({
  projectId,
  tenDuAn,
  coBangKhach,
}: {
  projectId: string;
  tenDuAn: string;
  coBangKhach: boolean;
}) {
  const router = useRouter();
  const [mo, setMo] = useState(false);
  const [goTen, setGoTen] = useState("");
  const [dangXoa, setDangXoa] = useState(false);
  const [loi, setLoi] = useState<string>();
  const khop = goTen.trim() === tenDuAn.trim();

  async function xoa(): Promise<void> {
    if (!khop) return;
    setDangXoa(true);
    setLoi(undefined);
    try {
      const r = await fetch(`/api/v1/projects/${projectId}/xoa`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ xacNhanTen: goTen }),
      });
      if (!r.ok) {
        const d = (await r.json().catch(() => ({}))) as { error?: { message?: string } };
        throw new Error(d.error?.message ?? "Không xoá được dự án.");
      }
      router.push("/projects");
      router.refresh();
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không xoá được dự án.");
      setDangXoa(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
      <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Trash2 className="h-4 w-4 text-destructive" /> Xoá hẳn dự án
      </h2>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Khác <strong>Lưu trữ</strong> (ẩn đi, lấy lại được): xoá hẳn thì{" "}
        <strong>không lấy lại được</strong>.
      </p>

      {!mo ? (
        <div>
          <Button type="button" variant="destructive" size="sm" onClick={() => setMo(true)}>
            <Trash2 className="h-3.5 w-3.5" /> Xoá dự án này…
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 text-xs sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Sẽ mất trong Antigravity</span>
              <ul className="list-inside list-disc text-muted-foreground">
                <li>thông tin dự án, đối thủ</li>
                <li>kết nối WordPress / mạng xã hội / thư mục ảnh</li>
                <li>luồng, bài và kết quả đã tạo</li>
                <li>lịch sử chạy module</li>
              </ul>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-medium text-foreground">Vẫn còn nguyên</span>
              <ul className="list-inside list-disc text-muted-foreground">
                <li>bảng khách và ảnh trong Google Drive của bạn</li>
                <li>bài đã đăng lên website</li>
                <li>website và tên miền</li>
              </ul>
            </div>
          </div>

          {coBangKhach && (
            <p className="rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground">
              ⚠️ Dự án này đang <strong>nhận khách từ website</strong>. Xoá thì
              website không gửi vào bảng được nữa — khách mới sẽ được giữ tạm
              trên máy chủ website, nhưng không tới bảng cho tới khi bạn lập bảng
              ở một dự án khác và đổi hai dòng trong <code>.env</code>.
            </p>
          )}

          <label htmlFor={`xoa-${projectId}`} className="text-xs text-muted-foreground">
            Gõ đúng tên dự án <strong className="text-foreground">{tenDuAn}</strong> để xác nhận:
          </label>
          <input
            id={`xoa-${projectId}`}
            value={goTen}
            onChange={(e) => setGoTen(e.target.value)}
            autoComplete="off"
            className="h-8 rounded-md border border-border bg-input px-2 text-xs"
          />
          {loi && (
            <p role="alert" className="text-xs text-destructive">
              {loi}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="destructive" size="sm" onClick={xoa} disabled={!khop || dangXoa}>
              {dangXoa ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Xoá hẳn
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setMo(false);
                setGoTen("");
                setLoi(undefined);
              }}
              disabled={dangXoa}
            >
              Thôi
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
