# Báo cáo trạng thái — số đo thật

*Sinh tự động ngày 10/09/2026 bằng `npm run bao-cao`. Mọi con số dưới đây được
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
| Test | 199/199 đạt · 34 tệp | `npm test` |
| Lint | 0 cảnh báo | `npm run lint` |
| Tuyến trang | 18 | thư mục `src/app` |

## halongxanh360.vn

| Hạng mục | Số đo | Nguồn |
|---|---|---|
| Tuyến trang | 21 | thư mục `src/app` |
| Ảnh trong kho | 66 | `public/images/*.webp` |
| Ảnh bị cấm dùng | 5 | `anh-cam-dung.ts` |
| Phép kiểm | 10/10 đạt | `npm run kiem` |

### Tệp cho trợ lý AI — đo trên trang đang chạy

| Tệp | HTTP | Dung lượng |
|---|---|---|
| `/llms.txt` | 200 | 11.010 byte |
| `/robots.txt` | 200 | 628 byte |
| `/sitemap.xml` | 200 | 5.412 byte |

### Số từ mỗi trang — đo trên trang đang chạy

*Trang dưới 500 từ có nguy cơ bị coi là nội dung mỏng.*

| Trang | Số từ |
|---|---|
| `/tin-tuc` | 355 ⚠ |
| `/duyet-bai` | 381 ⚠ |
| `/tai-lieu` | 477 ⚠ |
| `/quy-hoach` | 618 |
| `/lien-he` | 673 |
| `/tien-ich` | 694 |
| `/gia-global-gate-ha-long` | 783 |
| `/tien-do-global-gate-ha-long` | 862 |
| `/phap-ly-global-gate-ha-long` | 931 |
| `/gia-tri-tai-san-global-gate-ha-long` | 1.005 |
| `/gia-thuc-tra-global-gate-ha-long` | 1.101 |
| `/voucher-vinhomes` | 1.111 |
| `/vi-tri-global-gate-ha-long` | 1.129 |
| `/chinh-sach-global-gate-ha-long` | 1.224 |
| `/dau-tu` | 1.347 |
| `/` | 2.500 |
| `/quy-can-global-gate-ha-long` | 34.317 |
| `/du-an` | 34.442 |

**3/18 trang dưới 500 từ.**

---

*Sinh bởi `scripts/bao-cao-du-an.mjs`. Chạy lại bất cứ lúc nào để có số mới —
đừng chép số từ bản này sang tài liệu khác, vì chép ra là bắt đầu cũ đi.*