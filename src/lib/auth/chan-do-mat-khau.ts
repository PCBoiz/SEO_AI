/**
 * Chặn dò mật khẩu ở trang đăng nhập.
 *
 * ⚠️ CHỈ ĐƯỢC GỌI TỪ PHÍA MÁY CHỦ. File cố ý KHÔNG nhập `server-only` để bộ
 * kiểm thử chạy được — nhưng nếu ai đó nhập nó vào một thành phần chạy trên
 * trình duyệt, sổ đếm sẽ nằm riêng trong từng trình duyệt và việc chặn hoàn
 * toàn vô tác dụng, mà KHÔNG báo lỗi gì. Nơi gọi duy nhất hiện nay là
 * `app/login/actions.ts`, vốn đã là một server action.
 *
 * VÌ SAO CẦN: khi Antigravity mở ra internet, trang đăng nhập là thứ duy nhất
 * đứng giữa dữ liệu và cả thế giới. Không giới hạn số lần thử thì một máy dò
 * gửi được hàng nghìn mật khẩu mỗi phút, và mật khẩu người thật đặt hiếm khi
 * chịu nổi số lần thử đó.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ĐÂY LÀ LỚP THỨ HAI, KHÔNG PHẢI LỚP CHÍNH KHI CHẠY TRÊN VERCEL.
 *
 * Tài liệu Vercel: mỗi lần gọi hàm chạy trong một microVM RIÊNG, và nền tảng
 * tự mở rộng tới 30.000 lượt đồng thời. Sổ đếm trong bộ nhớ vì thế nằm riêng
 * theo từng microVM — yêu cầu của kẻ tấn công rơi vào microVM khác là đếm lại
 * từ 0. Trên Vercel, lớp này gần như vô tác dụng.
 *
 * LỚP CHÍNH phải là WAF Rate Limiting của Vercel, cấu hình trong bảng điều
 * khiển (có sẵn cả trên gói Hobby): Firewall → New Rule → Path = /login →
 * Rate Limit 10 yêu cầu / 60 giây theo IP → Deny.
 *
 * Nó chặn TRƯỚC KHI hàm được gọi, nên kẻ dò cũng không đốt được CPU vào việc
 * băm mật khẩu — mà `scrypt` thì cố tình tốn CPU.
 *
 * Lớp trong file này hoạt động ĐÚNG khi chỉ có MỘT tiến trình: chạy trên máy
 * người phát triển, hoặc nếu sau này đưa Antigravity lên máy chủ riêng.
 * Xem thêm: `NGHIEN-CUU-MAY-CHU.md` phần 2 bên dự án vinhomes_ha_long_xanh.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * BA QUYẾT ĐỊNH ĐÁNG GHI LẠI:
 *
 *  1. ĐẾM THEO ĐỊA CHỈ IP, KHÔNG THEO EMAIL. Đếm theo email thì kẻ tấn công chỉ
 *     cần gửi email của bạn liên tục là KHOÁ CHÍNH BẠN ra ngoài — biến lớp bảo
 *     vệ thành công cụ phá hoại. Đếm theo IP thì bên bị chặn là bên đang gõ.
 *
 *  2. LƯU TRONG BỘ NHỚ, KHÔNG DÙNG CƠ SỞ DỮ LIỆU. Đơn giản, không thêm phụ
 *     thuộc. Đổi lại: khởi động lại máy chủ là bộ đếm về không, và chạy nhiều
 *     tiến trình song song thì mỗi tiến trình đếm riêng.
 *     ⚠️ Nếu sau này chạy nhiều bản song song, phải chuyển sang đếm ở cơ sở dữ
 *     liệu hoặc Redis — không thì hạn mức thật bị nhân lên theo số tiến trình.
 *
 *  3. CHẶN CÓ THỜI HẠN, KHÔNG KHOÁ VĨNH VIỄN. Khoá vĩnh viễn cần người gỡ tay,
 *     mà chính bạn cũng có lúc gõ sai vài lần.
 */

/** Số lần sai liên tiếp trước khi chặn. */
const SO_LAN_CHO_PHEP = 8;
/** Chặn bao lâu sau khi vượt hạn mức. */
const THOI_GIAN_CHAN_MS = 15 * 60 * 1000;
/** Quên các lần sai cũ hơn mốc này — không cộng dồn cả ngày. */
const CUA_SO_MS = 15 * 60 * 1000;

interface BanGhi {
  soLanSai: number;
  lanSaiCuoi: number;
  chanToi: number;
}

const soSach = new Map<string, BanGhi>();

/**
 * Dọn bản ghi cũ.
 *
 * Không dọn thì mỗi địa chỉ IP từng gõ sai một lần sẽ nằm lại trong bộ nhớ mãi
 * mãi — với một trang mở ra internet, đó là một chỗ rò bộ nhớ chậm nhưng chắc.
 * Dọn ngay trong lúc kiểm, không cần hẹn giờ riêng.
 */
function don(bayGio: number): void {
  if (soSach.size < 1000) return;
  for (const [khoa, ban] of soSach) {
    if (bayGio > ban.chanToi && bayGio - ban.lanSaiCuoi > CUA_SO_MS) {
      soSach.delete(khoa);
    }
  }
}

export interface KetQuaChan {
  biChan: boolean;
  /** Số giây còn phải chờ. Chỉ có nghĩa khi `biChan` là true. */
  conLaiGiay: number;
}

export function kiemTraChan(diaChiIp: string): KetQuaChan {
  const bayGio = Date.now();
  don(bayGio);

  const ban = soSach.get(diaChiIp);
  if (!ban || bayGio >= ban.chanToi) return { biChan: false, conLaiGiay: 0 };

  return {
    biChan: true,
    conLaiGiay: Math.ceil((ban.chanToi - bayGio) / 1000),
  };
}

export function ghiNhanSai(diaChiIp: string): void {
  const bayGio = Date.now();
  const ban = soSach.get(diaChiIp);

  // Lần sai cuối đã quá cửa sổ thì đếm lại từ đầu — người gõ nhầm hôm qua
  // không đáng bị cộng dồn vào hôm nay.
  if (!ban || bayGio - ban.lanSaiCuoi > CUA_SO_MS) {
    soSach.set(diaChiIp, { soLanSai: 1, lanSaiCuoi: bayGio, chanToi: 0 });
    return;
  }

  ban.soLanSai += 1;
  ban.lanSaiCuoi = bayGio;
  if (ban.soLanSai >= SO_LAN_CHO_PHEP) {
    ban.chanToi = bayGio + THOI_GIAN_CHAN_MS;
    ban.soLanSai = 0;
  }
}

/** Đăng nhập thành công thì xoá sổ — không để lần sai cũ đè lên phiên sau. */
export function ghiNhanDung(diaChiIp: string): void {
  soSach.delete(diaChiIp);
}

/**
 * Địa chỉ IP thật của người gửi yêu cầu.
 *
 * Sau một lớp chuyển tiếp (Caddy trên máy chủ riêng, hoặc mạng phân phối của
 * Vercel), địa chỉ kết nối trực tiếp luôn là của chính lớp đó. Địa chỉ thật nằm
 * ở header do lớp đó đặt.
 *
 * `x-forwarded-for` có thể là một danh sách "khách, proxy1, proxy2" — phần tử
 * ĐẦU TIÊN là khách. Lưu ý: header này do client gửi lên nên về nguyên tắc giả
 * được; ở đây chấp nhận vì Caddy và Vercel đều GHI ĐÈ nó bằng địa chỉ thật.
 * Nếu sau này đặt sau một lớp chuyển tiếp không ghi đè, phải xem lại chỗ này.
 */
export function layDiaChiIp(headers: Headers): string {
  const chuoi = headers.get("x-forwarded-for");
  if (chuoi) {
    const dau = chuoi.split(",")[0]?.trim();
    if (dau) return dau;
  }
  return headers.get("x-real-ip")?.trim() || "khong-ro";
}
