# Trang Khám phá & Hồ sơ Freelancer (khách hàng)

Mô tả các thông tin hiển thị trên hai màn hình công khai (không cần đăng nhập), dữ liệu lấy từ Freelancer Profile API (`/api/v1`). Chỉ freelancer có `ApprovalStatus = Approved` xuất hiện.

| Màn hình | Route | Component | API |
| --- | --- | --- | --- |
| Khám phá đối tác | `/discover` | `CustomerDiscoveryPage` | `GET /freelancers` |
| Hồ sơ freelancer | `/discover/:providerId` | `CustomerProviderPage` | `GET /freelancers/{providerId}` |

Không bao giờ hiển thị: số điện thoại, CCCD, ngày sinh, địa chỉ cư trú, ảnh KYC.

---

## 1. Trang Khám phá — `/discover`

URL ví dụ: `/discover?serviceCode=CLEANING&city=Hồ Chí Minh&minRating=4.5&acceptingBookings=true&page=1`
Tham số `sort=nearby` trong URL cũ không còn tác dụng: API chỉ sắp xếp theo `averageRating` giảm dần, rồi `completedBookingCount` giảm dần.

### 1.1 Bộ lọc (đồng bộ lên query string)

| Thành phần | Tham số URL / API | Ghi chú |
| --- | --- | --- |
| Dịch vụ (select) | `serviceCode` | 12 mã: `CLEANING`, `DEEP_CLEANING`, `COOKING`, `LAUNDRY`, `CHILDCARE`, `ELDERLY_CARE`, `AC_SERVICE`, `ELECTRICAL`, `PLUMBING`, `MOVING`, `GARDENING`, `PEST_CONTROL`. Mặc định "Tất cả dịch vụ". |
| Thành phố (input) | `city` | Khớp chính xác, ví dụ `Hồ Chí Minh`. |
| Quận / Huyện (input) | `district` | Khớp chính xác, ví dụ `Quận 1`. Nên dùng kèm `city`. |
| Chip "Đánh giá 4.5★ trở lên" | `minRating=4.5` | Bật/tắt. |
| Chip "Đang nhận đơn" | `acceptingBookings=true` | Bật/tắt. |
| Phân trang | `page` (từ 1), `pageSize` = 12 | Đổi bộ lọc thì reset về trang 1. |

### 1.2 Thẻ freelancer (mỗi phần tử trong `items`)

| Thông tin hiển thị | Trường API | Quy tắc hiển thị |
| --- | --- | --- |
| Avatar chữ cái đầu | `displayName` | Lấy 2 chữ cuối của tên, viết hoa. Chưa có ảnh đại diện. |
| Tên | `displayName` | |
| Nhãn "Freelancer" | — | Cố định. |
| Trạng thái nhận đơn | `isAcceptingBookings` | `true` → "Đang nhận đơn" (xanh); `false` → "Tạm nghỉ". |
| Kinh nghiệm | `experienceYears` | "N năm kinh nghiệm". |
| Số ca hoàn thành | `completedBookingCount` | "N ca hoàn thành". |
| Điểm đánh giá | `averageRating` (0–5) và `ratingCount` | Dạng `4.8 (42)`. |
| Giới thiệu ngắn | `bio` | Tối đa 2 dòng; ẩn nếu `null`. |
| Chip dịch vụ | `serviceCodes[]` | Đổi mã sang tên tiếng Việt (ví dụ `CLEANING` → "Dọn dẹp nhà cửa"). |
| Dòng trạng thái | `isAcceptingBookings` | "Đang nhận đặt lịch" / "Hiện chưa nhận đặt lịch". |
| Giá từ | `minHourlyRateVnd` | Định dạng VNĐ + "/giờ"; `null` → "Liên hệ". |
| Nút "Xem hồ sơ" | `providerId` | Đi tới `/discover/{providerId}`. |
| Nút "Đặt lịch" | `providerId` | Chỉ hiện khi `isAcceptingBookings = true`; cùng link tới hồ sơ. |

### 1.3 Chân danh sách

- Văn bản "Hiển thị {từ}–{đến} trong {totalItems} đối tác".
- Nút trang trước / sau và "trang hiện tại / `totalPages`"; vô hiệu hóa ở trang đầu / cuối.

### 1.4 Trạng thái màn hình

| Trạng thái | Hiển thị |
| --- | --- |
| Đang tải lần đầu | "Đang tải danh sách đối tác..." |
| Đang tải lại khi đổi bộ lọc | Danh sách cũ mờ đi (giữ dữ liệu cũ). |
| Lỗi | Khối đỏ với thông báo lỗi (`ProblemDetails`). |
| Không có kết quả | "Không tìm thấy đối tác phù hợp với bộ lọc hiện tại." |

### 1.5 Nội dung tĩnh (không từ API)

Tiêu đề trang, dải cam kết (xác minh danh tính, hồ sơ được duyệt, đánh giá thực tế, bảo mật thông tin) và khối "Quy chuẩn an toàn ABSTRICT".

---

## 2. Trang Hồ sơ freelancer — `/discover/:providerId`

`providerId` là GUID lấy từ danh sách.

### 2.1 Khối thông tin chung

| Thông tin | Trường API | Ghi chú |
| --- | --- | --- |
| Avatar chữ cái đầu | `displayName` | |
| Tên | `displayName` | Tiêu đề trang. |
| Trạng thái | `isAcceptingBookings` | "Đang nhận đặt lịch" / "Tạm nghỉ nhận đơn". |
| Điểm đánh giá | `averageRating`, `ratingCount` | `4.8 (42 đánh giá)`. |
| Số ca hoàn thành | `completedBookingCount` | |
| Kinh nghiệm | `experienceYears` | "N năm kinh nghiệm". |
| Giới thiệu | `bio` | Ẩn nếu `null`. |
| Giới tính | `gender` | Có trong API (`Female`...), hiện chưa hiển thị. |

### 2.2 Dịch vụ & bảng giá (`services[]`)

Mỗi dịch vụ là một lựa chọn (chọn một): `name`, `description` (ẩn nếu `null`), `hourlyRateVnd` + "/giờ". Mặc định chọn dịch vụ đầu tiên. Danh sách rỗng → "Đối tác chưa mở dịch vụ nào."

### 2.3 Khu vực phục vụ (`serviceAreas[]`)

Mỗi khu vực: `district`, `city`, `wardOrComplex` (ẩn nếu `null`), `travelRadiusKm` ("Bán kính di chuyển N km"). Rỗng → "Đối tác chưa cập nhật khu vực phục vụ."

### 2.4 Thời gian đặt ca (người dùng nhập)

| Trường | Quy tắc |
| --- | --- |
| Ngày làm | Không cho chọn ngày quá khứ. |
| Giờ bắt đầu / kết thúc | Khoảng giờ liên tục tối thiểu 2 giờ; sai thì báo đỏ. |

### 2.5 Phiếu đặt trước (cột bên phải)

- Ngày và khung giờ đã chọn, số giờ.
- Tên dịch vụ đã chọn × số giờ, **tổng tạm tính** = `hourlyRateVnd × số giờ`. Giá cuối do server xác nhận.
- Nút "Tiếp tục đặt lịch": chỉ bật khi đã chọn dịch vụ, có ngày, khung giờ hợp lệ và `isAcceptingBookings = true`. Bấm sẽ đi tới `/book/{providerId}` kèm `date`, `startTime`, `endTime`, `serviceCode`.
- Nếu không nhận đơn: "Đối tác hiện chưa nhận đặt lịch."

### 2.6 Trạng thái màn hình

| Trạng thái | Hiển thị |
| --- | --- |
| Đang tải | "Đang tải hồ sơ đối tác..." |
| 404 `FREELANCER_NOT_FOUND` | "Không tìm thấy hồ sơ đối tác này hoặc hồ sơ chưa được duyệt." Kèm link về danh sách. |
| `providerId` không phải GUID | API trả 404 không body; hiển thị thông báo lỗi chung. |
| Lỗi khác | Thông báo lỗi từ `ProblemDetails`. |

---

## 3. Chưa có dữ liệu từ API (không hiển thị)

Ảnh đại diện, ảnh công việc, đánh giá chi tiết của khách, lịch rảnh theo ngày, khoảng cách tới khách, địa chỉ khách hàng, phương thức thanh toán. Khi backend bổ sung, cập nhật tài liệu này.

## 4. Mã nguồn liên quan

- `src/features/customer/api/freelancers.ts` — kiểu dữ liệu, gọi API, nhãn dịch vụ.
- `src/features/customer/components/ProviderCard.tsx` — thẻ freelancer.
- `src/pages/customer/CustomerDiscoveryPage.tsx`, `src/pages/customer/CustomerProviderPage.tsx`.
