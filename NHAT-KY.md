# Nhật ký — Antigravity OS

Mới nhất ở trên. Đọc tệp này **trước khi bắt tay vào việc**, đừng suy lại từ đầu
từ mã nguồn.

Sổ này KHÔNG chép lại git log — git đã ghi từng thay đổi và lý do rồi. Sổ giữ
đúng phần git không giữ được: trạng thái bắc qua nhiều phiên, việc nằm ngoài
kho, và những kết luận đã kiểm chứng để khỏi kiểm lại.

⚠️ `docs/implementation-status.md` tự nhận là "sổ chạy" nhưng dừng ở 2026-07-23
trong khi kho vẫn được sửa tới cuối tháng 8. Nó là ảnh chụp kiến trúc, KHÔNG
phải nhật ký — đừng tin phần trạng thái trong đó.

Kho anh em: `D:\vinhomes_ha_long_xanh` (halongxanh360.vn) — nơi bài được đăng tới.

---

## 09/09/2026

### Vòng lặp dựng web ĐÃ CHẠY ĐƯỢC THẬT (09/09) — `8d92690`

Làm phần rủi ro nhất trước mọi thứ khác. Ba con số đo được, dùng để quyết định
thiết kế:

```
  npm install       ~8 phút lần đầu · 0.0s các lần sau (giữ node_modules)
  tsc + next build  7–11 giây
  next dev lên      2,9–3,7 giây
```

Nghĩa là vòng sửa-xem mất **vài giây**, không phải vài phút. Cảm giác "sửa là
thấy ngay" giữ được. `node_modules` của một dự án Next.js là **382 MB** — con số
này xác nhận `/tmp` 500 MB của Vercel là vừa đủ chật, đúng như đã dự đoán.

**Ba lỗi đã vấp, cả ba đều âm thầm — chú thích trong `moi-truong-may.ts` giữ
nguyên lý do, đừng xoá:**

1. `kill()` trên Windows với `shell: true` chỉ giết `cmd.exe`, để lại `next dev`
   là CHÁU còn sống và giữ cổng. Kịch bản chạy xong hết các bước rồi **treo** —
   nhìn từ ngoài không phân biệt được với "đang chạy dở".
2. Vá bằng `taskkill /T` **vẫn không ăn**, vì `cmd.exe` đã thoát trước nên cây
   tiến trình đứt. Đo thật: còn ba tiến trình Node sống sau khi xong. Cách chữa
   đúng không phải giết khéo hơn mà là **đừng đẻ ra cây** — gọi thẳng
   `node <tệp.js>`, khi đó pid chính là tiến trình cần giết.
3. Không bắt `stdout` của dev server nên khi nó không lên chỉ báo "không lên sau
   120 giây". Thực ra Next đang báo rõ nguyên nhân (một tiến trình dev khác giữ
   cùng thư mục `.next`) nhưng lời báo đó rơi vào hư không.

**Khuôn mẫu đã trích:** 41 component từ halongxanh360 →
`src/data/khuon-mau-halongxanh360.json`. 19/41 có chú thích giải thích VÌ SAO,
13/41 có khai báo props. Đọc bằng trình biên dịch TypeScript chứ không bằng
regex — regex sẽ chạy đúng trên 35 tệp rồi âm thầm bỏ sót 5 tệp.

**Phát hiện phụ:** Next.js 16 tự ghi ra `AGENTS.md` và `CLAUDE.md` khi cài. Đó là
nguồn gốc `AGENTS.md` trong cả hai kho, và nghĩa là mọi dự án sinh ra sẽ tự mang
theo lời cảnh báo "This is NOT the Next.js you know".

### Trình dựng website — ba quyết định đã chốt (09/09)

1. **Công cụ nội bộ**, chỉ 2 người dùng → bỏ hẳn gói tháng, hạn mức, đa người thuê.
   Toàn bộ phần tính toán quy mô ở `nghien-cuu-luu-tru-va-xem-truoc.md` mục 4 giữ
   lại để tham khảo nhưng **không phải làm**.
2. **Chạy được cả trên Vercel lẫn trên máy.**
3. **Trang sinh ra dùng Next.js + Tailwind** như halongxanh360.

Quyết định 3 làm việc xem trước khó hẳn lên, và đây là ràng buộc cứng đã xác minh:
**Vercel KHÔNG chạy được `npm install` + `next build` trong hàm** — hệ thống tệp
chỉ đọc trừ `/tmp` 500 MB, hàm tối đa 60 giây trên Hobby. Không tối ưu được, phải
đi đường khác.

Lời giải: một giao diện `MoiTruongDung`, hai bản hiện thực — tiến trình con khi
chạy trên máy (localhost thật, HMR, miễn phí), Vercel Sandbox khi chạy trên Vercel
(Hobby cho 5 giờ CPU/tháng ≈ 60 phiên xem trước, chạy được `npm run dev`).

Chi tiết: `docs/nghien-cuu-xem-truoc-va-skills.md`.

**Phát hiện đáng giá nhất về skills:** shadcn MCP cho model **tra kho component
thật** thay vì nhớ — cùng một bệnh với việc mô hình nhớ sai năm hiện tại, cùng một
thuốc. Và **nguồn bổ trợ tốt nhất không nằm trong 11 nguồn**: chính kho
halongxanh360 có 40 component đã chạy production, đúng ngành, đúng tiếng, đã qua
kiểm duyệt của chủ dự án.

### VÒNG 3 tự chủ — audit Antigravity (09/09)

**Cổng:** 198/198 test đạt (34 tệp), lint 0 cảnh báo, typecheck sạch.

**Tìm ra và đã vá:**

1. **Mã `dung-web` vừa viết chưa có test nào** — kể cả chốt chặn đường dẫn thoát
   thư mục, thứ liên quan trực tiếp tới an toàn. Đã thêm 5 ca.

2. **⚠️ VÀ VIẾT TEST LÀM LỘ RA MỘT LỖI TRONG CHÍNH CHỐT CHẶN ĐÓ.** Bản đầu so
   bằng `dich.startsWith(resolve(thuMuc))` — `startsWith` so tiền tố CHUỖI, nên
   thư mục `du-an-2` khớp nhầm với `du-an-22`, và một dự án ghi đè được lên dự án
   khác chỉ vì tên nó là tiền tố. **Lỗi này không lộ ra khi thử tay** — nó cần
   đúng hai tên dự án trong đó tên này là tiền tố của tên kia. Đã đổi sang
   `relative()` + `isAbsolute()`, và giữ lại một ca test dựng đúng tình huống đó.

3. **`quyenTuDongHoaConThieu` chưa có test.** Đã thêm 4 ca, trong đó một ca dựng
   lại đúng lỗi thật hôm nay: token 5 quyền, giao diện báo xanh, Search Console
   trả 403.

4. **Sáu script không đăng ký trong `package.json`** — cùng loại lỗi với kho
   halongxanh360. Đã đăng ký 5; `module-rubrics.ts` là thư viện được script khác
   nhập, không phải lệnh chạy.

**Vòng sau nên làm:** dựng `npm run kiem` tự tìm cho kho này như đã làm bên
halongxanh360, để không phải đăng ký tay nữa.

### 11 nguồn chủ dự án gửi — ĐÃ KHÔI PHỤC, đừng hỏi lại (09/09)

Chủ dự án gửi 11 nguồn ở một đoạn hội thoại về sau bị nén mất. Khôi phục từ bản
ghi `69e0234b-….jsonl` dòng 23133. Chép ra đây để không mất lần nữa:

1. https://github.com/mattpocock/skills — định dạng SKILL.md
2. https://claude.com/blog/the-ai-native-sdlc-playbook — **giá trị nhất**
3. https://github.com/donnemartin/system-design-primer
4. https://github.com/tt-a1i/archify — mẫu xác thực nguyên tử
5. https://horizonx.so/ — thư viện UI, **trả phí $24,99–99,99/tháng**
6. https://uiverse.io/ — component CSS mã nguồn mở
7. https://github.com/msitarzewski/agency-agents — 230+ vai trò tác tử
8. https://github.com/nextlevelbuilder/ui-ux-pro-max-skill — **dùng được ngay**
9. https://github.com/ChromeDevTools/chrome-devtools-mcp — **chốt kiểm chứng**
10. https://shaders.com/ — hiệu ứng nền
11. https://contentcore.xyz/ — tạo ảnh/video, **trả phí $9,99/tháng**

Phân tích đầy đủ: `docs/nghien-cuu-dung-website.md`.

**Kết luận lớn nhất, và nó không đến từ 11 nguồn mà từ chính mã kho này:**
Antigravity ĐÃ LÀ một bộ điều phối đa tác tử. Bảy trong chín mảnh cần thiết đã có
sẵn và đang chạy cho luồng viết bài. Thiếu đúng hai: kiểu đầu ra dạng cây tệp
(hiện là một chuỗi), và một module kiểm chứng chạy thật (`tsc` + `next build` +
mở bằng chrome-devtools-mcp). Đây là việc vài tuần, không phải vài tháng.

### Đã làm
- `ad4f9e8` — đối chiếu quyền OAuth đã cấp với quyền cần, gọi tên cái thiếu.
  Trước đó đếm scope, mà đếm không cho biết thiếu cái nào.
- `625b329` — nút "Kết nối Search Console" thành nút thật (trước là `<span>` chết,
  luôn ghi "(cần cấu hình)" kể cả khi đã cấu hình xong).
- Bỏ qua `.tmp/**` trong eslint — một tệp nháp đang làm đỏ cổng lint của cả kho.

### Đã chứng minh
- `npm run lint` sạch (0 cảnh báo) · `npx tsc --noEmit` sạch.
- **Trang Cài đặt và trang Analytics đọc cùng một hàm** `getOAuthProviderStatuses()`,
  cùng hai biến `GOOGLE_OAUTH_CLIENT_ID`/`SECRET`. Cài đặt xanh được nghĩa là hai
  biến đó **đã có trên Vercel** — không cần thêm biến môi trường nào.
- **Nguyên nhân "không thấy nút" KHÔNG phải lỗi mã.** Dự án Vercel chưa từng nối
  với GitHub; nó được tải tay lên. Mọi commit nằm im ở GitHub. Chủ dự án đã nối
  `PCBoiz/SEO_AI` ngày 09/09.
- **Google Cloud → Data Access đã lưu đủ 6 quyền** (đã xem ảnh xác nhận):
  `openid`, `userinfo.email`, `userinfo.profile`, `drive.file`, `spreadsheets`
  (sensitive), `webmasters.readonly`.

### Chủ dự án cần làm
- **Vercel → Deployments → Redeploy một lần.** Nối Git xong KHÔNG tự dựng lại
  các commit đã đẩy trước lúc nối. Từ lần sau mới tự động thật.
- Sau khi deploy: vào `/settings` bấm **"Cấp thêm quyền"**. Token hiện tại chỉ có
  5 quyền, cấp trước khi `webmasters.readonly` được thêm vào — Google không tự
  nới token cũ. Xong thì huy hiệu ở `/analytics` phải chuyển xanh "Đã kết nối".
- **Thu hồi khoá OpenAI `sk-proj-77fD…`** đã lộ trong hội thoại (đã dùng 5 lần).

### Đang chặn
- **Trình dựng website đa tác tử**: chủ dự án đã chọn hướng "sinh mã đầy đủ bằng
  nhiều tác tử", đang chờ chị gửi các repos/skills/agents tham khảo.
- **Nghiên cứu từ khoá**: chờ CSV Keyword Planner.

### Quy ước đã chốt
- Bí mật: chủ dự án tự ghi vào `.env.local` (đã gitignore), script đọc từ đó.
  **Không bao giờ yêu cầu dán khoá vào hội thoại, không bao giờ `cat` tệp đó.**
- Mô hình không có đồng hồ. Lệnh cấm "KHÔNG bịa số" không sửa được năm sai —
  phải **đưa ngày vào lời nhắc** (`dongHomNay()` trong `src/domain/modules/seo-geo.ts`).
  Đã chứng minh: "…mới nhất 2024" → "…mới nhất 2026".
- Mốc ngày UTC rơi vào 07:00 giờ Việt Nam. Mọi phép so ngày phải dùng
  `Asia/Ho_Chi_Minh`, nếu không hai lần chạy cùng một ngày làm việc bị tính là
  hai ngày khác nhau — và sai âm thầm.
