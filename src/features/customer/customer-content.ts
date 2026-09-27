import leDuyImage from './assets/le-duy.jpg'
import maiLanAnhImage from './assets/mai-lan-anh.jpg'

export interface ProviderSummary {
  id: string
  name: string
  kind: 'company' | 'freelancer'
  subtitle: string
  rating: number
  reviews: number
  location: string
  skills: string[]
  availability: string
  price: number
  priceUnit: string
  image?: string
  initials?: string
  accent?: 'blue' | 'emerald'
  badge: string
}

// Stitch-derived fixture data. Replace with the customer discovery OpenAPI projection when available.
export const providers: ProviderSummary[] = [
  {
    id: 'mai-lan-anh',
    name: 'Chị Mai Lan Anh',
    kind: 'freelancer',
    subtitle: 'Freelancer · 5 năm kinh nghiệm',
    rating: 4.9,
    reviews: 148,
    location: 'Vinhomes Grand Park, TP. Thủ Đức',
    skills: ['Dọn tiêu chuẩn', 'Ủi đồ', 'Thân thiện thú cưng'],
    availability: 'Rảnh từ 14:30 hôm nay',
    price: 80000,
    priceUnit: '/giờ',
    image: maiLanAnhImage,
    badge: 'Pro 5★',
  },
  {
    id: 'an-tam-home',
    name: 'An Tâm Home Services',
    kind: 'company',
    subtitle: 'Công ty dịch vụ · 45+ nhân sự',
    rating: 4.8,
    reviews: 340,
    location: 'Phủ sóng toàn khu Đông TP.HCM',
    skills: ['Hóa đơn VAT', 'Đổi thợ ngay', 'Hợp đồng pháp nhân'],
    availability: 'Điều phối nhanh trong 15 phút',
    price: 95000,
    priceUnit: '/giờ',
    initials: 'AT',
    accent: 'blue',
    badge: 'Doanh nghiệp',
  },
  {
    id: 'le-duy',
    name: 'Anh Lê Duy',
    kind: 'freelancer',
    subtitle: 'Freelancer · 4 năm kinh nghiệm',
    rating: 4.92,
    reviews: 118,
    location: 'Thảo Điền · Cách 2,5 km',
    skills: ['Vệ sinh kính', 'Hút bụi sofa', 'Máy chuyên dụng'],
    availability: 'Trống lịch 15:00 – 19:00',
    price: 85000,
    priceUnit: '/giờ',
    image: leDuyImage,
    badge: 'Chuyên sâu',
  },
  {
    id: 'green-clean',
    name: 'GreenClean Vietnam',
    kind: 'company',
    subtitle: 'Công ty dịch vụ · 50+ nhân viên',
    rating: 4.9,
    reviews: 512,
    location: 'Phủ sóng toàn TP. Thủ Đức',
    skills: ['Hút bụi Kärcher', 'Hóa đơn VAT', 'Khử khuẩn sinh học'],
    availability: 'Tiếp nhận ngay trong 10 phút',
    price: 110000,
    priceUnit: '/gói',
    initials: 'GC',
    accent: 'emerald',
    badge: 'Tiêu chuẩn cao',
  },
  {
    id: 'hoang-yen',
    name: 'Chị Hoàng Yến',
    kind: 'freelancer',
    subtitle: 'Freelancer · Nấu ăn gia đình & tủ áo',
    rating: 4.95,
    reviews: 86,
    location: 'Masteri Thảo Điền, TP. Thủ Đức',
    skills: ['Dọn nhà', 'Nấu ăn gia đình', 'Sắp xếp tủ áo'],
    availability: 'Rảnh chiều mai từ 13:00',
    price: 90000,
    priceUnit: '/giờ',
    initials: 'HY',
    accent: 'blue',
    badge: 'Top đánh giá',
  },
  {
    id: 'tran-thi-bich',
    name: 'Cô Trần Thị Bích',
    kind: 'freelancer',
    subtitle: 'Freelancer · 8 năm kinh nghiệm',
    rating: 4.88,
    reviews: 94,
    location: 'Vinhomes Grand Park · Cách 1,2 km',
    skills: ['Lau sàn gỗ', 'Khử trùng sinh học', 'Dung dịch an toàn'],
    availability: 'Rảnh từ 15:30 hôm nay',
    price: 75000,
    priceUnit: '/giờ',
    initials: 'TB',
    accent: 'emerald',
    badge: 'Kinh nghiệm',
  },
]

export const servicePackages = [
  { id: 'standard', name: 'Dọn dẹp tiêu chuẩn', description: 'Quét hút bụi, lau sàn, dọn rác, bếp cơ bản và vệ sinh toilet.', price: 80000, popular: true },
  { id: 'deep', name: 'Tổng vệ sinh chuyên sâu', description: 'Tẩy cặn kính, vệ sinh ban công và bề mặt tủ trên cao.', price: 100000 },
  { id: 'cooking', name: 'Nấu ăn gia đình', description: 'Nấu 2–3 món theo khẩu vị, sơ chế và dọn rửa khu vực bếp.', price: 90000 },
]

export const bookingChecklist = [
  { area: 'Phòng khách & Ban công', icon: 'sofa', items: ['Hút bụi kỹ sofa nệm vải', 'Lau sàn gạch & chân len tường', 'Lau sạch bàn trà & kệ TV', 'Thu gom, phân loại rác ban công'] },
  { area: 'Nhà bếp & Bàn ăn', icon: 'kitchen', items: ['Vệ sinh mặt bếp điện từ & tường ốp', 'Rửa chén bát tồn & úp ráo giá', 'Lau mặt ngoài tủ lạnh & lò vi sóng'] },
  { area: 'Phòng ngủ Master', icon: 'bed', items: ['Thay bộ drap giường mới', 'Hút bụi chân giường & các góc phòng'] },
  { area: 'Nhà tắm & Vệ sinh', icon: 'bath', items: ['Cọ rửa khử khuẩn bồn cầu', 'Gạt nước, lau trong vách kính buồng tắm', 'Thay khăn tắm mới và lau khô lavabo'] },
]

export { maiLanAnhImage }
