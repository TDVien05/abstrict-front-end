export const services = [
  {
    icon: 'home',
    title: 'Dọn dẹp căn hộ',
    description: 'Hút bụi, lau sàn, sắp xếp không gian sống ngăn nắp sạch sẽ.',
  },
  {
    icon: 'flask',
    title: 'Vệ sinh bếp & toilet',
    description: 'Tẩy dầu mỡ, cọ rửa bồn cầu, vòi sen và khử khuẩn chuyên sâu.',
  },
  {
    icon: 'receipt',
    title: 'Giặt ủi & sắp xếp',
    description: 'Giặt đồ, phơi, ủi quần áo và sắp xếp gọn gàng vào tủ.',
  },
  {
    icon: 'calendar',
    title: 'Dọn dẹp định kỳ',
    description: 'Duy trì căn hộ luôn tinh tươm theo tuần hoặc theo tháng cố định.',
  },
] as const

export const partners = [
  {
    initials: 'TH',
    name: 'Chị Nguyễn Thu Hà',
    type: 'Freelancer độc lập',
    location: 'Bình Thạnh & Vinhomes',
    statusLabel: 'Lịch rảnh:',
    status: 'Hôm nay 14:00 - 18:00',
    badge: 'Đề xuất',
    company: false,
    footerLabel: 'Mức giá ca',
    footerValue: '80.000đ',
    footerSuffix: '/giờ',
    action: 'Xem hồ sơ',
  },
  {
    initials: 'MT',
    name: 'Anh Trần Minh Trí',
    type: 'Freelancer độc lập',
    location: 'Quận 2 & TP. Thủ Đức',
    statusLabel: 'Lịch rảnh:',
    status: 'Ngày mai từ 08:30',
    badge: undefined,
    company: false,
    footerLabel: 'Mức giá ca',
    footerValue: '85.000đ',
    footerSuffix: '/giờ',
    action: 'Xem hồ sơ',
  },
  {
    initials: 'ATH',
    name: 'Công ty TNHH An Tâm Home',
    type: 'Công ty đối tác',
    location: 'Toàn khu vực TP.HCM',
    statusLabel: 'Trạng thái:',
    status: 'Nhận yêu cầu linh hoạt (Tự phân công nhân sự)',
    badge: 'Doanh nghiệp',
    footerLabel: 'Hình thức',
    footerValue: 'Theo hợp đồng ca',
    footerSuffix: undefined,
    action: 'Gửi yêu cầu đặt lịch',
    company: true,
  },
] as const

export const bookingModes = [
  {
    id: 'tasks',
    label: 'Theo đầu việc',
    shortDescription: 'Chọn chính xác những hạng mục bạn muốn hoàn thành.',
    title: 'Bạn kiểm soát rõ từng việc cần làm',
    description: 'Phù hợp khi đã biết khu vực hoặc công việc cần ưu tiên trong lần đặt này.',
    highlights: ['Tự chọn hạng mục', 'Thêm ghi chú riêng', 'Theo dõi bằng checklist'],
  },
  {
    id: 'time',
    label: 'Theo thời lượng',
    shortDescription: 'Chọn khoảng thời gian, đối tác hỗ trợ sắp xếp công việc.',
    title: 'Linh hoạt theo quỹ thời gian của bạn',
    description: 'Phù hợp khi bạn muốn đặt một ca hỗ trợ và thống nhất thứ tự ưu tiên cùng đối tác.',
    highlights: ['Chủ động khung giờ', 'Trao đổi ưu tiên', 'Xác nhận trước khi bắt đầu'],
  },
  {
    id: 'recurring',
    label: 'Theo lịch định kỳ',
    shortDescription: 'Duy trì không gian đều đặn theo lịch phù hợp.',
    title: 'Tạo nhịp chăm sóc ổn định lâu dài',
    description: 'Phù hợp với nhu cầu lặp lại theo tuần hoặc theo lịch riêng của gia đình.',
    highlights: ['Chọn lịch lặp lại', 'Ưu tiên đối tác quen', 'Điều chỉnh khi cần'],
  },
] as const

export const bookingSteps = [
  {
    number: '01',
    title: 'Chọn đầu việc & ghi chú',
    description: 'Chọn các hạng mục dọn dẹp cần làm, thêm lưu ý riêng về thú cưng hoặc dụng cụ gia đình sẵn có.',
  },
  {
    number: '02',
    title: 'Chọn người làm và giờ phù hợp',
    description: 'Chọn freelancer có slot giờ rảnh khớp với bạn hoặc gửi ca cho công ty đối tác để điều phối nhân sự.',
  },
  {
    number: '03',
    title: 'Xem giá, đặt cọc và xác nhận',
    description: 'Giá ca minh bạch, ký quỹ cọc 15% an toàn để giữ lịch hẹn chắc chắn mà không phát sinh thêm phí.',
  },
] as const

export const workflowSteps = [
  {
    title: 'Check-in bằng QR',
    description: 'Khách hàng đưa mã QR trên ứng dụng, người làm quét để xác nhận đúng người đến đúng giờ.',
  },
  {
    title: 'Thực hiện checklist & chụp ảnh',
    description: 'Người làm hoàn thành từng hạng mục và cập nhật ảnh chụp trước/sau căn hộ ngay trên hệ thống.',
  },
  {
    title: 'Nghiệm thu & hoàn tất',
    description: 'Khách kiểm tra căn hộ thực tế, hài lòng và xác nhận hoàn tất ca dọn trực tiếp.',
  },
] as const

export const workflowChecklist = [
  { id: 'floor', title: 'Hút bụi và lau sàn', detail: 'Phòng khách, phòng ngủ và lối đi' },
  { id: 'bathroom', title: 'Vệ sinh khu vực phòng tắm', detail: 'Lavabo, gương và khu vực tắm' },
  { id: 'kitchen', title: 'Làm sạch bề mặt bếp', detail: 'Mặt bếp, bồn rửa và khu vực nấu' },
  { id: 'handover', title: 'Chụp ảnh và bàn giao', detail: 'Cập nhật bằng chứng hoàn thành ca' },
] as const

export const trustPillars = [
  {
    icon: 'shield',
    accent: 'green',
    title: 'Đối tác được xét duyệt',
    description: 'Xác minh nhân thân, định danh CCCD và đánh giá tay nghề trước khi được nhận ca.',
  },
  {
    icon: 'clipboard',
    accent: 'purple',
    title: 'Đầu việc & giá hiển thị trước',
    description: 'Biết rõ checklist công việc và tổng chi phí minh bạch trước khi bấm xác nhận đặt lịch.',
  },
  {
    icon: 'support',
    accent: 'charcoal',
    title: 'Kênh hỗ trợ khi phát sinh',
    description: 'Có cổng tiếp nhận phản hồi và xử lý khiếu nại minh bạch, bảo vệ quyền lợi cả hai bên.',
  },
] as const

export const faqs = [
  {
    question: 'Tôi có thể chọn thời gian làm việc không?',
    answer: 'Có, với freelancer bạn có thể chọn trực tiếp trong các khoảng giờ rảnh của họ (ca tối thiểu 2 giờ). Với công ty, bạn chọn thời gian mong muốn và công ty sẽ phân bổ nhân sự phù hợp.',
  },
  {
    question: 'Nếu cần hủy lịch thì sao?',
    answer: 'Bạn được hủy miễn phí trước giờ làm ít nhất 2 giờ. Nếu hủy sát giờ (< 2 giờ), hệ thống sẽ hiển thị rõ khoản tiền được hoàn hoặc giữ theo chính sách trước khi bạn xác nhận.',
  },
  {
    question: 'Người làm đến nơi check-in như thế nào?',
    answer: 'Khi người làm đến căn hộ, bạn chỉ cần mở màn hình chi tiết đơn và đưa mã QR để người làm quét xác nhận bắt đầu ca làm việc.',
  },
] as const
