# Báo cáo trạng thái — số đo thật

*Sinh tự động ngày 11/09/2026 bằng `npm run bao-cao`. Mọi con số dưới đây được
đếm lại từ mã nguồn hoặc đo trực tiếp trên trang đang chạy tại thời điểm chạy lệnh.*

*Bản này CHỈ ĐO, không nhận định. Muốn biết vì sao một con số ra như vậy thì đọc
`NHAT-KY.md` ở gốc mỗi kho.*

---

## Antigravity OS

| Hạng mục | Số đo | Nguồn |
|---|---|---|
| Next.js | 16.2.11 | `package.json` |
| Module đăng ký | 19 | `registry.ts` → `registeredModuleKeys` |
| Bảng trong schema Postgres | 23 | `postgres-schema.ts` → `pgTable(` |
| Test | 253/253 đạt · 39 tệp | `npm test` |
| Lint | 0 cảnh báo | `npm run lint` |
| Tuyến trang | 18 | thư mục `src/app` |

## halongxanh360.vn

| Hạng mục | Số đo | Nguồn |
|---|---|---|
| Tuyến trang | 21 | thư mục `src/app` |
| Ảnh trong kho | 66 | `public/images/*.webp` |
| Ảnh bị cấm dùng | 6 | `anh-cam-dung.ts` |
| Phép kiểm | 13/13 đạt | `npm run kiem` |

### Tệp cho trợ lý AI — đo trên trang đang chạy

| Tệp | HTTP | Dung lượng |
|---|---|---|
| `/llms.txt` | 200 | 11.150 byte |
| `/robots.txt` | 200 | 628 byte |
| `/sitemap.xml` | 200 | 4.048 byte |

### Số từ mỗi trang — đo trên trang đang chạy

*Trang dưới 500 từ có nguy cơ bị coi là nội dung mỏng.*

| Trang | Số từ |
|---|---|
| `/tin-tuc` | 411 ⚠ |
| `/duyet-bai` | 437 ⚠ |
| `/tai-lieu` | 533 |
| `/quy-hoach` | 676 |
| `/tien-ich` | 714 |
| `/lien-he` | 729 |
| `/gia-global-gate-ha-long` | 839 |
| `/tien-do-global-gate-ha-long` | 918 |
| `/du-an` | 953 |
| `/phap-ly-global-gate-ha-long` | 987 |
| `/gia-tri-tai-san-global-gate-ha-long` | 1.064 |
| `/gia-thuc-tra-global-gate-ha-long` | 1.157 |
| `/voucher-vinhomes` | 1.167 |
| `/vi-tri-global-gate-ha-long` | 1.185 |
| `/chinh-sach-global-gate-ha-long` | 1.281 |
| `/dau-tu` | 1.403 |
| `/` | 2.555 |
| `/quy-can-global-gate-ha-long` | 34.375 |

**2/18 trang dưới 500 từ.**

---

*Sinh bởi `scripts/bao-cao-du-an.mjs`. Chạy lại bất cứ lúc nào để có số mới —
đừng chép số từ bản này sang tài liệu khác, vì chép ra là bắt đầu cũ đi.*