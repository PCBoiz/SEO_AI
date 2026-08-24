// Kiểm chặng Antigravity → site Vinhomes bằng ĐƯỜNG THẬT.
//
// Gọi thẳng module #21 để nó tự POST sang `/api/ingest` của site đang chạy.
// KHÔNG giả lập `fetch`: mục đích của bài kiểm này là bắt chỗ hai bên LỆCH HỢP
// ĐỒNG DỮ LIỆU — đổi tên trường, siết giới hạn độ dài, đổi danh sách chuyên
// mục. Giả lập fetch thì đúng những lệch đó lại không lộ ra.
//
// Cách chạy:
//   1) Site:  cd D:\vinhomes_ha_long_xanh
//             INGEST_TOKEN=thu-nghiem-cuc-bo-9f3a PORT=3211 node .next/standalone/server.js
//   2) Kiểm:  npx tsx scripts/kiem-duong-dang-bai.ts

import { vinhomesPublishModule } from "@/domain/modules/definitions/vinhomes-publish";

const DICH = process.env.VINHOMES_SITE_URL ?? "http://localhost:3211";
const TOKEN = process.env.VINHOMES_INGEST_TOKEN ?? "thu-nghiem-cuc-bo-9f3a";

const NOI_DUNG_MAU = {
  RIS_CONTENT_HEADLINE:
    "## Tiêu đề\n1. Tiến độ thi công phân khu Vịnh Thiên Đường tháng 8/2026",
  RIS_CONTENT_INTRO:
    "## Mở đầu\nHạ tầng phân khu Vịnh Thiên Đường đã hoàn thiện phần san nền.",
  RIS_CONTENT_SECTIONS:
    "## Thân bài\n## Hạ tầng giao thông\nTuyến trục chính đã trải nhựa lớp đầu.\n\n- Đường nội khu: 60%\n- Cấp thoát nước: 45%",
  RIS_GEO_SCHEMA:
    "## FAQ khớp câu hỏi\n**Khi nào bàn giao?**\nTheo tiến độ trong hợp đồng mua bán.",
};

interface KetQua {
  ten: string;
  dat: boolean;
  chiTiet: string;
}

type KetQuaChay =
  | { ok: true; out: { result: string; postUrl: string } }
  | { ok: false; loi: string };

/** Lấy chuỗi lỗi mà không cần thu hẹp kiểu ở từng chỗ gọi. */
function moTaLoi(kq: KetQuaChay): string {
  return kq.ok ? "(không có lỗi — đây mới là điều bất thường)" : kq.loi;
}

const ketQua: KetQua[] = [];

function ghi(ten: string, dat: boolean, chiTiet: string): void {
  ketQua.push({ ten, dat, chiTiet });
  process.stdout.write(
    `${dat ? "✓" : "✗"} ${ten}\n    ${chiTiet.replace(/\n/g, "\n    ")}\n`,
  );
}

async function chay(
  input: Record<string, unknown>,
  upstream: Record<string, string> = NOI_DUNG_MAU,
): Promise<KetQuaChay> {
  try {
    const out = await vinhomesPublishModule.execute({
      input: { projectId: "kiem-thu", title: "", chuyenMuc: "Tiến độ", ngayDang: "", ...input } as never,
      upstream,
      integrations: {},
      generate: (() => {
        throw new Error("Module 21 KHÔNG được gọi model AI.");
      }) as never,
    } as never);
    return { ok: true, out };
  } catch (loi) {
    return { ok: false, loi: loi instanceof Error ? loi.message : String(loi) };
  }
}

async function main(): Promise<void> {
  process.env.VINHOMES_SITE_URL = DICH;
  process.env.VINHOMES_INGEST_TOKEN = TOKEN;

  // ───────────────────────── 1. Đường sáng ─────────────────────────────────
  const bt = await chay({ title: "" });
  ghi(
    "Đăng một bài bình thường",
    bt.ok,
    bt.ok ? bt.out.result.split("\n")[0] + " · " + bt.out.postUrl : bt.loi,
  );

  // ─────────────── 2. Đăng lại cùng slug = SỬA, không nhân đôi ──────────────
  const lai = await chay({ title: "" });
  ghi(
    "Đăng lại cùng nội dung (phải là sửa, không tạo bài trùng)",
    lai.ok,
    lai.ok ? lai.out.postUrl : moTaLoi(lai),
  );

  if (bt.ok && lai.ok) {
    ghi(
      "Hai lần đăng trỏ về cùng một đường dẫn",
      bt.out.postUrl === lai.out.postUrl,
      `${bt.out.postUrl}\n${lai.out.postUrl}`,
    );
  }

  // ───────────────────────── 3. Hẹn ngày ───────────────────────────────────
  //
  // ⚠️ MỤC NÀY TỪNG KIỂM LỜI NÓI CHỨ KHÔNG KIỂM HÀNH VI, và vì thế bỏ lọt một
  // lỗi lớn suốt nhiều đợt.
  //
  // Bản cũ chỉ khẳng định `hen.out.result.includes("hẹn")` — tức là chỉ kiểm
  // module có NÓI ra chữ "hẹn" hay không. Nó luôn đạt, kể cả khi site không hề
  // có bộ lọc theo ngày và bài hẹn năm 2099 lên trang ngay lập tức, nằm đầu
  // danh sách vì sắp xếp theo ngày giảm dần.
  //
  // Một mục kiểm chỉ đọc lại lời của chính thứ nó đang kiểm thì không kiểm gì
  // cả. Bản này đi hỏi SITE.
  const hen = await chay({
    title: "Bài hẹn năm 2099 để kiểm tra lịch đăng",
    ngayDang: "2099-01-01",
  });
  ghi(
    "Hẹn ngày trong tương lai — module nhận và báo đúng",
    hen.ok && hen.out.result.includes("hẹn"),
    hen.ok ? hen.out.result.split("\n")[0] : hen.loi,
  );

  if (hen.ok) {
    const trangHen = await fetch(hen.out.postUrl).catch(() => null);
    ghi(
      "Bài hẹn ngày tương lai KHÔNG mở được bằng địa chỉ",
      trangHen?.status === 404,
      trangHen ? `HTTP ${trangHen.status} — ${hen.out.postUrl}` : "không kết nối được",
    );

    const dsHen = await fetch(`${DICH}/tin-tuc`).catch(() => null);
    const htmlHen = dsHen?.ok ? await dsHen.text() : "";
    ghi(
      "Bài hẹn ngày tương lai KHÔNG hiện ở trang tin",
      dsHen?.ok === true && !htmlHen.includes("2099"),
      `tìm chuỗi "2099" trong trang tin: ${htmlHen.includes("2099")}`,
    );
  }

  // ───────────────────── 4. Tiêu đề không có chữ latin ─────────────────────
  // `toSlug` bỏ hết ký tự không phải a-z0-9 → chuỗi rỗng → site phải TỪ CHỐI,
  // và thông báo phải nói được là sai ở đâu.
  const khongSlug = await chay({ title: "・・・ ※※※ 〜〜〜" });
  ghi(
    "Tiêu đề không tạo được slug",
    !khongSlug.ok,
    khongSlug.ok
      ? "LỌT — site nhận một bài có slug rỗng"
      : moTaLoi(khongSlug).slice(0, 200),
  );

  // ───────────────────── 5. Không có nội dung nào ──────────────────────────
  const rong = await chay({ title: "Bài không có nội dung" }, {});
  ghi(
    "Chưa chạy module nội dung nào",
    !rong.ok && moTaLoi(rong).includes("module"),
    moTaLoi(rong).slice(0, 160),
  );

  // ───────────────────── 6. Ngày sai định dạng ─────────────────────────────
  const ngaySai = await chay({ title: "Bài có ngày sai định dạng", ngayDang: "15-08-2026" });
  ghi(
    "Ngày sai định dạng bị chặn",
    !ngaySai.ok,
    ngaySai.ok ? "LỌT — nhận cả ngày sai" : moTaLoi(ngaySai).slice(0, 160),
  );

  // ───────────────────── 7. Token sai ──────────────────────────────────────
  process.env.VINHOMES_INGEST_TOKEN = "token-sai-hoan-toan";
  const tokenSai = await chay({ title: "Bài gửi bằng token sai" });
  ghi(
    "Token sai bị từ chối, và báo lỗi nói được phải sửa ở đâu",
    !tokenSai.ok &&
      moTaLoi(tokenSai).includes("401") &&
      moTaLoi(tokenSai).includes("VINHOMES_INGEST_TOKEN"),
    moTaLoi(tokenSai).slice(0, 200),
  );

  // Bí mật KHÔNG được lọt vào thông báo lỗi — người vận hành hay dán nguyên
  // thông báo này vào chat để hỏi.
  ghi(
    "Thông báo lỗi 401 không chứa giá trị token",
    !tokenSai.ok && !moTaLoi(tokenSai).includes("token-sai-hoan-toan"),
    tokenSai.ok ? "-" : "đã kiểm chuỗi lỗi, không thấy giá trị token",
  );
  process.env.VINHOMES_INGEST_TOKEN = TOKEN;

  // ───────────────────── 8. Site tắt / sai địa chỉ ─────────────────────────
  process.env.VINHOMES_SITE_URL = "http://localhost:59999";
  const tat = await chay({ title: "Bài gửi khi site đang tắt" });
  ghi(
    "Site tắt thì báo lỗi, KHÔNG báo thành công",
    !tat.ok,
    tat.ok ? "LỌT — báo thành công dù không gửi được" : moTaLoi(tat).slice(0, 160),
  );
  process.env.VINHOMES_SITE_URL = DICH;

  // ───────────────────── 9. Chưa cấu hình gì cả ────────────────────────────
  delete process.env.VINHOMES_SITE_URL;
  delete process.env.VINHOMES_INGEST_TOKEN;
  const chuaCauHinh = await chay({ title: "Bài gửi khi chưa cấu hình đích" });
  ghi(
    "Chưa cấu hình đích thì dừng ngay, không gửi mù",
    !chuaCauHinh.ok,
    moTaLoi(chuaCauHinh).slice(0, 160),
  );
  process.env.VINHOMES_SITE_URL = DICH;
  process.env.VINHOMES_INGEST_TOKEN = TOKEN;

  // ────────── 10. HÀNG RÀO DUYỆT BÀI: bài mới KHÔNG được lên trang ─────────
  //
  // ⚠️ MỤC NÀY ĐÃ ĐẢO NGƯỢC KỲ VỌNG, và đó là chủ ý.
  //
  // Trước đây mục này kiểm "mở được trang bài vừa đăng". Site giờ có hàng rào
  // duyệt: bài gửi sang vào hàng chờ, chỉ hiện sau khi chủ trang đọc và bấm
  // duyệt. Nên kỳ vọng đúng bây giờ là NGƯỢC LẠI — mở ra phải 404.
  //
  // Giữ nguyên phép kiểm cũ thì bộ kiểm sẽ báo trượt ở đúng chỗ hệ thống đang
  // làm đúng, và sức ép sửa cho "xanh" sẽ đẩy người ta đi gỡ hàng rào. Một bộ
  // kiểm sai còn nguy hiểm hơn không có bộ kiểm.
  if (bt.ok) {
    const trang = await fetch(bt.out.postUrl).catch(() => null);
    ghi(
      "Bài mới CHƯA lên trang — đang chờ duyệt",
      trang?.status === 404,
      trang
        ? `HTTP ${trang.status} — ${bt.out.postUrl}`
        : "không kết nối được",
    );

    ghi(
      "Kết quả trả về nói rõ là đang chờ duyệt",
      bt.out.result.includes("CHỜ DUYỆT"),
      bt.out.result.split("\n")[0] ?? "",
    );

    // ⚠️ MỤC NÀY ĐÃ ĐẢO KỲ VỌNG LẦN THỨ HAI, và lần này vì lý do an toàn.
    //
    // Bản trước kiểm "bài có nằm trong hàng chờ ở /duyet-bai không" bằng cách
    // tải trang đó rồi tìm tiêu đề. Nó đạt — nhưng chính việc nó đạt LÀ lỗ
    // hổng: trang duyệt bài khi ấy dựng toàn văn mọi bài chưa duyệt ra HTML
    // cho bất kỳ ai mở địa chỉ, không cần khoá nào.
    //
    // Site đã vá: hàng chờ chỉ về sau khi máy chủ nhận đúng `INGEST_TOKEN`.
    // Nên kỳ vọng đúng bây giờ là NGƯỢC LẠI — tải trang không kèm khoá thì
    // KHÔNG được thấy chữ nào của bài.
    const hangCho = await fetch(`${DICH}/duyet-bai`).catch(() => null);
    const htmlCho = hangCho?.ok ? await hangCho.text() : "";
    ghi(
      "Người lạ mở /duyet-bai KHÔNG đọc được bài chưa duyệt",
      hangCho?.ok === true && !htmlCho.includes("Vịnh Thiên Đường"),
      hangCho?.ok
        ? `trang mở được, lộ tiêu đề: ${htmlCho.includes("Vịnh Thiên Đường")}`
        : `không mở được ${DICH}/duyet-bai`,
    );
  }

  // ──────── 11. CỔNG CHẶN NỘI DUNG: chặn cái phải chặn, cắm cờ cái phải kiểm ────────
  //
  // Hàng rào duyệt bài ở mục 10 là hàng rào của CON NGƯỜI, và nó mòn — bài thứ
  // ba mươi trông giống hệt hai mươi chín bài trước. Mục này kiểm hàng rào tự
  // động đứng trước nó.
  //
  // Hai nhóm luật, hai kỳ vọng NGƯỢC NHAU, và đó là điểm chính của cả mục:
  //
  //   CHẶN → bài KHÔNG được vào hàng chờ. Module phải ném lỗi, và lỗi phải nói
  //          được là "sai nội dung", không phải "sai kỹ thuật" — nói nhầm là
  //          người dùng đi kiểm token với đường truyền trong khi việc phải làm
  //          là sửa một câu.
  //
  //   CỜ   → bài VẪN vào hàng chờ. Chặn ở đây là chặn nhầm: máy không biết
  //          "5,2 tỷ" đúng hay bịa, chỉ người mở bảng hàng ra mới biết. Việc
  //          của máy là chỉ đúng câu đó cho người xem.

  // ⚠️ MÃ Ở ĐÂY LÀ MÃ GIẢ, VÀ PHẢI LUÔN LÀ MÃ GIẢ.
  //
  // Cám dỗ là dán mã thật vào cho "giống thực tế". Làm thế là tự tay đưa một
  // tài sản của khách vào kho mã, nơi nó nằm lại vĩnh viễn trong lịch sử sửa
  // đổi kể cả sau khi bị xoá — đúng thứ mà luật  sinh ra để chặn.
  //
  // Luật khớp theo KHUÔN (tiền tố VINHOMES + chuỗi hoa-số), không khớp theo
  // một mã cụ thể, nên mã giả kiểm được đúng hệt mã thật.
  const CO_MA_VOUCHER = {
    ...NOI_DUNG_MAU,
    RIS_CONTENT_INTRO:
      "## Mở đầu\nKhách dùng mã VINHOMESKIEMTHU0000 khi ký hợp đồng.",
  };
  const maVoucher = await chay(
    { title: "Bai kiem ma voucher" },
    CO_MA_VOUCHER,
  );
  ghi(
    "CHẶN bài có mã voucher",
    !maVoucher.ok && moTaLoi(maVoucher).includes("ma-voucher"),
    maVoucher.ok
      ? "LỌT — mã voucher vào được hàng chờ"
      : moTaLoi(maVoucher).split("\n").slice(0, 4).join(" | ").slice(0, 200),
  );
  ghi(
    "Lỗi bị chặn nói rõ KHÔNG phải lỗi kỹ thuật",
    !maVoucher.ok && moTaLoi(maVoucher).includes("không phải lỗi kỹ"),
    maVoucher.ok ? "-" : moTaLoi(maVoucher).split("\n")[0] ?? "",
  );

  const CO_SO_LA = {
    ...NOI_DUNG_MAU,
    RIS_CONTENT_INTRO: "## Mở đầu\nLiên hệ 0987 654 321 để được tư vấn.",
  };
  const soLa = await chay({ title: "Bai kiem so dien thoai la" }, CO_SO_LA);
  ghi(
    "CHẶN bài có số điện thoại không phải hotline",
    !soLa.ok && moTaLoi(soLa).includes("so-dien-thoai-la"),
    soLa.ok
      ? "LỌT — số của người lạ lên được trang"
      : moTaLoi(soLa).split("\n").slice(0, 4).join(" | ").slice(0, 200),
  );

  const CO_DANH_XUNG = {
    ...NOI_DUNG_MAU,
    RIS_CONTENT_INTRO:
      "## Mở đầu\nĐây là khu đô thị biển lớn nhất thế giới hiện nay.",
  };
  const danhXung = await chay({ title: "Bai kiem danh xung" }, CO_DANH_XUNG);
  ghi(
    "CHẶN danh xưng “lớn nhất thế giới”",
    !danhXung.ok && moTaLoi(danhXung).includes("danh-xung-nhat"),
    danhXung.ok
      ? "LỌT — danh xưng vô căn cứ vào được hàng chờ"
      : moTaLoi(danhXung).split("\n").slice(0, 4).join(" | ").slice(0, 200),
  );

  const CO_CAM_KET = {
    ...NOI_DUNG_MAU,
    RIS_CONTENT_INTRO:
      "## Mở đầu\nChủ đầu tư cam kết lợi nhuận 12% mỗi năm trong năm năm.",
  };
  const camKet = await chay({ title: "Bai kiem cam ket loi nhuan" }, CO_CAM_KET);
  ghi(
    "CHẶN cam kết lợi nhuận",
    !camKet.ok && moTaLoi(camKet).includes("cam-ket-loi-nhuan"),
    camKet.ok
      ? "LỌT — lời hứa tài chính vào được hàng chờ"
      : moTaLoi(camKet).split("\n").slice(0, 4).join(" | ").slice(0, 200),
  );

  // ─── Cờ: KHÔNG chặn, nhưng phải chỉ đúng chỗ ───
  const CO_GIA = {
    ...NOI_DUNG_MAU,
    RIS_CONTENT_INTRO:
      "## Mở đầu\nGiá bán dự kiến từ 5,2 tỷ đồng mỗi căn, chiết khấu 9% cho khách thanh toán sớm.",
  };
  const coGia = await chay({ title: "Bai kiem co gia" }, CO_GIA);
  ghi(
    "KHÔNG chặn bài có con số giá — vẫn vào hàng chờ",
    coGia.ok,
    coGia.ok ? coGia.out.result.split("\n")[0] ?? "" : moTaLoi(coGia).slice(0, 200),
  );
  ghi(
    "Kết quả chỉ ĐÍCH DANH chỗ cần đối chiếu, không dặn chung chung",
    coGia.ok &&
      coGia.out.result.includes("cần đối chiếu") &&
      coGia.out.result.includes("5,2 tỷ"),
    coGia.ok
      ? coGia.out.result.split("\n").slice(-3).join(" | ").slice(0, 240)
      : "-",
  );

  // Bài sạch thì KHÔNG được cắm cờ. Thiếu mục này thì một luật viết quá rộng
  // sẽ cắm cờ mọi bài, và một cảnh báo lúc nào cũng bật thì không ai đọc nữa —
  // đúng kiểu hỏng mà cả cổng chặn này sinh ra để tránh.
  if (bt.ok) {
    ghi(
      "Bài sạch KHÔNG bị cắm cờ oan",
      !bt.out.result.includes("cần đối chiếu"),
      bt.out.result.split("\n").slice(-1)[0] ?? "",
    );
  }

  // ───────────────────────── tổng kết ──────────────────────────────────────
  const truot = ketQua.filter((k) => !k.dat);
  process.stdout.write(
    `\n${ketQua.length - truot.length}/${ketQua.length} mục đạt\n`,
  );
  if (truot.length > 0) {
    process.stdout.write(`TRƯỢT:\n${truot.map((k) => "  · " + k.ten).join("\n")}\n`);
    process.exitCode = 1;
  }
}

// `void main()` chứ không phải `await main()`: tsx dịch script này sang định
// dạng CommonJS, và ở đó `await` ngoài cùng là lỗi biên dịch.
void main();
