// Kiểm thử HÀNG RÀO NỘI DUNG của site đích, chạy qua đúng module #21.
//
// ═══════════════════════════════════════════════════════════════════════════
// VÌ SAO CẦN KIỂM RIÊNG PHẦN NÀY
//
// `e2e-vinhomes.ts` chứng minh hai hệ thống nối được với nhau: gửi bài sạch,
// site nhận, bài vào hàng chờ. Nhưng nó chỉ đi đúng ĐƯỜNG TỐT.
//
// Đường xấu mới là đường đáng lo. Một mô hình ngôn ngữ viết "cam kết lợi nhuận
// 12%/năm" trôi chảy y như viết "đường nội khu đã trải nhựa" — nó không biết
// câu nào là lời hứa tài chính. Hàng rào bên site là thứ duy nhất đứng giữa
// một câu như thế và mục Tin tức của một trang tự nhận là tư vấn độc lập.
//
// Hàng rào chưa được kiểm bao giờ thì không phải hàng rào, chỉ là một ý định.
//
// ⚠️ KHÔNG DÙNG MÃ VOUCHER THẬT Ở ĐÂY. Mã thật là tài sản của một khách cụ
// thể. Bài kiểm dùng chuỗi bịa khớp mẫu nhận dạng — đủ để chạm luật, không
// làm lộ gì.
//
//   1) Chạy site:  cd D:\vinhomes_ha_long_xanh
//                  DATABASE_URL= INGEST_TOKEN=e2e-thu-nghiem-987 npx next dev -p 3211
//   2) Chạy kiểm:  npm run e2e:cong-chan
// ═══════════════════════════════════════════════════════════════════════════

import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";

process.env.VINHOMES_SITE_URL ??= "http://localhost:3211";
process.env.VINHOMES_INGEST_TOKEN ??= "e2e-thu-nghiem-987";

interface Ca {
  nhan: string;
  than: string;
  /** `true` = site PHẢI từ chối; `false` = phải nhận, có thể kèm cờ. */
  phaiChan: boolean;
  /** Luật mong đợi chạm phải, để đối chiếu thông báo lỗi. */
  luat: string;
}

const CA: Ca[] = [
  {
    nhan: "Cam kết lợi nhuận",
    than: "Chủ đầu tư cam kết lợi nhuận 12%/năm trong ba năm đầu cho người mua sớm.",
    phaiChan: true,
    luat: "lời hứa tài chính",
  },
  {
    nhan: "Danh xưng “nhất”, KHÔNG dẫn nguồn",
    than: "Đây là dự án có quy mô lớn nhất Việt Nam tính tới thời điểm hiện tại.",
    phaiChan: true,
    luat: "xếp hạng không tra lại được",
  },
  {
    // Cùng một câu, chỉ thêm nguồn. Nếu ca này bị chặn thì hàng rào đang là bộ
    // lọc từ khoá thô, và nó sẽ chặn cả những bài viết đúng cách.
    nhan: "Danh xưng “nhất”, CÓ dẫn nguồn → phải cho qua",
    than: "Theo báo cáo thường niên của chủ đầu tư, đây là dự án có quy mô lớn nhất Việt Nam.",
    phaiChan: false,
    luat: "—",
  },
  {
    nhan: "Chuỗi trông như mã voucher (mã BỊA)",
    than: "Nhập mã VINHOMESKHONGCOTHAT99 khi đặt cọc để nhận ưu đãi.",
    phaiChan: true,
    luat: "mã voucher",
  },
  {
    nhan: "Liên kết kho tài liệu nội bộ",
    than: "Xem bảng hàng đầy đủ tại https://drive.google.com/drive/folders/khong-co-that",
    phaiChan: true,
    luat: "tài liệu nội bộ",
  },
  {
    nhan: "Giá cụ thể → cho qua nhưng phải GẮN CỜ",
    than: "Giá bán dòng liền kề hiện quanh mức 5,8 tỷ đồng mỗi căn theo bảng hàng tháng 9.",
    phaiChan: false,
    luat: "—",
  },
];

async function chay(ca: Ca): Promise<boolean> {
  const upstream = {
    RIS_CONTENT_HEADLINE: `## Tiêu đề\n1. Bài kiểm hàng rào — ${ca.nhan}`,
    RIS_CONTENT_INTRO: `## Mở đầu\n${ca.than}`,
    RIS_CONTENT_SECTIONS: `## Thân bài\n## Nội dung\n${ca.than}`,
  };

  let ketQua = "";
  let loi = "";
  try {
    const ra = await vinhomesPublishModule.execute({
      input: { projectId: "e2e-chan", title: "", chuyenMuc: "Thị trường", ngayDang: "" } as never,
      upstream,
      integrations: {},
      generate: (() => {
        throw new Error("Module #21 không được phép gọi AI.");
      }) as never,
    });
    ketQua = ra.result;
  } catch (e) {
    loi = e instanceof Error ? e.message : String(e);
  }

  const biChan = loi.includes("TỪ CHỐI") || loi.includes("403");
  const dat = biChan === ca.phaiChan;

  console.log(`\n${dat ? "✅" : "❌"} ${ca.nhan}`);
  console.log(`   mong đợi: ${ca.phaiChan ? "CHẶN" : "cho qua"} · thực tế: ${biChan ? "CHẶN" : "cho qua"}`);
  if (biChan) {
    const dong = loi.split("\n").filter((d) => d.trim() && !d.startsWith("Site TỪ CHỐI") && !d.startsWith("thuật"));
    console.log(`   site nói : ${dong.slice(0, 2).join(" ").slice(0, 150)}`);
  } else if (ketQua) {
    const co = ketQua.split("\n").filter((d) => /cờ|Cổng chặn|đánh dấu/i.test(d));
    console.log(`   site nói : ${(co[0] ?? ketQua.split("\n")[0]).slice(0, 150)}`);
  } else if (loi) {
    console.log(`   lỗi khác : ${loi.slice(0, 150)}`);
  }
  return dat;
}

async function main(): Promise<void> {
  console.log("KIỂM HÀNG RÀO NỘI DUNG — gửi bài xấu qua đúng module đăng bài\n" + "=".repeat(70));
  let dat = 0;
  for (const ca of CA) {
    if (await chay(ca)) dat++;
    // Site giới hạn 20 lượt/phút; giãn ra cho chắc.
    await new Promise((tiep) => setTimeout(tiep, 400));
  }
  console.log("\n" + "=".repeat(70));
  console.log(`${dat}/${CA.length} ca đúng như mong đợi`);
  if (dat !== CA.length) process.exitCode = 1;
}

void main();
