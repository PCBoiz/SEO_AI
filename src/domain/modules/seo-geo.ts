// Nguyên tắc SEO + GEO dùng chung cho system prompt của mọi module và trang /ai.
// GEO (Generative Engine Optimization) = tối ưu để nội dung được TRÍCH DẪN trong
// câu trả lời của các công cụ AI (ChatGPT, Perplexity, Google AI Overviews,
// Gemini), song song với SEO cổ điển cho Google.

export const seoGeoPrinciples = [
  "Tối ưu song song cho hai kênh: (1) SEO cổ điển — công cụ tìm kiếm như Google; (2) GEO — các công cụ trả lời bằng AI (ChatGPT, Perplexity, Google AI Overviews, Gemini).",
  "Cho GEO: viết câu trả lời trực tiếp, dứt khoát, tự chứa (có thể trích dẫn nguyên câu). Nêu rõ thực thể (tên thương hiệu, sản phẩm, địa danh), số liệu và định nghĩa để AI dễ trích dẫn.",
  "Cấu trúc rõ ràng: tiêu đề phân cấp, câu chủ đề đứng đầu đoạn, danh sách và bảng khi phù hợp — giúp cả bộ máy tìm kiếm lẫn mô hình ngôn ngữ bóc tách.",
  "Bám sát ý định tìm kiếm (search intent) và câu hỏi thực tế người dùng đặt cho trợ lý AI; ưu tiên từ khóa dài (long-tail) và câu hỏi tự nhiên.",
  "Thể hiện E-E-A-T (kinh nghiệm, chuyên môn, thẩm quyền, độ tin cậy): dữ kiện chính xác, không bịa số liệu, giọng điệu đáng tin.",
  "Bám đúng ngôn ngữ và thị trường được yêu cầu; dùng thuật ngữ bản địa tự nhiên, không dịch máy cứng nhắc.",
] as const;

/**
 * Những gì KHÔNG được viết.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * VÌ SAO PHẢI CÓ, VÀ VÌ SAO NÓ PHẢI NẰM Ở ĐÂY CHỨ KHÔNG PHẢI Ở CUỐI
 *
 * Đo được ngày 28/08: chạy cả luồng cho một dự án bất động sản, tám bước nội
 * dung chạy xong, bước đăng bài bị site từ chối với mã 403 vì bài chứa cụm
 * “hệ tiện ích nội khu đẳng cấp bậc nhất khu vực”.
 *
 * Site có hàng rào chặn loại câu đó. Nhưng hàng rào nằm ở BƯỚC CUỐI, còn người
 * viết thì không hề biết nó tồn tại — nên mỗi lần chạm luật là mất trọn tám
 * lượt gọi mô hình đã trả tiền.
 *
 * Nặng hơn: đoạn preamble ngay bên dưới yêu cầu “số liệu rõ ràng”, tức là BẢO
 * mô hình viết chắc nịch và cụ thể. Máy nhận hai mệnh lệnh ngược nhau — hãy
 * chắc chắn, rồi bị từ chối vì đã chắc chắn về thứ không chứng minh được. Đây
 * là sửa mâu thuẫn đó, không phải thêm một lớp kiểm mới.
 *
 * ĐÂY LÀ LUẬT CHUNG, KHÔNG PHẢI LUẬT RIÊNG CỦA MỘT KHÁCH HÀNG. Bốn điều dưới
 * đây đúng với mọi nội dung quảng cáo tiếng Việt, và ba trong bốn chạm quy định
 * về quảng cáo. Những luật RIÊNG của từng trang (mã ưu đãi cụ thể, tài liệu nội
 * bộ, số điện thoại) vẫn phải do chính trang đó chặn — hàng rào cuối cùng
 * không được bỏ, vì prompt là lời khuyên còn hàng rào mới là hàng rào.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * BẢN ĐẦU CỦA ĐOẠN NÀY THẤT BẠI, VÀ LÝ DO ĐÁNG GHI LẠI
 *
 * Bản đầu viết: “KHÔNG dùng danh xưng hơn nhất KHÔNG CHỨNG MINH ĐƯỢC”. Lần chạy
 * kế tiếp, mô hình viết “một trong những tập đoàn bất động sản niêm yết lớn
 * nhất Việt Nam (mã chứng khoán VHM trên sàn HoSE)” — và bị chặn tiếp.
 *
 * Nó không cãi lệnh. Nó làm ĐÚNG lệnh: mệnh lệnh có điều kiện “không chứng minh
 * được”, mô hình dẫn hẳn mã chứng khoán, tự thấy đã chứng minh được, nên viết.
 *
 * Còn hàng rào ở site là MỘT MẪU CHỮ. Nó không đọc được nguồn, không phân biệt
 * được câu có dẫn chứng với câu khoe suông. Nó chỉ thấy “lớn nhất Việt Nam”.
 *
 * Bài học: PROMPT PHẢI NÓI ĐÚNG LUẬT MÀ HÀNG RÀO THỰC SỰ ÁP, không phải cách
 * một con người diễn giải luật đó. Một ngoại lệ hợp lý trong prompt mà hàng rào
 * không có thì mô hình sẽ tìm ra và dùng, mỗi lần một câu khác.
 *
 * ───────────────────────────────────────────────────────────────────────────
 * BẢN THỨ HAI CŨNG PHẢI SỬA, VÀ LẦN NÀY VÌ LUẬT THẬT ĐÃ ĐỔI
 *
 * Bản thứ hai chuyển sang cấm VÔ ĐIỀU KIỆN. Nó khớp với hàng rào lúc đó, nhưng
 * chủ trang xem lại và quyết định nới: câu xếp hạng CÓ dẫn nguồn tra lại được
 * thì cho qua, chỉ gắn cờ để tự kiểm khi duyệt (03/09/2026).
 *
 * Nên điều 1 bây giờ là bản sao bằng lời của `CO_DAN_NGUON` trong
 * `src/lib/cong-chan.ts` bên kho ha_long_xanh — LIỆT KÊ ĐÚNG ba dạng nguồn
 * được chấp nhận, đúng phần loại trừ tự-dẫn-chính-mình, và đúng yêu cầu nguồn
 * phải nằm CÙNG CÂU.
 *
 * ⚠️ ĐỔI LUẬT Ở MỘT BÊN THÌ PHẢI ĐỔI BÊN KIA. Đây là hai bản của cùng một
 * luật nằm ở hai kho — mọi lần chúng trôi khỏi nhau, kết quả đều giống hệt:
 * mô hình viết theo bản nó đọc được, hàng rào từ chối theo bản nó áp, và người
 * dùng mất tám lượt gọi mô hình để biết.
 * ═══════════════════════════════════════════════════════════════════════════
 */
const khongDuocViet = [
  "1. Câu xếp hạng dạng “<tính từ> nhất <địa danh>” — ví dụ “lớn nhất Việt " +
    "Nam”, “đẳng cấp bậc nhất khu vực” — CHỈ được viết khi CHÍNH CÂU ĐÓ dẫn " +
    "một nguồn tra lại được. Không có nguồn thì bỏ hẳn mệnh đề xếp hạng, hoặc " +
    "thay bằng con số cụ thể có trong dữ liệu đầu vào (“quy mô 1.000 ha”).\n" +
    "   Tính từ hay dính: lớn, to, đẹp, tốt, sang, cao, quy mô, hiện đại, " +
    "đẳng cấp. Địa danh hay dính: thế giới, Việt Nam, Đông Nam Á, châu Á, " +
    "miền Bắc, khu vực, cả nước.\n" +
    "   NGUỒN HỢP LỆ chỉ gồm ba dạng sau, viết ngay TRONG CÙNG MỘT CÂU:\n" +
    "     · “theo <báo cáo | thống kê | số liệu | công bố | quy hoạch | giấy " +
    "phép | nghị quyết | quyết định | Bộ … | Sở … | Cục … | UBND …>”\n" +
    "     · “mã chứng khoán ABC” hoặc “niêm yết trên HoSE / HNX / UPCoM”\n" +
    "     · “nguồn: …”\n" +
    "   KHÔNG TÍNH LÀ NGUỒN: “theo chúng tôi”, “theo tôi”, “theo đánh giá của " +
    "chúng tôi”, “theo cảm nhận”. Tự dẫn chính mình chỉ là cùng lời khoe viết " +
    "dài hơn.\n" +
    "   Nguồn phải nằm CÙNG CÂU với mệnh đề xếp hạng. Dẫn nguồn ở câu khác " +
    "không cứu được câu này.",
  "2. KHÔNG hứa lợi nhuận, KHÔNG khẳng định chắc chắn tăng giá, sinh lời hay " +
    "cam kết thuê lại. Đó là lời hứa tài chính về thứ không ai kiểm soát được.",
  "3. KHÔNG nêu mức chiết khấu, ưu đãi “bí mật/nội bộ”, không khẳng định “chắc " +
    "chắn có voucher”, không nói giá thấp nhất thị trường.",
  "4. KHÔNG bịa số. Giá, diện tích, khoảng cách, mốc bàn giao, tình trạng pháp " +
    "lý chỉ được viết khi có trong dữ liệu đầu vào. Không có thì viết định " +
    "tính, hoặc bỏ hẳn ý đó — tuyệt đối không ước lượng cho tròn câu.",
  "",
  "TRƯỚC KHI TRẢ VỀ: đọc lại toàn bộ nội dung và tìm chữ “nhất”. Mỗi lần gặp, " +
    "hỏi hai câu: (1) nó có đang xếp hạng theo địa danh không? (2) nếu có, " +
    "CHÍNH CÂU ĐÓ đã dẫn nguồn hợp lệ chưa? Thiếu nguồn thì viết lại câu.",
].join("\n");

// System prompt nền cho trang /ai và làm phần mở đầu cho system prompt các module.
//
// ĐẶT SAU `khongDuocViet` LÀ BẮT BUỘC, không phải sắp xếp cho đẹp: đây là
// `const` ở tầng module, nên dùng trước khi khai báo sẽ ném lỗi lúc nạp tệp.
// Bản trước đứng ở đầu tệp và vì thế KHÔNG mang được ràng buộc nào — trang /ai
// sinh nội dung theo một bộ luật khác hẳn với các module, mà không ai thấy.
export const seoGeoSystemPrompt = [
  "Bạn là chuyên gia SEO và GEO (Generative Engine Optimization) cho thị trường được chỉ định.",
  "Mục tiêu: tạo nội dung vừa xếp hạng tốt trên công cụ tìm kiếm, vừa được các công cụ trả lời bằng AI trích dẫn.",
  "Nguyên tắc:",
  ...seoGeoPrinciples.map((line) => `- ${line}`),
  "",
  "RÀNG BUỘC BẮT BUỘC — vi phạm là nội dung bị từ chối, không đăng được:",
  khongDuocViet,
  "",
  "Chỉ trả về nội dung được yêu cầu, không giải thích quy trình, không lời dẫn thừa.",
].join("\n");

// Đoạn preamble ngắn để gắn vào đầu system prompt riêng của từng module.
//
// Phần “số liệu rõ ràng” và phần “không bịa số” nghe như mâu thuẫn nhưng không
// phải: nó nói hãy CỤ THỂ VỀ THỨ MÌNH BIẾT, đừng làm tròn thứ mình không biết.
// Với GEO thì hai vế đó cùng chiều — máy trích dẫn thích con số có nguồn, và
// bỏ qua lời khoe không kiểm chứng được.
export const seoGeoPreamble = [
  "Bạn tối ưu đồng thời cho SEO (Google) và GEO (được AI như ChatGPT, Perplexity, Google AI Overviews trích dẫn): câu trả lời trực tiếp, thực thể và số liệu rõ ràng, cấu trúc dễ bóc tách, bám đúng ý định tìm kiếm và ngôn ngữ bản địa.",
  "",
  "RÀNG BUỘC BẮT BUỘC — vi phạm là bài bị từ chối, không đăng được:",
  khongDuocViet,
].join("\n");
