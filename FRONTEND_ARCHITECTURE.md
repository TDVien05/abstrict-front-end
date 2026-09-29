# ABSTRICT — Frontend architecture (React + Vite + Tailwind CSS)

**Tài liệu đi kèm:** `PROJECT_IDEA.md` là nguồn nghiệp vụ; `DESIGN_SYSTEM.md` là nguồn thống nhất cho typography và bố cục; `BACKEND_ARCHITECTURE.md` xác định hợp đồng API. Tài liệu này dành riêng cho repo frontend.

## 1. Nguyên tắc

React + Vite + TypeScript + Tailwind CSS. Cấu trúc theo **feature** và route, không dồn mọi thành phần vào `components/` chung. UI nhận dữ liệu và thông báo từ API, **server là nguồn sự thật** cho khả dụng lịch, báo giá, tiền, quyền và chuyển trạng thái. Không hard-code giá gói đang review hay tự công bố lời cam kết chưa chốt.

```text
src/
  app/                # router, providers, auth boundary, error boundary, layout
  pages/              # composition các route
  features/
    auth/ profiles/ discovery/ availability/ booking/
    payments/ promotions/ ratings/ disputes/ admin/
    landing/
      assets/          # ảnh chỉ dùng cho landing page
      components/
  entities/           # kiểu dữ liệu chung nếu thực sự tái sử dụng
  shared/
    assets/            # brand asset dùng lại ở nhiều feature/layout
    api/              # generated client, fetch wrapper, error mapping
    ui/               # Button, Card, Dialog, Field, Badge, Pagination
    lib/              # format VND, ngày giờ, validation UI
    styles/           # tailwind entry, design tokens
```

Mỗi feature có `components/`, `api/`, `hooks/`, `types/`, `assets/` khi cần; tránh file index xuất mọi thứ gây vòng phụ thuộc. Asset chỉ dùng cho một feature phải nằm trong feature đó; logo/brand asset thực sự dùng chung đặt tại `shared/assets`. Không để asset runtime rải ở root repo. `pages` ghép feature, không viết trực tiếp logic tính giá/phân chia tiền trong JSX.

## 2. Route và layout

| Layout | Route ví dụ | Nội dung |
| --- | --- | --- |
| Public | `/`, `/partners`, `/partners/register`, `/partners/register/freelancer`, `/partners/register/kyc`, `/partners/:id` | Landing, tìm kiếm, chọn hình thức đối tác, đăng ký freelancer, hồ sơ/KYC đối tác và lịch rảnh/bận |
| Customer | `/discover`, `/book/:providerId`, `/orders`, `/orders/:id` | Checklist, chọn giờ/giá, cọc, QR của khách, nghiệm thu, đánh giá, khiếu nại |
| Partner | `/partner/dashboard`, `/partner/schedule`, `/partner/orders/:id`, `/partner/plans` | Hồ sơ, lịch freelancer, nhận đơn, scanner QR, ảnh/checklist, gói và thống kê |
| Admin | `/admin/approvals`, `/admin/disputes` | Duyệt hồ sơ/KYC, quyết định khiếu nại |

Tách `PublicLayout`, `AppLayout`, `PartnerLayout`, `AdminLayout`; **topbar dùng một component chuẩn** với nội dung theo actor, tránh mỗi màn một header khác nhau. Route guard để điều hướng UX; BE vẫn kiểm quyền cuối cùng. Công ty không thấy form khai báo lịch freelancer.

## 3. Giao diện và tương tác trọng tâm

- Khám phá: một danh sách freelancer/công ty, bộ lọc và pagination liên kết URL (`page`, `pageSize`, `sort`, `location`, `service`, `date`), giữ lọc khi đổi trang; đổi lọc trở về trang 1. Hồ sơ tài trợ có nhãn rõ; không tách section trùng danh sách.
- Lịch freelancer: thanh chọn 7 ngày và chi tiết một ngày; thấy khoảng rảnh/bận; chỉ bấm khoảng rảnh **liên tục ≥ 2 giờ**. Popup/panel chọn giờ bắt đầu–kết thúc, hiển thị giá dự toán; xác nhận bằng báo giá và kiểm tra lại của BE. Nếu slot vừa bị lấy, báo và tải lại lịch.
- Booking: flow chọn việc + note → chọn giờ/người → báo giá → cọc → trạng thái. Khách xem QR ngắn hạn, worker dùng camera quét; chỉ hiện QR với booking đã xác nhận. Hủy hiện rõ số tiền sẽ hoàn/giữ lấy từ API.
- Gia hạn: hiện công việc/thời lượng/giá mới, hai bên xác nhận; trạng thái phản hồi, từ chối và lỗi xung đột lịch hiển thị riêng. Ảnh trước/sau gắn đầu việc, preview và quyền xem; nghiệm thu có nút xác nhận/làm rõ/khiếu nại.
- Gói: hiển thị giá và quyền lợi trả từ API, trạng thái/hiệu lực, nhãn tài trợ. Rating hai chiều giữ kín trước khi công bố; khiếu nại có timeline bằng chứng và tối đa một lần yêu cầu xem xét lại với bằng chứng mới.

## 4. State, API và forms

- Dùng **TanStack Query** cho server state (search, bookings, profile, plans, disputes); query keys có bộ lọc và actor. Mutation invalidate đúng dữ liệu; không lạc quan cập nhật giao dịch tiền, lịch đã chốt hay quyết định khiếu nại.
- Form dùng **React Hook Form + Zod** cho kiểm tra phía client và khả dụng; BE kiểm tra lại mọi điều kiện nghiệp vụ. Auth state gọn bằng context/store nhỏ, không sao chép toàn bộ dữ liệu server.
- HTTP client tạo từ OpenAPI BE khi có thể; response pagination, enums, `ProblemDetails.code` dùng kiểu dữ liệu thống nhất. Xử lý 401/403/409/422 và payment pending rõ ràng. Không lưu token dài hạn trong `localStorage` nếu chọn cookie HttpOnly; cơ chế auth phải khớp BE.
- Thời gian BE ở UTC, frontend format theo `Asia/Ho_Chi_Minh`; không so sánh chuỗi ngày giờ để quyết định hạn hủy. VND hiển thị qua `Intl.NumberFormat('vi-VN', {style:'currency', currency:'VND'})`, tiền do server tính.

## 5. Design system, accessibility và chất lượng

- Toàn bộ frontend dùng **Nunito Sans** self-host, theo thang chữ và semantic classes trong `DESIGN_SYSTEM.md`; không tự chọn font riêng theo feature hoặc route. Tiêu đề trang lớn, weight 600, câu ngắn, căn trái; đoạn giới thiệu lớn hơn body và có chiều rộng đọc thoải mái.
- Tailwind tokens dùng nền trắng ngà, chữ gần đen, nhấn xanh pastel ABSTRICT và màu trạng thái; spacing 4/8px. Ưu tiên khoảng trắng và hierarchy chữ; hạn chế uppercase, badge, icon trang trí, text quá nhỏ và border card không cần thiết.
- Nội dung chia nhóm rõ, text đủ đọc và khoảng trắng thoáng; responsive desktop/tablet/mobile, giảm heading theo `clamp()` thay vì nén line-height. Trạng thái loading, empty, error và success cho các trang dữ liệu. Dialog có quản lý focus, form có label sentence case, lịch có cách chọn bằng bàn phím và không chỉ dùng màu phân biệt rảnh/bận.
- Kiểm thử ít nhưng có giá trị: unit cho format và map lỗi, component cho lịch chọn ca ≥ 2 giờ, E2E cho tìm → booking → cọc sandbox và hủy/đổi lịch xảy ra xung đột; kiểm tra các breakpoint chính.

## 6. Hợp đồng phối hợp hai repo

1. Cả hai repo đặt bản sao cùng phiên bản `PROJECT_IDEA.md` trong `docs/`; một thay đổi nghiệp vụ phải cập nhật cả hai.
2. BE xuất OpenAPI `/api/v1`; FE generate/đồng bộ typed client trong CI hoặc lệnh repo, tránh tự đặt tên trạng thái khác.
3. Tạo fixture dữ liệu riêng cho 4 actor, freelancer có lịch chồng lấn, công ty không có slot, gói hết hạn, booking hủy và khiếu nại xem xét lại.
4. Quy định cuối cùng cho 85% còn lại, giá gói chính thức và các SLA chưa chốt phải được cập nhật tài liệu chung trước khi hoàn thiện UI và API tương ứng.
