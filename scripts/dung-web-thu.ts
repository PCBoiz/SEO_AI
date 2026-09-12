/**
 * Dựng thật một website từ hợp đồng, rồi BẮT NÓ TỰ CHỨNG MINH LÀ CHẠY ĐƯỢC.
 *
 * Chạy:  npx tsx scripts/dung-web-thu.ts [--xem]
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHẢI CÓ KỊCH BẢN NÀY, KHI ĐÃ CÓ TEST ĐƠN VỊ
 *
 * Test đơn vị của `dungCayTep` chỉ nói được "cây tệp có hình dạng đúng". Nó
 * KHÔNG nói được thứ duy nhất đáng giá: mã sinh ra có biên dịch không, Tailwind
 * v4 có nuốt được tệp CSS không, Next 16 có dựng được cây `app/` đó không.
 *
 * Trong nghiên cứu 09/09 đã chốt: chốt kiểm chứng (tsc + next build) là thứ
 * phân biệt bản dùng được với bản trình diễn. Kịch bản này LÀ chốt đó, chạy
 * trên đúng hợp đồng mà module #25/#26 sinh ra.
 *
 * Nó cố tình dùng NHIỀU loại khối — bảng, biểu đồ, hỏi đáp, biểu mẫu, JSON-LD
 * — vì lỗi cú pháp JSX chỉ lộ ra ở khối nào thật sự được sinh.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { dungCayTep } from "@/domain/dung-web/dung-cay-tep";
import { kienTrucSchema, type KienTrucWeb } from "@/domain/dung-web/kien-truc";
import { heThietKeSchema, type HeThietKe } from "@/domain/dung-web/he-thiet-ke";
import { taoMoiTruongMay } from "@/infrastructure/dung-web/moi-truong-may";

const MA_DU_AN = "thu-dung-web";

/** Hợp đồng mẫu — đúng khuôn module #25 trả về, có kiểm lại bằng schema. */
const KIEN_TRUC: KienTrucWeb = kienTrucSchema.parse({
  tenWebsite: "Nha khoa Bình Minh",
  nganh: "chung",
  khoiChung: ["site-header", "site-footer", "lien-he-noi"],
  trang: [
    {
      duong: "/",
      tieuDe: "Trang chủ",
      mucDich: "Người đau răng tìm thấy nơi khám gần nhà và gọi ngay trong đêm.",
      khoi: [
        { ma: "hero-anh", noiDung: "Câu lớn: khám trong ngày, có bác sĩ trực tối." },
        { ma: "thanh-quyet-dinh", noiDung: "Ba việc người xem hay cần: xem giá, đặt lịch, hỏi bảo hiểm." },
        { ma: "danh-sach-san-pham", noiDung: "Các dịch vụ chính: trám răng, nhổ răng khôn, niềng." },
        { ma: "gia-thuc-tra", noiDung: "Giá từng dịch vụ, nói rõ đã gồm gì." },
        { ma: "cau-hoi-thuong-gap", noiDung: "Câu hỏi hay gặp về đau, bảo hiểm, thời gian." },
        { ma: "dang-ky-form", noiDung: "Để lại số, phòng khám gọi lại xếp lịch." },
      ],
    },
    {
      duong: "/bang-gia",
      tieuDe: "Bảng giá",
      mucDich: "Xem giá thật trước khi tới, không phải hỏi.",
      khoi: [
        { ma: "gia-thuc-tra", noiDung: "Bảng giá đầy đủ." },
        { ma: "bang-so-sanh", noiDung: "So gói cơ bản với gói đầy đủ." },
        { ma: "khoi-chot", noiDung: "Chốt: gọi để được tư vấn đúng trường hợp." },
      ],
    },
    {
      duong: "/ve-chung-toi",
      tieuDe: "Về chúng tôi",
      mucDich: "Cho thấy ai chữa, bằng cấp gì, phòng khám mở từ bao giờ.",
      khoi: [
        { ma: "doi-ngu-tu-van", noiDung: "Bác sĩ phụ trách và trợ thủ." },
        { ma: "ho-so-minh-bach", noiDung: "Giấy phép, chứng chỉ hành nghề." },
        { ma: "cap-nhat-tien-do", noiDung: "Mốc phát triển của phòng khám." },
        { ma: "so-do-ket-noi", noiDung: "Từ các khu lân cận tới phòng khám mất bao lâu." },
        { ma: "bieu-do-tien-ich", noiDung: "Quy mô: số ghế, số phòng, giờ mở." },
        { ma: "marquee", noiDung: "Vài cụm chữ ngắn nhấn cam kết." },
      ],
    },
  ],
  canVietMoi: [],
  duLieuCan: ["số điện thoại trực đêm", "số giấy phép hoạt động"],
});

const THIET_KE: HeThietKe = heThietKeSchema.parse({
  mau: { nen: "#0b1f1a", chu: "#f4f1ea", nhan: "#2fb583", phu: "#9fb5ad" },
  font: { tieuDe: "Fraunces", than: "Be Vietnam Pro" },
  khoangCach: "thoang",
  goc: "bo-nhe",
  giong: ["điềm đạm", "rõ ràng"],
  lyDo: "Người đau răng tìm trang lúc đêm; nền tối chữ sáng đỡ chói.",
});

/** Chữ cho vài khối — đúng khuôn module #27 sẽ trả về. */
const NOI_DUNG = {
  "/#0": {
    tieuDe: "Đau răng đêm nay? Có bác sĩ trực.",
    dan: "Phòng khám mở tới 22h mỗi ngày, kể cả chủ nhật. Gọi trước 15 phút là có ghế.",
    nut: "Đặt lịch trong 30 giây",
  },
  "/#1": {
    muc: [
      { tieuDe: "Xem giá trước", than: "Bảng giá đầy đủ, không có khoản phát sinh giấu." },
      { tieuDe: "Đặt lịch tối nay", than: "Để lại số, chúng tôi gọi lại trong 10 phút." },
      { tieuDe: "Hỏi về bảo hiểm", than: "Nhận thanh toán bảo hiểm của 6 công ty." },
    ],
  },
  "/#3": {
    dan: "Giá dưới đây đã gồm thuốc tê và một lần tái khám.",
    muc: [
      { tieuDe: "Trám răng sâu", than: "350.000đ" },
      { tieuDe: "Nhổ răng khôn mọc lệch", than: "1.800.000đ" },
      { tieuDe: 'Niềng trong suốt — "gói cơ bản"', than: "38.000.000đ" },
    ],
  },
  "/#4": {
    muc: [
      { tieuDe: "Nhổ răng khôn có đau không?", than: "Có tê tại chỗ; hết thuốc tê thì ê 1–2 ngày, có thuốc giảm đau kèm." },
      { tieuDe: "Bảo hiểm chi trả bao nhiêu?", than: "Tuỳ gói; mang thẻ tới, lễ tân tra giúp trước khi làm." },
    ],
  },
  "/ve-chung-toi#4": {
    dan: "Số liệu tính tới tháng 9/2026.",
    muc: [
      { tieuDe: "Ghế khám", than: "6" },
      { tieuDe: "Phòng vô trùng riêng", than: "2" },
      { tieuDe: "Giờ mở mỗi ngày", than: "14" },
    ],
  },
};

async function main(): Promise<void> {
  const batDau = Date.now();
  const { cay, boQua, danhSachTep } = dungCayTep(
    KIEN_TRUC,
    THIET_KE,
    { dienThoai: "0900 000 000", zalo: "https://zalo.me/0900000000", diaChi: "https://nhakhoabinhminh.vn" },
    NOI_DUNG,
  );
  console.log(`Cây tệp: ${danhSachTep.length} tệp`);
  console.log(danhSachTep.map((t) => `  · ${t}`).join("\n"));
  if (boQua.length > 0) console.log(`⚠️  Khối chưa có khuôn dựng: ${boQua.join(", ")}`);

  const may = taoMoiTruongMay();
  console.log(`\n[1/2] Ghi tệp + cài phụ thuộc (lần đầu mất vài phút)…`);
  await may.chuanBi(MA_DU_AN, cay);
  console.log(`      xong sau ${Math.round((Date.now() - batDau) / 1000)}s`);

  console.log(`[2/2] tsc --noEmit rồi next build…`);
  const kq = await may.kiemChung(MA_DU_AN);
  console.log(`      ${kq.dat ? "ĐẠT" : "HỎNG"} sau ${Math.round(kq.mili / 1000)}s`);
  if (!kq.dat) {
    console.error("\n───── lỗi nguyên văn ─────\n" + (kq.loi ?? "").slice(-8000));
    process.exitCode = 1;
    return;
  }

  if (process.argv.includes("--xem")) {
    const phien = await may.moXemTruoc(MA_DU_AN);
    console.log(`\nXem trước: ${phien.url}  (Ctrl+C để dừng)`);
    await new Promise(() => {});
  }
}

void main();
