# Feature boundaries

Mỗi thư mục feature sở hữu UI, hooks, API adapters và kiểu dữ liệu chỉ dùng trong nghiệp vụ đó. Chỉ đưa kiểu sang `src/entities` khi có ít nhất hai feature cùng dùng.

Ảnh và asset chỉ phục vụ một feature đặt trong `assets/` của feature đó. Chỉ đưa brand asset hoặc tài nguyên dùng lại qua nhiều feature vào `src/shared/assets`; không đặt asset runtime ở root repo.

- `auth`: phiên đăng nhập và actor hiện tại.
- `profiles`: hồ sơ freelancer/công ty và KYC.
- `discovery`: tìm kiếm, lọc và phân trang đối tác.
- `availability`: lịch rảnh/bận của freelancer và chọn ca tối thiểu hai giờ.
- `booking`: tạo đơn, trạng thái, checklist, QR, ảnh, gia hạn và nghiệm thu.
- `payments`: trạng thái cọc/hoàn tiền; không tự tính tiền phía client.
- `promotions`: gói tăng hiển thị và thống kê tài trợ.
- `ratings`: đánh giá hai chiều và thời điểm công bố.
- `disputes`: khiếu nại, bằng chứng, quyết định và xem xét lại.
- `admin`: quy trình duyệt hồ sơ và thao tác quản trị.

Không tạo barrel `index.ts` bao phủ toàn bộ feature. Import trực tiếp module cần dùng để giữ dependency graph rõ ràng.
