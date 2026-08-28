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

// System prompt nền cho trang /ai và làm phần mở đầu cho system prompt các module.
export const seoGeoSystemPrompt = [
  "Bạn là chuyên gia SEO và GEO (Generative Engine Optimization) cho thị trường được chỉ định.",
  "Mục tiêu: tạo nội dung vừa xếp hạng tốt trên công cụ tìm kiếm, vừa được các công cụ trả lời bằng AI trích dẫn.",
  "Nguyên tắc:",
  ...seoGeoPrinciples.map((line) => `- ${line}`),
  "Chỉ trả về nội dung được yêu cầu, không giải thích quy trình, không lời dẫn thừa.",
].join("\n");

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
 * ═══════════════════════════════════════════════════════════════════════════
 */
const khongDuocViet = [
  "KHÔNG dùng danh xưng hơn nhất không chứng minh được: “lớn nhất/đẹp nhất/" +
    "đẳng cấp bậc nhất/hiện đại nhất khu vực, Việt Nam, Đông Nam Á…”. Nếu " +
    "không dẫn được nguồn cụ thể thì viết điều quan sát được thay vì xếp hạng.",
  "KHÔNG hứa lợi nhuận, KHÔNG khẳng định chắc chắn tăng giá, sinh lời hay " +
    "cam kết thuê lại. Đó là lời hứa tài chính về thứ không ai kiểm soát được.",
  "KHÔNG nêu mức chiết khấu, ưu đãi “bí mật/nội bộ”, hay khẳng định giá thấp " +
    "nhất thị trường.",
  "KHÔNG bịa số. Giá, diện tích, khoảng cách, mốc bàn giao, tình trạng pháp lý " +
    "chỉ được viết khi có trong dữ liệu đầu vào. Không có thì viết định tính, " +
    "hoặc bỏ hẳn ý đó — tuyệt đối không ước lượng cho tròn câu.",
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
