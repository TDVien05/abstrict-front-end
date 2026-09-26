# ABSTRICT — Quy tắc typography và bố cục

Tài liệu này là nguồn thống nhất cho cách trình bày mọi màn hình ABSTRICT: public, customer, partner và admin. Quy tắc áp dụng cho cả màn hình có form, danh sách, bảng dữ liệu hoặc dashboard.

## 1. Phong cách chung

- Editorial tối giản: nền trắng ngà `#FAFAF8`, chữ gần đen `#17191C`, thông tin phụ `#667085`.
- Dùng khoảng trắng và thứ bậc chữ để phân nhóm trước khi dùng đường viền, badge hoặc icon.
- Nội dung chính căn trái. Đoạn văn giữ chiều rộng vừa phải; không kéo dài toàn bộ viewport.
- Nút hành động phải dễ thấy nhưng không lớn hoặc đậm hơn tiêu đề trang.
- Hạn chế chữ in hoa toàn bộ, tracking rộng, dòng chữ dưới 14px, icon trang trí và card có viền ở mọi phía.

## 2. Font và thang chữ

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

## 3. Khoảng cách và bố cục

- Content desktop rộng tối đa `1200px`, padding ngang `24px`.
- Section chính dùng `content-section`: khoảng cách dọc responsive từ `80px` đến `112px`.
- Đoạn giới thiệu cách tiêu đề trang khoảng `24px`; nội dung chính bắt đầu sau header trang `48–64px`.
- Tiêu đề mục phải tách rõ với mục trước; ưu tiên tăng khoảng trắng thay vì thêm divider.
- Mobile giảm tiêu đề bằng `clamp()`, giữ padding ngang tối thiểu `24px` và không nén line-height.

## 4. Form, danh sách và dashboard

- Label dùng sentence case, không dùng uppercase/tracking rộng.
- Chỉ dùng badge khi biểu đạt trạng thái hoặc tài trợ; không dùng làm trang trí.
- Chỉ dùng icon khi giúp nhận diện hành động/trạng thái; luôn có label văn bản khi ý nghĩa không hiển nhiên.
- Card dữ liệu có thể dùng nền khác nhẹ hoặc khoảng cách; chỉ thêm border khi cần phân tách hoặc thể hiện affordance.
- Dashboard vẫn dùng tiêu đề trang lớn và phần giới thiệu ngắn trước các widget; số liệu không thay thế hierarchy của trang.
- Text phụ dùng `#667085`, nhưng phải giữ độ tương phản và cỡ chữ đọc được.

## 5. Kiểm tra trước khi bàn giao

- Xác nhận font thực tế trong browser là `Nunito Sans Variable`.
- Kiểm tra heading ở desktop và mobile không tràn, không có từ đơn lẻ khó đọc ở dòng cuối.
- Kiểm tra trang không tràn ngang tại 390px.
- Rà lại uppercase, badge, icon và border; mỗi phần tử còn lại phải có mục đích rõ ràng.
