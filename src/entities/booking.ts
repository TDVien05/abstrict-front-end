import { ApiError } from '../shared/api/problem-details'

export type BookingStatus =
  | 'PendingDeposit'
  | 'PendingProviderConfirmation'
  | 'Confirmed'
  | 'CheckedIn'
  | 'InProgress'
  | 'PendingAcceptance'
  | 'Completed'
  | 'Expired'
  | 'Rejected'
  | 'Cancelled'
  | 'Disputed'

export type PaymentStatus = 'Pending' | 'Processing' | 'Succeeded' | 'Failed' | 'Cancelled' | 'Refunded' | 'PartiallyRefunded'

export interface BookingTask {
  id: string
  areaName: string
  description: string
  sortOrder: number
  status: 'Pending' | 'InProgress' | 'Completed' | 'ClarificationRequested'
}

export interface BookingTimelineEntry {
  fromStatus: BookingStatus
  toStatus: BookingStatus
  reason: string | null
  note: string | null
  atUtc: string
}

export type BookingPhotoType = 'Before' | 'After' | 'Evidence'

export interface BookingPhoto {
  id: string
  type: BookingPhotoType
  bookingTaskId: string | null
  caption: string | null
  takenAtUtc: string
  uploadedByUserId: string
  /** Đường dẫn tuyệt đối trên server (đã gồm /api/v1), cần access token nên tải bằng ProtectedImage. */
  contentUrl: string
}

export const bookingPhotoTypeLabels: Record<BookingPhotoType, string> = {
  Before: 'Trước khi làm',
  After: 'Sau khi làm',
  Evidence: 'Bằng chứng',
}

export const bookingTaskStatusLabels: Record<BookingTask['status'], string> = {
  Pending: 'Chưa làm',
  InProgress: 'Đang làm',
  Completed: 'Đã xong',
  ClarificationRequested: 'Cần làm rõ',
}

export interface PagedResponse<T> {
  items: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export const bookingStatusLabels: Record<BookingStatus, string> = {
  PendingDeposit: 'Chờ đặt cọc',
  PendingProviderConfirmation: 'Chờ đối tác xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đã check-in',
  InProgress: 'Đang thực hiện',
  PendingAcceptance: 'Chờ nghiệm thu',
  Completed: 'Hoàn thành',
  Expired: 'Hết hạn',
  Rejected: 'Bị từ chối',
  Cancelled: 'Đã hủy',
  Disputed: 'Đang khiếu nại',
}

export const bookingStatusTones: Record<BookingStatus, 'blue' | 'green' | 'neutral' | 'purple' | 'yellow'> = {
  PendingDeposit: 'yellow',
  PendingProviderConfirmation: 'blue',
  Confirmed: 'green',
  CheckedIn: 'purple',
  InProgress: 'purple',
  PendingAcceptance: 'blue',
  Completed: 'green',
  Expired: 'neutral',
  Rejected: 'neutral',
  Cancelled: 'neutral',
  Disputed: 'yellow',
}

// Server sẽ thêm mã mới khi có các bước sau Confirmed; mã chưa biết rơi về tên trạng thái.
const timelineReasonLabels: Record<string, string> = {
  Created: 'Tạo đơn',
  DepositPaid: 'Đã đặt cọc, chờ đối tác xác nhận',
  AutoConfirmed: 'Đã đặt cọc, đối tác tự động nhận đơn',
  ProviderConfirmed: 'Đối tác xác nhận',
  ProviderRejected: 'Đối tác từ chối',
  CustomerCancelled: 'Khách hủy đơn',
  HoldExpired: 'Hết thời gian giữ chỗ',
  ConfirmationExpired: 'Đối tác không phản hồi kịp hạn',
  CheckedIn: 'Đối tác đã check-in',
  WorkStarted: 'Đối tác bắt đầu thực hiện ca',
  WorkFinished: 'Đối tác hoàn tất ca, chờ nghiệm thu',
  CustomerAcceptedWork: 'Khách đã nghiệm thu',
  CustomerDisputeOpened: 'Khách mở khiếu nại',
}

export function timelineLabel(entry: BookingTimelineEntry) {
  return (entry.reason && timelineReasonLabels[entry.reason]) || bookingStatusLabels[entry.toStatus]
}

// Chênh lệch giữa đồng hồ server và máy người dùng, để đếm ngược không sai khi máy lệch giờ.
export function clockOffsetOf(serverTimeUtc: string | undefined) {
  return serverTimeUtc ? Date.parse(serverTimeUtc) - Date.now() : 0
}

const bookingErrorMessages: Record<string, string> = {
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  INVALID_TIME_RANGE: 'Khung giờ không hợp lệ. Giờ phải theo bước 30 phút và kết thúc sau giờ bắt đầu.',
  DURATION_TOO_SHORT: 'Ca làm quá ngắn so với thời lượng tối thiểu.',
  DURATION_TOO_LONG: 'Ca làm vượt quá thời lượng tối đa.',
  START_TOO_SOON: 'Giờ bắt đầu quá sát hiện tại. Vui lòng chọn khung giờ muộn hơn.',
  START_TOO_FAR: 'Giờ bắt đầu quá xa. Vui lòng chọn ngày gần hơn.',
  INVALID_CHECKLIST_ITEM: 'Có mục công việc không thuộc dịch vụ đã chọn.',
  BOOKING_NOT_FOUND: 'Không tìm thấy đơn này.',
  ADDRESS_NOT_FOUND: 'Không tìm thấy địa chỉ đã chọn.',
  PAYMENT_NOT_FOUND: 'Không tìm thấy giao dịch thanh toán.',
  AVAILABILITY_NOT_FOUND: 'Không tìm thấy khoảng rảnh này.',
  FREELANCER_NOT_FOUND: 'Không tìm thấy hồ sơ đối tác này hoặc hồ sơ chưa được duyệt.',
  PROVIDER_NOT_BOOKABLE: 'Đối tác hiện không nhận đặt lịch.',
  SERVICE_NOT_OFFERED: 'Đối tác không cung cấp dịch vụ này.',
  ADDRESS_OUT_OF_SERVICE_AREA: 'Địa chỉ nằm ngoài khu vực phục vụ của đối tác.',
  OUTSIDE_AVAILABILITY: 'Khung giờ không nằm trọn trong lịch rảnh của đối tác.',
  SLOT_UNAVAILABLE: 'Khung giờ này vừa có người đặt. Vui lòng chọn khung giờ khác.',
  TOO_MANY_PENDING_BOOKINGS: 'Bạn đang có quá nhiều đơn chờ đặt cọc. Hãy thanh toán hoặc hủy bớt trước khi đặt thêm.',
  ADDRESS_LIMIT_REACHED: 'Bạn đã lưu đủ 10 địa chỉ.',
  HOLD_EXPIRED: 'Đã hết thời gian giữ chỗ. Vui lòng đặt lại.',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu thanh toán bị trùng. Vui lòng thử lại.',
  BOOKING_INVALID_STATE: 'Thao tác không phù hợp với trạng thái hiện tại của đơn.',
  BOOKING_NOT_CANCELLABLE: 'Đơn này không còn hủy được.',
  CONFIRMATION_EXPIRED: 'Đã quá hạn xác nhận đơn này.',
  CHECK_IN_NOT_OPEN: 'Chưa tới hoặc đã qua khung giờ check-in.',
  PROVIDER_NOT_APPROVED: 'Hồ sơ của bạn chưa được duyệt nên chưa thể mở lịch rảnh.',
  AVAILABILITY_OVERLAP: 'Khoảng rảnh này chồng lên một khoảng rảnh khác.',
  AVAILABILITY_IN_USE: 'Không thể xóa vì đang có đơn chiếm chỗ trong khoảng rảnh này.',
  IDEMPOTENCY_KEY_REQUIRED: 'Thiếu mã chống trùng yêu cầu. Vui lòng tải lại trang và thử lại.',
  CHECK_IN_TOKEN_INVALID: 'Mã QR không hợp lệ. Hãy nhờ khách hiển thị lại mã.',
  CHECK_IN_TOKEN_EXPIRED: 'Mã QR đã hết hạn hoặc đã bị thay bằng mã mới. Hãy nhờ khách làm mới mã.',
  AFTER_PHOTO_REQUIRED: 'Cần tải ít nhất một ảnh "Sau khi làm" trước khi hoàn tất ca.',
  EMPTY_FILE: 'Tệp ảnh đang trống. Vui lòng chọn ảnh khác.',
  FILE_TOO_LARGE: 'Ảnh lớn hơn 5 MB. Vui lòng chọn ảnh nhỏ hơn.',
  UNSUPPORTED_IMAGE: 'Chỉ nhận ảnh JPG hoặc PNG.',
  INVALID_BOOKING_TASK: 'Mục công việc không thuộc đơn này.',
  BOOKING_TASK_NOT_FOUND: 'Không tìm thấy mục công việc.',
  BOOKING_PHOTO_NOT_FOUND: 'Không tìm thấy ảnh.',
  BOOKING_NOT_COMPLETED: 'Chỉ đánh giá được sau khi đơn hoàn thành.',
  BOOKING_ALREADY_RATED: 'Bạn đã đánh giá đơn này rồi.',
  RATING_NOT_FOUND: 'Bạn chưa đánh giá đơn này.',
  BOOKING_NOT_DISPUTABLE: 'Chỉ khiếu nại được đơn đã hoàn tất hoặc đang chờ nghiệm thu, và mỗi đơn chỉ khiếu nại một lần.',
  DISPUTE_ALREADY_OPEN: 'Đơn này đã có khiếu nại đang được xử lý.',
  DISPUTE_NOT_FOUND: 'Không tìm thấy khiếu nại này.',
  DISPUTE_ALREADY_DECIDED: 'Khiếu nại này đã có quyết định.',
  DISPUTE_CLOSED: 'Khiếu nại đã kết thúc nên không thể bổ sung bằng chứng.',
  EVIDENCE_LIMIT_REACHED: 'Mỗi bên chỉ gửi được tối đa 10 ảnh bằng chứng.',
  INVALID_DISPUTE_CATEGORY: 'Loại khiếu nại không hợp lệ.',
  INVALID_DISPUTE_AMOUNT: 'Tổng tiền hoàn cho khách và tiền trả người làm vượt quá giá trị đơn.',
}

export function bookingErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem.code
    if (code && code in bookingErrorMessages) return bookingErrorMessages[code]
    if (error.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
    if (error.status === 413) return bookingErrorMessages.FILE_TOO_LARGE
    const validationMessage = Object.values(error.problem.errors ?? {}).flat()[0]
    return validationMessage ?? error.message
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}
