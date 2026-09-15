import { MessagesSquare } from "lucide-react";
import { requirePageIdentity } from "@/lib/auth/dal";
import { getProjectService } from "@/lib/projects/project-service.server";
import {
  LOI_CHUA_MIGRATE,
  getTroChuyenService,
  lietKeKhoaTroChuyen,
  thieuBangTroChuyen,
} from "@/lib/tro-chuyen/tro-chuyen-service.server";
import { xemCuoc, type TroChuyenXem } from "@/domain/tro-chuyen/xem";
import { TroChuyenClient } from "./tro-chuyen-client";

export const dynamic = "force-dynamic";

export default async function TrangTroChuyen() {
  const identity = await requirePageIdentity();
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
        <p role="status" className="glass max-w-3xl p-4 text-sm text-foreground">
          {LOI_CHUA_MIGRATE}
        </p>
      </div>
    );
  }

  return (
    <TroChuyenClient
      cuocBanDau={cuoc}
      khoa={khoa.map((k) => ({ provider: k.provider, model: k.model }))}
      duAn={duAn.filter((d) => d.status === "active").map((d) => ({ id: d.id, ten: d.name }))}
      coTheGui={identity.role !== "viewer"}
    />
  );
}
