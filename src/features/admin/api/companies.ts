import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PagedResponse } from '../../../entities/booking'
import type { CompanyDocument, CompanyDocumentType, CompanyFeedback, CompanyProfile, CompanyServiceArea, CompanyStatus } from '../../../entities/company'
import { apiRequest } from '../../../shared/api/http-client'

export interface AdminCompanyListItem {
  providerId: string
  legalName: string
  taxCode: string
  ownerPhoneNumber: string
  status: CompanyStatus
  submittedAtUtc: string | null
}

export interface AdminCompanyDetail {
  providerId: string
  status: CompanyStatus
  ownerPhoneNumber: string
  ownerFullName: string
  company: CompanyProfile
  /** Chỉ admin nhận số CCCD đầy đủ; mỗi lần mở chi tiết đều được ghi audit ở server. */
  representative: { fullName: string; jobTitle: string; workEmail: string; phoneNumber: string; identityNumber: string } | null
  serviceAreas: CompanyServiceArea[]
  requiredDocumentTypes: CompanyDocumentType[]
  documents: CompanyDocument[]
  feedback: CompanyFeedback | null
  submittedAtUtc: string | null
}

export type CompanyDecision = 'Approved' | 'Rejected' | 'ChangesRequested'

export interface CompanyDecisionRequest {
  decision: CompanyDecision
  reason?: string
  rejectedDocumentTypes?: CompanyDocumentType[]
}

const companiesKey = ['admin', 'companies']
const companyPath = (providerId: string) => `/admin/companies/${encodeURIComponent(providerId)}`

export const adminCompanyDocumentContentPath = (providerId: string, documentId: string) => `${companyPath(providerId)}/documents/${encodeURIComponent(documentId)}/content`

// Bỏ trống status = hàng chờ (Submitted + UnderReview), cũ nhất trước.
export function useAdminCompanies(filters: { status?: CompanyStatus; page: number; pageSize: number }) {
  return useQuery({
    queryKey: [...companiesKey, 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value))
      }
      return apiRequest<PagedResponse<AdminCompanyListItem>>(`/admin/companies?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminCompany(providerId: string | undefined) {
  return useQuery({
    queryKey: [...companiesKey, 'detail', providerId],
    queryFn: () => apiRequest<AdminCompanyDetail>(companyPath(providerId as string)),
    enabled: Boolean(providerId),
    retry: false,
    // Không tự tải lại: mỗi lần GET chi tiết là một dòng audit "company.viewed".
    staleTime: Infinity,
  })
}

function useReviewMutation<TInput>(providerId: string, send: (input: TInput) => Promise<AdminCompanyDetail>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: (company) => {
      queryClient.setQueryData([...companiesKey, 'detail', providerId], company)
      void queryClient.invalidateQueries({ queryKey: [...companiesKey, 'list'] })
    },
  })
}

export function useStartCompanyReview(providerId: string) {
  return useReviewMutation(providerId, () => apiRequest<AdminCompanyDetail>(`${companyPath(providerId)}/start-review`, { method: 'POST' }))
}

export function useDecideCompany(providerId: string) {
  return useReviewMutation(providerId, (body: CompanyDecisionRequest) => apiRequest<AdminCompanyDetail>(`${companyPath(providerId)}/decision`, { method: 'POST', body }))
}
