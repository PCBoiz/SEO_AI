# Nghiên cứu: để người dùng Antigravity tự dựng website

*Lập 09/09/2026. Nguồn: 11 tài liệu chủ dự án gửi (khôi phục từ bản ghi hội thoại,
dòng 23133), cộng tra cứu độc lập về kiến trúc sinh mã đa tác tử.*

---

## Kết luận đặt trước

**Antigravity đã là một bộ điều phối đa tác tử rồi.** Không cần dựng hệ thống mới.

Việc phải làm không phải "xây nền tảng multi-agent" — việc đó mất hàng tháng. Việc
phải làm là **thêm một kiểu đầu ra** và **một chốt kiểm chứng**. Mọi thứ còn lại
đã nằm sẵn trong kho, đang chạy, đang được dùng cho luồng viết bài.

Đây là kết luận quan trọng nhất của bản nghiên cứu, và nó không đến từ nguồn nào
trong 11 nguồn — nó đến từ việc đọc chính mã của Antigravity.

---

## 1 · Bằng chứng: những mảnh của một hệ đa tác tử đã có sẵn

| Thứ một hệ sinh mã đa tác tử cần | Antigravity đã có | Ở đâu |
|---|---|---|
| Sổ đăng ký các tác tử | `registeredModuleKeys` — 17 module | `src/domain/modules/registry.ts:53` |
| Chuỗi tác tử chạy theo thứ tự | `pipelinePresets`, `articlePipelineModuleKeys` | `registry.ts:76`, `:95` |
| Tác tử sau đọc được kết quả tác tử trước | `upstream: Record<string, string>` | `module-definition.ts` |
| Hợp đồng định dạng đầu ra + tự sửa | `validate: FormatValidator`, engine gọi lại đúng một lần | `module-definition.ts` |
| Gọi model không phụ thuộc nhà cung cấp | `ModuleGenerate` với BYOK | `module-definition.ts` |
| Lưu vết từng lượt chạy | job trong Neon | `module-job-repository.ts` |
| Giao diện tự dựng theo khai báo | `ModuleFormField` → runner generic | `module-definition.ts` |

Bảy mảnh. Một hệ sinh mã đa tác tử cần đúng bảy mảnh đó, cộng thêm hai thứ nữa.

---

## 2 · Hai thứ còn thiếu

### 2.1 · Kiểu đầu ra: hiện là một chuỗi, cần là một cây tệp

```ts
// Hiện tại — module-definition.ts
generate(request): Promise<string>
upstream: Record<string, string>   // moduleKey → một khối text
```

Mã nguồn không phải một khối text. Nó là **nhiều tệp có đường dẫn**, và tệp sau
phải nhập đúng thứ tệp trước xuất ra. Nhét cả một dự án vào một chuỗi rồi bảo
module sau tự tách là cách hỏng đã biết trước.

Cần thêm một kiểu song song, không thay thế kiểu cũ:

```ts
export interface CayTep {
  tep: { duongDan: string; noiDung: string }[];
  /** Hợp đồng mà các tệp khác được phép dựa vào: tên hàm, kiểu, props. */
  hopDong: Record<string, string>;
}
```

`hopDong` là mấu chốt. Nó cho phép tác tử sinh `components/Nav.tsx` biết chính xác
`lib/duong-dan.ts` xuất ra cái gì — **mà không phải đọc cả tệp đó**. Đây là cách
tránh nhồi toàn bộ kho mã vào lời nhắc.

### 2.2 · Chốt kiểm chứng: tác tử phải tự kiểm trước khi người xem

Đây là chỗ mọi hệ sinh mã hỏng, và tài liệu tra được nói rất rõ. Playbook AI-native
SDLC của Anthropic (nguồn #2) đặt nó thành một giai đoạn riêng:

> *Agents verify their own work through feedback loops — running tests, building,
> taking screenshots — before engineers review.*

Và một nguyên tắc quản trị đi kèm, đáng chép nguyên: **tác tử không được duyệt việc
của chính nó.**

Không có chốt này thì sản phẩm là **mã hỏng một cách tự tin** — trông đúng, đọc
xuôi, không chạy. Người dùng không biết đọc mã sẽ không phát hiện ra, và họ sẽ
phát hiện lúc mở trang.

---

## 3 · Mười một nguồn dùng được vào đâu

| # | Nguồn | Dùng vào |
|---|---|---|
| 1 | [mattpocock/skills](https://github.com/mattpocock/skills) — `SKILL.md` | **Định dạng gói hướng dẫn.** Một quy trình lặp lại được đóng thành một tệp có frontmatter. Đúng hình dạng mà `ModuleDefinition` nên tiến tới cho phần chỉ dẫn. |
| 2 | [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) | **Xương sống của luồng.** Sáu giai đoạn Plan → Design → Build → Test → Deploy → Maintain, và các chốt duyệt. Nguồn giá trị nhất trong 11 nguồn. |
| 3 | [system-design-primer](https://github.com/donnemartin/system-design-primer) | Kho tham chiếu cho tác tử kiến trúc. Không nhúng cả kho — trích mục cần. |
| 4 | [archify](https://github.com/tt-a1i/archify) | **Mẫu xác thực nguyên tử**: sinh JSON IR → kiểm schema/layout/route → mọi kiểm phải qua HẾT mới tạo artifact. Và nguyên tắc *"không phát minh tôpô"* — chỉ dùng nút và quan hệ đã khai. Đây chính là bản sao của luật "không bịa" mà kho này đã dùng cho nội dung. |
| 5 | [horizonx.so](https://horizonx.so/) | Thư viện UI kit + component xuất mã. **Trả phí $24,99–99,99/tháng**, có giấy phép thương mại. Xem mục 6. |
| 6 | [uiverse.io](https://uiverse.io/) | Thư viện component CSS mã nguồn mở, dán thẳng được. |
| 7 | [agency-agents](https://github.com/msitarzewski/agency-agents) | 230+ mô tả vai trò tác tử dạng Markdown có frontmatter. **Dùng làm kho vai trò**, không dùng cả bộ — 230 tác tử cho một trang web là thừa. Lấy 5–6 vai cần. |
| 8 | [ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | **Nguồn dùng được ngay nhất cho phần thiết kế.** 192 bảng màu, 74 cặp font, danh sách anti-pattern, và checklist trước khi giao: tương phản, responsive, focus state, `prefers-reduced-motion`. Checklist đó nên thành một chốt kiểm chứ không phải một lời khuyên. |
| 9 | [chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp) | **Chính là chốt kiểm chứng ở mục 2.2.** Mở trang vừa sinh, chụp ảnh, đọc lỗi console, chạy Lighthouse. Đây là thứ biến "tác tử tự nhận là xong" thành "đo được là xong". |
| 10 | [shaders.com](https://shaders.com/) | Hiệu ứng nền. Dùng dè — mỗi shader là một khối WebGL nặng. |
| 11 | [contentcore.xyz](https://contentcore.xyz/) | Công cụ tạo ảnh/video nội dung, **$9,99/tháng**. Không liên quan việc sinh mã; liên quan việc làm ảnh cho bài đăng. |

**Ba nguồn quan trọng nhất, xếp theo giá trị thực:** #2 (luồng), #9 (kiểm chứng),
#8 (thiết kế). Ba cái đó đủ để bắt đầu; tám cái còn lại là tài nguyên tra khi cần.

---

## 4 · Luồng đề xuất — sáu module, đúng khuôn đã có

Mỗi bước là một `ModuleDefinition` bình thường, xếp thành một `PipelinePreset` mới.
Không có gì mới về kiến trúc.

| # | Module | Vào | Ra |
|---|---|---|---|
| 1 | **Ý định** (`intent`) | Mô tả của người dùng | `intent.md` — vấn đề, kết quả mong muốn, ràng buộc. Theo đúng playbook #2. |
| 2 | **Kiến trúc** | `intent.md` | Danh sách trang, danh sách component, **bảng hợp đồng** (tệp nào xuất gì) |
| 3 | **Hệ thiết kế** | `intent.md` | Token màu, cặp font, thang khoảng cách. Rút từ dữ liệu nguồn #8. |
| 4 | **Sinh tệp** | hợp đồng + hệ thiết kế | Từng tệp một, **mỗi tệp một lượt gọi model**, chỉ nạp hợp đồng chứ không nạp mã tệp khác |
| 5 | **Kiểm chứng** | cây tệp | Chạy `tsc` + `next build`; mở bằng chrome-devtools-mcp, chụp ảnh, đọc console. **Hỏng thì trả về bước 4 kèm lỗi nguyên văn.** |
| 6 | **Giao** | cây tệp đã qua kiểm | Tệp nén, hoặc đẩy thẳng lên kho Git của người dùng |

**Bước 4 sinh từng tệp một là cố ý.** Tra cứu về thất bại của tác tử sinh mã nói
thẳng: ngay cả cửa sổ một triệu token cũng không đủ cho kho mã thật, và **nhồi ngữ
cảnh bừa bãi còn làm giảm chất lượng suy luận**. Một tệp một lượt, chỉ mang theo
hợp đồng, là cách giữ mỗi lượt gọi nhỏ và tỉnh táo.

**Bước 5 là thứ phân biệt bản dùng được với bản trình diễn.** Thiếu nó thì hệ này
chỉ là một cỗ máy sinh mã hỏng nhanh hơn.

---

## 5 · Ba thứ KHÔNG nên làm

**Không dựng WebContainer trong trình duyệt** như bolt.new. Nó là cả một hệ thống
riêng, và Antigravity không có lợi thế gì ở đó. Sinh mã rồi đẩy sang Vercel/GitHub
là đường ngắn hơn nhiều.

**Không nhập cả 230 tác tử của nguồn #7.** Một trang web cần 5–6 vai. 230 vai làm
người dùng phải chọn giữa những thứ họ không phân biệt được, và làm chi phí mỗi
lượt chạy phình lên không lý do.

**Không để tác tử tự duyệt việc của nó.** Nguyên tắc này lấy nguyên từ playbook #2
và nó là lý do bước 5 phải là một module RIÊNG, không phải một đoạn tự kiểm nhét
trong bước 4.

---

## 6 · Hai đường truy cập — chủ dự án đã chốt 09/09

Chủ dự án phân định rõ, và cách phân định này đúng:

> *Subscription là để người trò chuyện và nhờ AI hỗ trợ trong việc tạo web/tạo nội
> dung. Còn API key chỉ đơn giản là để người dùng sử dụng các models để tự động tạo
> nội dung thôi.*

Tức là **hai đường song song**, không phải một đường thay đường kia:

| | Trả bằng | Dùng cho | Trạng thái |
|---|---|---|---|
| **Tự động** | Khoá API của người dùng (BYOK) | Chạy pipeline module sinh nội dung | Đã có, đang chạy |
| **Trò chuyện** | Gói thuê bao | Người dùng nói chuyện, nhờ dựng web / viết nội dung | Chưa có |

### ⚠️ Nhưng có một ràng buộc cứng, và phải biết trước khi viết dòng mã nào

Đã tra ngày 09/09/2026. **Antigravity KHÔNG được nhận đăng nhập thuê bao Claude của
người dùng.** Đây không phải chuyện kỹ thuật khó, mà là chuyện bị cấm:

> OAuth authentication used with Free, Pro, and Max plans is intended **exclusively
> for Claude Code and claude.ai**, and using OAuth tokens obtained through these
> accounts in any other product, tool, or service **constitutes a violation of
> Anthropic's Consumer Terms of Service.**

Anthropic bổ sung hẳn một chính sách riêng — *Authentication and Credential Use* —
vào tháng 02/2026. Và gói thuê bao trả phí **không bao gồm** quyền truy cập API.

Nghĩa là hướng "người dùng bấm đăng nhập Claude trong Antigravity rồi trò chuyện"
là **cửa đóng**. Không phải khó, là không được.

### Cửa đang mở, và nó tốt hơn

Cùng nguồn tra đó:

> Custom connectors using remote MCP **are available on Claude and Claude Desktop
> for users on Pro, Max, Team, and Enterprise plans.**

Nên đảo chiều lại: **thay vì kéo người dùng vào Antigravity để trò chuyện, đưa
Antigravity vào chỗ người dùng đang trò chuyện.**

Antigravity dựng một **máy chủ MCP từ xa**, phơi ra chính các module đã có dưới
dạng công cụ. Người dùng vào Claude của họ, thêm connector, rồi nói chuyện bình
thường — và Claude gọi được sang Antigravity.

Đối chiếu với điều chủ dự án muốn:

- Trò chuyện **trả bằng thuê bao** ✓ — vì cuộc trò chuyện diễn ra trong ứng dụng
  của Anthropic, đúng nơi thuê bao được phép dùng.
- Tự động **trả bằng khoá API** ✓ — pipeline vẫn chạy như cũ, không đổi gì.
- Người dùng **không phải cắm khoá API để trò chuyện** ✓ — đúng cái rào cản chủ dự
  án muốn bỏ.
- **Không vi phạm điều khoản nào** ✓.

Và nó rẻ hơn hẳn cho Antigravity: không phải dựng giao diện chat, không phải nuôi
lịch sử hội thoại, không phải trả tiền token cho phần trò chuyện.

**Việc phải làm:** thêm một điểm cuối MCP từ xa (`/api/mcp`), phơi các module hiện
có thành tool, dùng lại đúng lớp xác thực OAuth đã dựng cho Google. Đây là công
việc nhỏ hơn nhiều so với dựng một trợ lý trò chuyện trong ứng dụng.

## 7 · Phạm vi bản đầu — chủ dự án đã chốt

**Trang tĩnh nhiều mục**: trang giới thiệu / landing nhiều mục, có form liên hệ,
không có cơ sở dữ liệu.

Chọn đúng, vì đây là phạm vi duy nhất mà **bước 5 kiểm chứng được trọn vẹn**:
`tsc` + `next build` + mở bằng chrome-devtools-mcp chụp ảnh và đọc console là đủ
biết trang chạy hay không. Một ứng dụng có cơ sở dữ liệu thì phải dựng cả CSDL tạm
mới kiểm được, và chốt kiểm chứng — thứ quan trọng nhất của cả hệ — sẽ thành thứ
làm dối.

## 8 · Việc còn phải quyết

1. **Nguồn #5 (horizonx) và #11 (contentcore) đều là dịch vụ trả tiền hằng tháng.**
   Không dùng được nếu không mua. Cần biết chủ dự án đã có tài khoản chưa.
2. **Thứ tự làm**: máy chủ MCP trước hay pipeline sinh mã trước? MCP nhỏ hơn và mở
   ngay được cửa trò chuyện; pipeline là phần lõi nhưng lâu hơn.
