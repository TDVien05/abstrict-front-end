# ABSTRICT — Quy tắc typography, màu sắc và bố cục

Tài liệu này là nguồn thống nhất cho cách trình bày mọi màn hình ABSTRICT: public, customer, partner và admin. Quy tắc áp dụng cho cả màn hình có form, danh sách, bảng dữ liệu hoặc dashboard.

## 1. Phong cách chung

- Editorial tối giản: nền trắng ngà `#FAFAF8`, chữ gần đen `#17191C`, thông tin phụ `#667085`.
- Dùng khoảng trắng và thứ bậc chữ để phân nhóm trước khi dùng đường viền, badge hoặc icon.
- Nội dung chính căn trái. Đoạn văn giữ chiều rộng vừa phải; không kéo dài toàn bộ viewport.
- Nút hành động phải dễ thấy nhưng không lớn hoặc đậm hơn tiêu đề trang.
- Hạn chế chữ in hoa toàn bộ, tracking rộng, dòng chữ dưới 14px, icon trang trí và card có viền ở mọi phía.

## 2. Màu sắc và accent

Accent duy nhất của sản phẩm là **họ xanh pastel**. Mọi màn hình mới — public, customer, partner và admin — dùng họ này cho hành động chính, link, tiêu điểm và trạng thái nhấn. **Không dùng tím.**

| Vai trò | Token Tailwind | Mã màu |
| --- | --- | --- |
| Nền trang | `brand-sand` | `#FAFAF8` |
| Bề mặt (card, form) | `white` | `#FFFFFF` |
| Chữ chính | `brand-charcoal` | `#17191C` |
| Chữ phụ | `brand-muted` | `#667085` |
| Viền | `brand-border` | `#EBECEF` |
| Accent — hành động chính | `brand-blue-pastel` | `#9BCDF0` |
| Accent — hover | `brand-blue-pastel-hover` | `#82BDE7` |
| Accent — nền nhấn nhẹ, badge, ô thông tin | `brand-blue-pastel-soft` | `#EAF6FF` |
| Accent — chữ, link, icon nhấn | `brand-blue-ink` | `#245B7D` |
| Trạng thái thành công | `brand-green` | `#20A67A` |

- Hành động chính: nền `brand-blue-pastel`, chữ `brand-charcoal`, hover `brand-blue-pastel-hover`; trong code dùng `Button variant="blue"`.
- Link và chữ nhấn: `brand-blue-ink`. Không đặt chữ xanh pastel nhạt trên nền trắng vì không đủ tương phản.
- Nền nhấn nhẹ, badge phụ, ô thông tin: nền `brand-blue-pastel-soft` đi kèm chữ `brand-blue-ink`.
- Tiêu điểm/focus: viền `brand-blue-pastel-hover`, ring `brand-blue-pastel`.
- Trạng thái thành công dùng `brand-green`; lỗi/cảnh báo dùng đỏ và amber hiện có.
- Tím đã **ngừng dùng** cho UI mới: `brand-purple`, `brand-purple-hover` và thang `brand-50`…`brand-900` (đều là sắc tím) không được xuất hiện trên màn hình mới. Khi gặp trong code cũ, thay bằng token xanh tương ứng: `text-brand-purple` → `text-brand-blue-ink`; `accent-brand-purple` → `accent-brand-blue-pastel-hover`; viền/ring focus tím → `brand-blue-pastel-hover`/`brand-blue-pastel`; nền `brand-50` → `brand-blue-pastel-soft`.

## 3. Font và thang chữ

Toàn bộ sản phẩm dùng **Nunito Sans**, self-host từ package `@fontsource-variable/nunito-sans`; fallback là `sans-serif`. Font hỗ trợ tiếng Việt và dùng variable weight.

| Vai trò | Desktop | Mobile | Weight | Line height |
| --- | --- | --- | --- | --- |
| Tiêu đề trang | tối đa 68px | tối thiểu 40px | 600 | 1.08 |
| Đoạn giới thiệu trang | 18–22px | 18px | 400 | 1.65 |
| Tiêu đề mục | 32–44px | 32px | 600 | 1.18 |
| Nội dung giới thiệu mục | 18px | 18px | 400 | 1.7 |
| Body | 16px | 16px | 400 | 1.65 |
| Label / action | 14–16px | 14–16px | 600 tối đa | 1.4–1.5 |

- Tiêu đề dùng câu ngắn, sentence case, không viết hoa toàn bộ.
- Không dùng `font-bold`/700 theo mặc định cho heading; ưu tiên 600 để giữ nét editorial nhẹ.
- Tiêu đề trang giới hạn khoảng `16ch`; đoạn giới thiệu giới hạn khoảng `46rem`.
- Dùng các class chuẩn trong `src/shared/styles/index.css`: `page-title`, `page-intro`, `section-title`, `section-intro`.

## 4. Khoảng cách và bố cục

- Content desktop rộng tối đa `1200px`, padding ngang `24px`.
- Section chính dùng `content-section`: khoảng cách dọc responsive từ `80px` đến `112px`.
- Đoạn giới thiệu cách tiêu đề trang khoảng `24px`; nội dung chính bắt đầu sau header trang `48–64px`.
- Tiêu đề mục phải tách rõ với mục trước; ưu tiên tăng khoảng trắng thay vì thêm divider.
- Mobile giảm tiêu đề bằng `clamp()`, giữ padding ngang tối thiểu `24px` và không nén line-height.

## 5. Form, danh sách và dashboard

- Label dùng sentence case, không dùng uppercase/tracking rộng.
- Chỉ dùng badge khi biểu đạt trạng thái hoặc tài trợ; không dùng làm trang trí.
- Chỉ dùng icon khi giúp nhận diện hành động/trạng thái; luôn có label văn bản khi ý nghĩa không hiển nhiên.
- Card dữ liệu có thể dùng nền khác nhẹ hoặc khoảng cách; chỉ thêm border khi cần phân tách hoặc thể hiện affordance.
- Dashboard vẫn dùng tiêu đề trang lớn và phần giới thiệu ngắn trước các widget; số liệu không thay thế hierarchy của trang.
- Text phụ dùng `#667085`, nhưng phải giữ độ tương phản và cỡ chữ đọc được.
- Trạng thái nhấn trong form (checkbox, thanh tiến độ) dùng accent xanh pastel: `accent-brand-blue-pastel-hover`.

## 6. Kiểm tra trước khi bàn giao

- Xác nhận font thực tế trong browser là `Nunito Sans Variable`.
- Kiểm tra heading ở desktop và mobile không tràn, không có từ đơn lẻ khó đọc ở dòng cuối.
- Kiểm tra trang không tràn ngang tại 390px.
- Rà lại màu nhấn: màn hình mới không còn `brand-purple`, `brand-purple-hover` hoặc thang `brand-50`…`brand-900`; chỉ dùng họ xanh pastel ở mục 2.
- Rà lại uppercase, badge, icon và border; mỗi phần tử còn lại phải có mục đích rõ ràng.
