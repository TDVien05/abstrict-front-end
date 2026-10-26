import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BookingStatus, PagedResponse } from '../../../entities/booking'
import { apiRequest } from '../../../shared/api/http-client'

export type DisputeCategory = 'ServiceQuality' | 'Payment' | 'Safety' | 'Damage' | 'Loss' | 'Other'
export type DisputeStatus = 'Open' | 'AwaitingResponse' | 'UnderReview' | 'Decided' | 'Appealed' | 'Closed'

export interface DisputeEvidence {
  id: string
  uploadedByUserId: string
  description: string | null
  createdAtUtc: string
  contentUrl: string
}

export interface DisputeMessage {
  id: string
  authorUserId: string
  body: string
  isInternalAdminNote: boolean
  createdAtUtc: string
}

export interface DisputeDecision {
  id: string
  adminUserId: string
  type: 'Initial' | 'AppealFinal'
  outcomeCode: string
  reason: string
  refundAmountVnd: number | null
  providerAmountVnd: number | null
  decidedAtUtc: string
}

export interface Dispute {
  id: string
  bookingId: string
  bookingNumber: string
  bookingStatus: BookingStatus
  customerUserId: string
  customerName: string
  providerId: string
  providerName: string
  category: DisputeCategory
  status: DisputeStatus
  description: string
  responseDeadlineUtc: string
  createdAtUtc: string
  evidence: DisputeEvidence[]
  messages: DisputeMessage[]
  decisions: DisputeDecision[]
}

export interface DisputeCategoryOption {
  value: DisputeCategory
  code: string
  label: string
  description: string
}

export const disputeCategoryLabels: Record<DisputeCategory, string> = {
  ServiceQuality: 'Chất lượng dịch vụ',
  Payment: 'Thanh toán',
  Safety: 'An toàn',
  Damage: 'Thiệt hại tài sản',
  Loss: 'Mất tài sản',
  Other: 'Khác',
}

export const disputeStatusLabels: Record<DisputeStatus, string> = {
  Open: 'Đã tiếp nhận',
  AwaitingResponse: 'Chờ phản hồi',
  UnderReview: 'Đang xem xét',
  Decided: 'Đã có quyết định',
  Appealed: 'Đang xem xét lại',
  Closed: 'Đã đóng',
}

export const disputeTerminalStatuses: DisputeStatus[] = ['Decided', 'Closed']
export const disputeDescriptionLimits = { min: 10, max: 4000 }
export const disputeMessageMaxLength = 4000
export const disputeEvidenceMax = 10

export interface OpenDisputeRequest {
  category: DisputeCategory
  description: string
}

const disputesKey = ['disputes']
const disputePath = (disputeId: string) => `/disputes/${encodeURIComponent(disputeId)}`

export function useDisputeCategories() {
  return useQuery({ queryKey: [...disputesKey, 'categories'], queryFn: () => apiRequest<DisputeCategoryOption[]>('/disputes/categories'), staleTime: Infinity, retry: false })
}

export function useCustomerDisputes(page: number, pageSize: number, enabled = true) {
  return useQuery({
    queryKey: [...disputesKey, 'list', page, pageSize],
    queryFn: () => apiRequest<PagedResponse<Dispute>>(`/disputes?page=${page}&pageSize=${pageSize}`),
    placeholderData: keepPreviousData,
    enabled,
  })
}

export function useCustomerDispute(disputeId: string | undefined) {
  return useQuery({
    queryKey: [...disputesKey, 'detail', disputeId],
    queryFn: () => apiRequest<Dispute>(disputePath(disputeId as string)),
    enabled: Boolean(disputeId),
    retry: false,
  })
}

export function useOpenDispute(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: OpenDisputeRequest) => apiRequest<Dispute>(`/disputes/bookings/${encodeURIComponent(bookingId)}`, { method: 'POST', body: request }),
    // Không nạp sẵn chi tiết từ phản hồi tạo: ảnh bằng chứng được tải lên ngay sau đó nên bản đó sẽ thiếu ảnh,
    // và trang chi tiết sẽ dùng lại bản cache cũ suốt thời gian staleTime.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...disputesKey, 'list'] })
      // Đơn chuyển sang Disputed.
      void queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
  })
}

export function uploadDisputeEvidence(disputeId: string, file: File, description?: string) {
  const body = new FormData()
  body.append('file', file)
  if (description?.trim()) body.append('description', description.trim())
  return apiRequest<DisputeEvidence>(`${disputePath(disputeId)}/evidence`, { method: 'POST', body })
}

export function useUploadDisputeEvidence(disputeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ description, file }: { description?: string; file: File }) => uploadDisputeEvidence(disputeId, file, description),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...disputesKey, 'detail', disputeId] }),
  })
}

export function useSendDisputeMessage(disputeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => apiRequest<Dispute>(`${disputePath(disputeId)}/messages`, { method: 'POST', body: { body } }),
    onSuccess: (dispute) => queryClient.setQueryData([...disputesKey, 'detail', disputeId], dispute),
  })
}
