import { MessagesSquare } from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import {
  getTroChuyenService,
  lietKeKhoaTroChuyen,
  thieuBangTroChuyen,
} from "@/lib/tro-chuyen/tro-chuyen-service.server";
import { xemCuoc, type TroChuyenXem } from "@/domain/tro-chuyen/xem";
import "@/domain/modules/registry";
import { websiteDraftModuleKeys } from "@/domain/modules/registry";
import { getModuleDefinition, toModuleDefinitionView } from "@/domain/modules/module-definition";
import { TroChuyenClient } from "./tro-chuyen-client";

export const dynamic = "force-dynamic";

export default async function TrangTroChuyen({
  searchParams,
}: {
  searchParams: Promise<{ duAn?: string }>;
}) {
  const identity = await requirePageIdentity();
  // `?duAn=<id>`: thẻ "Website dựng sẵn" dẫn về đây khi chưa ưng bản dựng —
  // cuộc mới gắn sẵn dự án đó. Đọc ở máy chủ, không dùng useSearchParams.
  const { duAn: duAnMacDinh } = await searchParams;
  const [khoa, duAn] = await Promise.all([
    lietKeKhoaTroChuyen(identity.userId),
    getProjectService().list(identity),
  ]);

  let cuoc: TroChuyenXem[];
  try {
    cuoc = (await getTroChuyenService(identity).danhSach(identity)).map(xemCuoc);
  } catch (loi) {
    if (!thieuBangTroChuyen(loi)) throw loi;
    return (
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <MessagesSquare className="h-5 w-5 text-primary" /> Trò chuyện
        </h1>
        {/*
          HƯỚNG DẪN ĐẦY ĐỦ NẰM NGAY ĐÂY, KHÔNG PHẢI "xem tệp A8".

          Đo 30/09/2026: bản cũ hiện đúng một dòng — "chủ dự án chạy
          `npm run db:neon:migrate` một lần". Làm y như thế thì HỎNG: kịch bản
          đòi `DATABASE_URL` là địa chỉ Postgres của Neon, mà `.env` trên máy
          chủ dự án trỏ vào SQLite (bản chạy thử). Chúng tôi đã đính chính
          trong VIEC-CAN-LAM từ 19/09, nhưng màn hình vẫn đưa câu cũ — tức là
          người đọc màn hình vẫn bị dẫn vào đúng cái lỗi ấy.

          Và đây là việc đang CHẶN nhiều thứ nhất: không có hai bảng này thì
          Trò chuyện, dựng website bằng lời, và cửa vào mới ở màn Bắt đầu đều
          nằm im. Nên hướng dẫn phải nằm ở nơi người ta gặp lỗi, đủ để làm
          xong mà không mở tệp nào khác.
        */}
        <div role="status" className="glass flex max-w-3xl flex-col gap-3 p-4 text-sm text-foreground">
          <p>
            <strong>Trò chuyện chưa sẵn sàng:</strong> cơ sở dữ liệu chưa có hai bảng trò chuyện. Chạy một lệnh, một
            lần — khoảng một phút.
          </p>
          <ol className="flex list-decimal flex-col gap-2 pl-5 leading-relaxed text-muted-foreground">
            <li>
              Mở vercel.com → dự án Antigravity → <strong className="text-foreground">Settings → Environment
              Variables</strong> → dòng <code className="metric">DATABASE_URL</code> → bấm Copy để lấy giá trị (dạng{" "}
              <code className="metric">postgres://…neon.tech/…</code>).{" "}
              <strong className="text-foreground">Đừng dán giá trị đó vào chat với ai.</strong>
            </li>
            <li>
              Mở <strong className="text-foreground">PowerShell</strong> trong thư mục dự án, chạy hai dòng:
              <pre className="mt-2 overflow-x-auto rounded-md border border-border bg-background/60 p-3 text-xs leading-relaxed text-foreground">
{`$env:DATABASE_URL = "dán địa chỉ Neon vào giữa hai dấu ngoặc kép"
npm run db:neon:migrate`}
              </pre>
            </li>
            <li>
              Thấy báo migration xong thì <strong className="text-foreground">đóng cửa sổ PowerShell đó</strong> — biến
              chỉ sống trong cửa sổ ấy, đóng là mất, không lưu vào đâu cả.
            </li>
          </ol>
          <p className="text-muted-foreground">
            Báo lỗi có chữ <code className="metric">DATABASE_URL</code> → chưa đặt biến ở bước 2, hoặc dán thiếu. Báo{" "}
            <code className="metric">42P07 already exists</code> → đã chạy rồi, không cần chạy lại. Xong thì tải lại
            trang này.
          </p>
        </div>
      </div>
    );
  }

  // Luồng dựng website (cùng bộ bước với màn Quy trình) — thẻ trong chat chạy
  // từng bước này bằng khoá của người dùng, không qua tuyến gửi tin.
  const luongDungWeb = websiteDraftModuleKeys.map((key) => {
    const v = toModuleDefinitionView(getModuleDefinition(key));
    return { key: v.key, title: v.title, fieldKeys: v.form.map((f) => f.key) };
  });

  return (
    <TroChuyenClient
      cuocBanDau={cuoc}
      khoa={khoa.map((k) => ({ provider: k.provider, model: k.model }))}
      duAn={duAn.filter((d) => d.status === "active").map((d) => ({ id: d.id, ten: d.name }))}
      coTheGui={identity.role !== "viewer"}
      luongDungWeb={luongDungWeb}
      duAnMacDinh={duAnMacDinh}
    />
  );
}
