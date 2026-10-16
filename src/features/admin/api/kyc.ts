import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PagedResponse } from '../../../entities/booking'
import type { KycDocument, KycDocumentType, KycFeedback, KycGender, KycStatus } from '../../../entities/kyc'
import { apiRequest } from '../../../shared/api/http-client'

export interface AdminKycListItem {
  providerId: string
  legalFullName: string
  phoneNumber: string
  status: KycStatus
  submittedAtUtc: string | null
}

export interface AdminKycDetail {
  providerId: string
  status: KycStatus
  phoneNumber: string
  legalFullName: string
  dateOfBirth: string
  gender: KycGender
  /** Chỉ admin nhận số CCCD đầy đủ; mỗi lần mở chi tiết đều được ghi audit ở server. */
  citizenIdNumber: string
  permanentAddress: string
  currentAddress: string
  experienceYears: number
  submittedAtUtc: string | null
  feedback: KycFeedback | null
  documents: KycDocument[]
}

export type KycDecision = 'Approved' | 'Rejected' | 'ChangesRequested'

export interface KycDecisionRequest {
  decision: KycDecision
  reason?: string
  rejectedDocumentTypes?: KycDocumentType[]
}

const kycKey = ['admin', 'kyc']
const kycPath = (providerId: string) => `/admin/kyc/${encodeURIComponent(providerId)}`

export const adminKycDocumentContentPath = (providerId: string, documentId: string) => `${kycPath(providerId)}/documents/${encodeURIComponent(documentId)}/content`

// Bỏ trống status = hàng chờ (Submitted + UnderReview), cũ nhất trước.
export function useAdminKycList(filters: { status?: KycStatus; page: number; pageSize: number }) {
  return useQuery({
    queryKey: [...kycKey, 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value))
      }
      return apiRequest<PagedResponse<AdminKycListItem>>(`/admin/kyc?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminKyc(providerId: string | undefined) {
  return useQuery({
    queryKey: [...kycKey, 'detail', providerId],
    queryFn: () => apiRequest<AdminKycDetail>(kycPath(providerId as string)),
    enabled: Boolean(providerId),
    retry: false,
    // Không tự tải lại: mỗi lần GET chi tiết là một dòng audit "kyc.viewed".
    staleTime: Infinity,
  })
}

function useReviewMutation<TInput>(providerId: string, send: (input: TInput) => Promise<AdminKycDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: (kyc) => {
      queryClient.setQueryData([...kycKey, 'detail', providerId], kyc)
      void queryClient.invalidateQueries({ queryKey: [...kycKey, 'list'] })
    },
  })
}

export function useStartKycReview(providerId: string) {
  return useReviewMutation(providerId, () => apiRequest<AdminKycDetail>(`${kycPath(providerId)}/start-review`, { method: 'POST' }))
}

export function useDecideKyc(providerId: string) {
  return useReviewMutation(providerId, (body: KycDecisionRequest) => apiRequest<AdminKycDetail>(`${kycPath(providerId)}/decision`, { method: 'POST', body }))
}
