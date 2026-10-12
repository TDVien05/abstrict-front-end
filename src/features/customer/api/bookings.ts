import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clockOffsetOf, type BookingStatus, type BookingTask, type BookingTimelineEntry, type PagedResponse, type PaymentStatus } from '../../../entities/booking'
import { apiRequest } from '../../../shared/api/http-client'

export interface TimeRange {
  startsAtUtc: string
  endsAtUtc: string
}

export interface ProviderAvailability {
  providerId: string
  timeZone: string
  slotStepMinutes: number
  minimumDurationMinutes: number
  days: { date: string; free: TimeRange[]; busy: TimeRange[] }[]
}

export interface ChecklistItem {
  id: string
  parentItemId: string | null
  areaName: string
  description: string
  sortOrder: number
  isRequired: boolean
}

export interface ChecklistTemplate {
  templateId: string
  name: string
  version: number
  items: ChecklistItem[]
}

export interface CreateBookingRequest {
  providerId: string
  serviceCategoryId: string
  customerAddressId: string
  startsAtUtc: string
  endsAtUtc: string
  checklistItemIds?: string[]
  customerNote?: string
}

export interface BookingQuote {
  unitPriceVnd: number
  durationMinutes: number
  baseAmountVnd: number
  surchargeAmountVnd: number
  depositAmountVnd: number
  depositPercent: number
  remainingAmountVnd: number
  holdMinutes: number
}

export interface BookingSummary {
  id: string
  bookingNumber: string
  status: BookingStatus
  providerId: string
  providerDisplayName: string
  serviceCategoryCode: string
  serviceCategoryName: string
  startsAtUtc: string
  endsAtUtc: string
  baseAmountVnd: number
  depositAmountVnd: number
  holdExpiresAtUtc: string | null
}

export type BookingAction = 'PayDeposit' | 'Cancel' | 'ShowCheckInQr'

export const paymentMethods = { Momo: 'Ví MoMo', VietQr: 'VietQR', ZaloPay: 'ZaloPay', Card: 'Thẻ ngân hàng', BankTransfer: 'Chuyển khoản' } as const
export type PaymentMethod = keyof typeof paymentMethods

export interface DepositPayment {
  paymentId: string
  status: PaymentStatus
  amountVnd: number
  method: string
  expiresAtUtc: string | null
  checkoutUrl: string | null
}

interface BookingDetailResponse extends BookingSummary {
  addressSnapshot: string | null
  customerNote: string | null
  unitPriceVnd: number
  surchargeAmountVnd: number
  extensionAmountVnd: number
  remainingAmountVnd: number
  providerConfirmationDeadlineUtc: string | null
  cancelledAtUtc: string | null
  cancellationReason: string | null
  /** Giao dịch cọc gần nhất; `null` khi chưa khởi tạo. */
  depositPayment: DepositPayment | null
  tasks: BookingTask[]
  timeline: BookingTimelineEntry[]
  allowedActions: BookingAction[]
  serverTimeUtc: string
}

export interface BookingDetail extends BookingDetailResponse {
  clockOffsetMs: number
}

export interface CancellationPreview {
  freeCancellation: boolean
  refundAmountVnd: number
  retainedAmountVnd: number
  freeCancellationUntilUtc: string | null
}

export interface CheckInToken {
  token: string
  expiresAtUtc: string
  clockOffsetMs: number
}

export interface BookingListFilters {
  status?: BookingStatus
  page?: number
  pageSize?: number
}

const bookingPath = (bookingId: string) => `/bookings/${encodeURIComponent(bookingId)}`
const detailKey = (bookingId: string | undefined) => ['bookings', 'detail', bookingId]

async function requestBookingDetail(path: string, options?: Parameters<typeof apiRequest>[1]): Promise<BookingDetail> {
  const booking = await apiRequest<BookingDetailResponse>(path, options)
  return { ...booking, clockOffsetMs: clockOffsetOf(booking.serverTimeUtc) }
}

export function useProviderAvailability(providerId: string | undefined, days = 14) {
  return useQuery({
    queryKey: ['freelancer', providerId, 'availability', days],
    queryFn: () => apiRequest<ProviderAvailability>(`/freelancers/${encodeURIComponent(providerId as string)}/availability?days=${days}`),
    enabled: Boolean(providerId),
    retry: false,
  })
}

export function useChecklist(code: string | undefined) {
  return useQuery({
    queryKey: ['catalog', 'checklist', code],
    queryFn: () => apiRequest<ChecklistTemplate>(`/catalog/service-categories/${encodeURIComponent(code as string)}/checklist`),
    enabled: Boolean(code),
    retry: false,
    staleTime: Infinity,
  })
}

export function useBookingQuote(request: CreateBookingRequest | null) {
  return useQuery({
    queryKey: ['bookings', 'quote', request],
    queryFn: () => apiRequest<BookingQuote>('/bookings/quote', { method: 'POST', body: request }),
    enabled: request !== null,
    retry: false,
    staleTime: 60_000,
  })
}

export function useCreateBooking() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: CreateBookingRequest) => requestBookingDetail('/bookings', { method: 'POST', body: request }),
    onSuccess: (booking) => {
      queryClient.setQueryData(detailKey(booking.id), booking)
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] })
      void queryClient.invalidateQueries({ queryKey: ['freelancer', booking.providerId, 'availability'] })
    },
  })
}

export function useBookings(filters: BookingListFilters) {
  return useQuery({
    queryKey: ['bookings', 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value))
      }
      return apiRequest<PagedResponse<BookingSummary>>(`/bookings?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: detailKey(bookingId),
    queryFn: () => requestBookingDetail(bookingPath(bookingId as string)),
    enabled: Boolean(bookingId),
    retry: false,
    // Các trạng thái chờ tự chuyển ở server (hết giờ giữ chỗ, đối tác xác nhận/từ chối) và chưa có kênh đẩy.
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'PendingDeposit' || status === 'PendingProviderConfirmation' ? 15_000 : false
    },
  })
}

// Kết quả thanh toán được phản ánh ngay vào chi tiết đơn đang hiển thị, rồi tải lại để lấy trạng thái đơn mới.
function useTrackDepositPayment(bookingId: string) {
  const queryClient = useQueryClient()
  return (depositPayment: DepositPayment) => {
    queryClient.setQueryData<BookingDetail>(detailKey(bookingId), (booking) => booking && { ...booking, depositPayment })
    void queryClient.invalidateQueries({ queryKey: detailKey(bookingId) })
    void queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] })
  }
}

export function useInitiateDeposit(bookingId: string) {
  return useMutation({
    mutationFn: ({ idempotencyKey, method }: { idempotencyKey: string; method: PaymentMethod }) =>
      apiRequest<DepositPayment>(`${bookingPath(bookingId)}/deposit`, { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: { method } }),
    onSuccess: useTrackDepositPayment(bookingId),
  })
}

export function useConfirmSandboxPayment(bookingId: string) {
  return useMutation({
    mutationFn: ({ paymentId, succeeded }: { paymentId: string; succeeded: boolean }) =>
      apiRequest<DepositPayment>(`/payments/sandbox/${encodeURIComponent(paymentId)}/confirm`, { method: 'POST', body: { succeeded } }),
    onSuccess: useTrackDepositPayment(bookingId),
  })
}

export function useCancellationPreview(bookingId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...detailKey(bookingId), 'cancellation-preview'],
    queryFn: () => apiRequest<CancellationPreview>(`${bookingPath(bookingId)}/cancellation-preview`),
    enabled,
    retry: false,
    staleTime: 0,
  })
}

export function useCancelBooking(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (reason: string) => requestBookingDetail(`${bookingPath(bookingId)}/cancel`, { method: 'POST', body: reason ? { reason } : {} }),
    onSuccess: (booking) => {
      queryClient.setQueryData(detailKey(bookingId), booking)
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'list'] })
    },
  })
}

export async function requestCheckInToken(bookingId: string): Promise<CheckInToken> {
  const { serverTimeUtc, ...token } = await apiRequest<Omit<CheckInToken, 'clockOffsetMs'> & { serverTimeUtc: string }>(`${bookingPath(bookingId)}/check-in-token`, { method: 'POST' })
  return { ...token, clockOffsetMs: clockOffsetOf(serverTimeUtc) }
}
