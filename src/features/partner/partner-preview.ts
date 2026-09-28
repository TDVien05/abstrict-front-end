export const previewPlans = [
  { id: 'week', name: 'Gói Nổi bật 7 Ngày', duration: '7 ngày', price: 49000, caption: 'Linh hoạt theo tuần', benefits: ['Gắn nhãn “Được tài trợ” trên thẻ hồ sơ', 'Tăng hiển thị trong khu vực nhận ca', 'Báo cáo lượt xem và lượt mở hồ sơ'] },
  { id: 'month', name: 'Gói Nổi bật 30 Ngày', duration: '30 ngày', price: 149000, caption: 'Chuyên nghiệp theo tháng', benefits: ['30 ngày tăng hiển thị liên tục', 'Gắn nhãn “Được tài trợ” trên thẻ hồ sơ', 'Tiếp cận khách hàng tìm dịch vụ định kỳ'] },
]

export const orderStatuses = { pending: 'Chờ bạn xác nhận', confirmed: 'Đã xác nhận & Sắp tới', active: 'Đang thực hiện', completed: 'Đã hoàn thành', cancelled: 'Đã từ chối / Hủy' } as const
export type PartnerOrderStatus = keyof typeof orderStatuses
export interface PartnerOrder {
  id: string; customer: string; initials: string; rating: string; date: string; time: string; address: string; area: string; distance: string; service: string; tasks: string[]; note: string; base: number; extra: number; deposit: number; total: number; deadline: string; status: PartnerOrderStatus
}
export const previewOrders: PartnerOrder[] = [
  { id: 'AB-2894', customer: 'Chị Hoàng Yến', initials: 'HY', rating: '4.95 · 38 ca', date: '2026-10-28', time: '08:30 – 12:30 · 4 giờ', address: 'Căn 14.08, Tháp Aqua 2', area: 'Vinhomes Golden River, Bến Nghé, Quận 1', distance: '2.3 km', service: 'Dọn dẹp nhà tiêu chuẩn + Vệ sinh bếp sâu & ủi đồ', tasks: ['Hút bụi, lau sàn phòng khách & 2 phòng ngủ', 'Vệ sinh mặt bếp, lò vi sóng, hút mùi', 'Cọ rửa và khử khuẩn 2 nhà vệ sinh', 'Ủi 5 áo sơ mi công sở'], note: 'Nhà có một bé cún Poodle nhỏ rất hiền. Chị để chìa khóa và thẻ thang máy tại quầy lễ tân tầng G.', base: 320000, extra: 80000, deposit: 60000, total: 400000, deadline: '2026-10-27T10:00:00+07:00', status: 'pending' },
  { id: 'AB-2901', customer: 'Anh Minh Trí', initials: 'MT', rating: '5.0 · 12 ca', date: '2026-10-29', time: '14:00 – 17:00 · 3 giờ', address: 'Căn hộ Diamond Island', area: 'Đảo Kim Cương, TP. Thủ Đức', distance: '4.1 km', service: 'Dọn căn hộ 2 phòng ngủ', tasks: ['Hút bụi và lau sàn', 'Vệ sinh bếp và phòng tắm'], note: 'Vui lòng liên hệ lễ tân khi đến.', base: 240000, extra: 0, deposit: 36000, total: 240000, deadline: '2026-10-27T10:13:00+07:00', status: 'pending' },
]
