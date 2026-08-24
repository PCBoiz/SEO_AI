// Kiểm thử đầu-cuối THẬT giữa Antigravity và site Vinhomes Global Gate Hạ Long.
//
// Gọi thẳng module #21, để nó POST sang cổng /api/ingest của site đang chạy.
// KHÔNG giả lập fetch: nếu hai bên lệch hợp đồng dữ liệu — đổi tên trường, đổi
// danh sách chuyên mục, siết lại định dạng slug — thì phải lộ ra ở đây chứ
// không phải lúc bài đã đăng hỏng trên môi trường thật.
//
//   1) Chạy site:  cd D:\vinhomes_ha_long_xanh
//                  INGEST_TOKEN=... npx next start -p 3211
//   2) Chạy kiểm:  npm run e2e:vinhomes
//
// Đổi đích bằng VINHOMES_SITE_URL / VINHOMES_INGEST_TOKEN.

import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";

process.env.VINHOMES_SITE_URL ??= "http://localhost:3211";
process.env.VINHOMES_INGEST_TOKEN ??= "e2e-thu-nghiem-987";

const upstream = {
  RIS_CONTENT_HEADLINE:
    "## Tiêu đề\n1. Tiến độ thi công phân khu Vịnh Thiên Đường tháng 8/2026",
  RIS_CONTENT_INTRO:
    "## Mở đầu\nHạ tầng phân khu Vịnh Thiên Đường đã hoàn thiện phần san nền và đang triển khai hệ thống đường nội khu.",
  RIS_CONTENT_SECTIONS:
    "## Thân bài\n## Hạ tầng giao thông\nTuyến đường trục chính đã trải nhựa lớp đầu tiên.\n\n- Đường nội khu: 60%\n- Cấp thoát nước: 45%",
  RIS_GEO_SCHEMA:
    "## FAQ khớp câu hỏi\n**Khi nào bàn giao?**\nDự kiến theo tiến độ trong hợp đồng mua bán.",
};

async function day(nhan: string, ngayDang: string): Promise<void> {
  const ketQua = await vinhomesPublishModule.execute({
    input: {
      projectId: "e2e",
      title: "",
      chuyenMuc: "Tiến độ",
      ngayDang,
    } as never,
    upstream,
    integrations: {},
    generate: (() => {
      throw new Error("Module #21 không được phép gọi AI.");
    }) as never,
  });
  console.log(`\n── ${nhan} ──`);
  console.log(ketQua.result);
}

async function main(): Promise<void> {
  const mai = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  await day("Đăng ngay", "");
  await day("Hẹn ngày mai", mai);

  // Ngày sai phải bị chặn ở phía Antigravity, trước khi tốn một lượt gọi mạng.
  try {
    await day("Ngày sai (phải bị chặn)", "khong-phai-ngay");
    console.error("\n✗ Ngày sai lẽ ra phải bị từ chối");
    process.exitCode = 1;
    return;
  } catch (loi) {
    console.log(`\n── Ngày sai bị chặn đúng như mong đợi ──`);
    console.log(`   ${loi instanceof Error ? loi.message : String(loi)}`);
  }

  console.log("\n✓ Hợp đồng dữ liệu giữa hai hệ thống khớp nhau");
}

main().catch((loi) => {
  console.error("\n✗ THẤT BẠI:", loi instanceof Error ? loi.message : loi);
  process.exitCode = 1;
});
