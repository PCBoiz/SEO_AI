"use client";

import { useEffect, useRef, useState } from "react";
import { CAU_GO_TU_TRANG, type LyDoGoTuTrang } from "@/domain/lich-dang/luoi-an-toan";

/**
 * Gõ hộ một nhịp lịch đăng NGAY TỪ TRANG BẮT ĐẦU.
 *
 * Thẻ lịch trên trang dự án đã làm việc này (vòng 27), nhưng người vận hành
 * mỗi sáng mở trang BẮT ĐẦU chứ không mở trang dự án — lưới an toàn nằm ở
 * trang không ai mở thì không phải lưới. Điều kiện gõ vẫn do máy chủ quyết
 * (`goTuTrang` trong trạng thái lịch); thành phần này chỉ gõ đúng một lần
 * mỗi lần tải trang và nói ra là nó đang làm gì.
 *
 * ⚠️ `sessionStorage` chặn gõ lặp trong 10 phút: người dùng chuyển qua lại
 * giữa Bắt đầu và trang dự án là hai thành phần cùng gõ, mỗi lần một job.
 */
const KHOA_LAN_GO = (projectId: string) => `antigravity:go-ho:${projectId}`;
const CACH_NHAU_MS = 10 * 60_000;

export function GoHoLich({ projectId, lyDo }: { projectId: string; lyDo: LyDoGoTuTrang }) {
  const [tin, setTin] = useState<string>(CAU_GO_TU_TRANG[lyDo]);
  const daGo = useRef(false);

  useEffect(() => {
    if (daGo.current) return;
    daGo.current = true;
    void (async () => {
      // Nhường một nhịp để mọi setState đều nằm SAU khi effect kết thúc —
      // luật `react-hooks/set-state-in-effect` cấm đặt trạng thái đồng bộ
      // trong effect (dễ gây vẽ lại dây chuyền).
      await Promise.resolve();
      try {
        const truoc = Number(sessionStorage.getItem(KHOA_LAN_GO(projectId)) ?? 0);
        if (Date.now() - truoc < CACH_NHAU_MS) {
          setTin(`${CAU_GO_TU_TRANG[lyDo]} (vừa gõ cách đây ít phút — không gõ lại)`);
          return;
        }
        sessionStorage.setItem(KHOA_LAN_GO(projectId), String(Date.now()));
      } catch {
        // Không có sessionStorage (trình duyệt riêng tư) thì vẫn gõ một lần.
      }
      try {
        const r = await fetch(`/api/v1/projects/${projectId}/lich-dang/chay-ngay`, { method: "POST" });
        const d = (await r.json().catch(() => ({}))) as { trangThai?: string; buoc?: number; loi?: string };
        setTin(
          r.ok
            ? `${CAU_GO_TU_TRANG[lyDo]} (${d.trangThai === "da-tao" ? `đã tạo bước ${(d.buoc ?? 0) + 1}` : (d.trangThai ?? "xong")})`
            : `Định gõ hộ một nhịp nhưng không được: ${d.loi ?? `HTTP ${r.status}`}`,
        );
      } catch {
        setTin("Định gõ hộ một nhịp nhưng không gọi được máy chủ.");
      }
    })();
  }, [projectId, lyDo]);

  return (
    <p role="status" className="mt-2 text-xs leading-relaxed text-muted-foreground">
      {tin} Dán dòng crontab (mục 15) thì việc này chạy cả khi không ai mở trang.
    </p>
  );
}
