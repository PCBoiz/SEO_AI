/**
 * Môi trường dựng — nơi mã do tác tử sinh ra được CHẠY THẬT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHẢI CÓ MỘT LỚP TRỪU TƯỢNG Ở ĐÂY
 *
 * Antigravity chạy ở hai nơi, và hai nơi đó có khả năng khác nhau đến mức
 * không thể viết chung một đoạn mã:
 *
 *   · TRÊN MÁY — tiến trình Node đầy quyền. Ghi tệp ở đâu cũng được, đẻ tiến
 *     trình con được, mở cổng được. Chạy `next dev` thật, có localhost thật,
 *     sửa là thấy ngay nhờ HMR, và không tốn đồng nào.
 *
 *   · TRÊN VERCEL — KHÔNG dựng được Next.js bên trong hàm. Đã xác minh ngày
 *     09/09/2026: hệ thống tệp chỉ đọc trừ `/tmp` 500 MB, và hàm tối đa 60 giây
 *     trên gói Hobby. Một lần `npm install` cho dự án Next.js đã ngốn phần lớn
 *     500 MB và thường lâu hơn 60 giây. Cộng `next build` nữa thì không có cửa.
 *     Đây không phải chuyện tối ưu được — phải mượn sandbox bên ngoài.
 *
 * Nếu để hai chuyện đó lẫn vào nhau bằng những câu `if (process.env.VERCEL)`
 * rải khắp mã, thì mỗi lần sửa một nhánh là một lần có nguy cơ làm hỏng nhánh
 * kia mà không ai chạy thử được cả hai.
 *
 * ⚠️ XEM TRƯỚC VÀ KIỂM CHỨNG DÙNG CHUNG MỘT HẠ TẦNG. Đó là lý do cả hai nằm
 * trong cùng một giao diện. Chúng cần đúng những thứ giống nhau — một thư mục
 * có `node_modules`, khả năng chạy lệnh, khả năng đọc kết quả. Tách ra là dựng
 * hai đường ống cho cùng một việc.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Một tệp trong cây mã do tác tử sinh ra. */
export interface TepSinh {
  /** Đường dẫn tương đối, dùng dấu `/` kể cả trên Windows. */
  duongDan: string;
  /**
   * Nội dung. `Buffer` cho tệp nhị phân — ảnh trong `public/`.
   *
   * ⚠️ Ghi `Buffer` bằng mã hoá "utf8" là HỎNG ẢNH mà không báo lỗi: byte nào
   * không hợp lệ trong UTF-8 bị thay bằng ký tự thay thế, tệp vẫn được tạo,
   * vẫn đúng tên, chỉ là trình duyệt không mở được. Bên ghi phải kiểm
   * `Buffer.isBuffer` trước.
   */
  noiDung: string | Buffer;
}

export interface CayTep {
  tep: TepSinh[];
  /**
   * Hợp đồng mà các tệp khác được phép dựa vào: tên hàm, kiểu, props.
   *
   * Đây là mấu chốt để KHÔNG phải nhét cả kho mã vào lời nhắc. Tác tử sinh
   * `components/Nav.tsx` chỉ cần biết `lib/duong-dan.ts` xuất ra cái gì, không
   * cần đọc nội dung tệp đó.
   */
  hopDong?: Record<string, string>;
}

export interface KetQuaKiemChung {
  dat: boolean;
  /**
   * Lỗi NGUYÊN VĂN từ trình biên dịch, không tóm tắt lại.
   *
   * Tóm tắt lỗi build trước khi đưa cho mô hình là bỏ đi đúng phần nó cần:
   * tên tệp, số dòng, tên ký hiệu. Một câu "có lỗi kiểu dữ liệu" thì mô hình
   * chỉ đoán được; còn nguyên văn thì nó sửa được.
   */
  loi?: string;
  /** Thời gian chạy, để biết bước nào đang chậm. */
  mili: number;
}

export interface PhienXemTruoc {
  /** Địa chỉ mở được trong iframe hoặc tab mới. */
  url: string;
  /** Dừng máy chủ và thu hồi cổng. PHẢI gọi, xem ghi chú trong bản hiện thực. */
  dong: () => Promise<void>;
}

export interface MoiTruongDung {
  /** Tên để ghi log và hiển thị — "máy" hoặc "sandbox". */
  readonly ten: string;

  /**
   * Ghi cây tệp vào không gian làm việc của dự án và bảo đảm phụ thuộc đã cài.
   * Gọi lại nhiều lần với cùng `maDuAn` thì tái dùng `node_modules` đã có.
   */
  chuanBi(maDuAn: string, cay: CayTep): Promise<void>;

  /** Chạy `tsc --noEmit` rồi `next build`. Dừng ngay ở lỗi đầu tiên. */
  kiemChung(maDuAn: string): Promise<KetQuaKiemChung>;

  /** Bật máy chủ dev và trả địa chỉ xem được. */
  moXemTruoc(maDuAn: string): Promise<PhienXemTruoc>;

  /**
   * Địa chỉ xem trước ĐANG chạy, nếu có — không bật cái mới.
   *
   * Cần tách khỏi `moXemTruoc` vì hai câu hỏi khác nhau: "cho tôi xem" (bật
   * nếu chưa có) và "có đang chạy không" (chỉ hỏi). Gộp lại thì nút Tắt vô
   * tình BẬT một máy chủ mới rồi mới tắt — đúng lỗi suýt để lọt.
   */
  dangXemTruoc(maDuAn: string): string | null;

  /** Tắt máy chủ xem trước nếu đang chạy. Trả `true` nếu vừa tắt một cái. */
  dongXemTruoc(maDuAn: string): Promise<boolean>;

  /** Dọn sạch không gian làm việc của một dự án. */
  don(maDuAn: string): Promise<void>;
}
