import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompanyDocument, CompanyDocumentType, CompanyFeedback, CompanyOnboardingStep, CompanyProfile, CompanyServiceArea, CompanyStatus } from '../../../entities/company'
import { apiRequest } from '../../../shared/api/http-client'

export interface CompanyRepresentative {
  fullName: string
  jobTitle: string
  workEmail: string
  phoneNumber: string
  /** Server không bao giờ trả số CCCD đầy đủ cho công ty. */
  identityNumberLast4: string
}

export interface SaveCompanyRepresentativeRequest extends Omit<CompanyRepresentative, 'identityNumberLast4'> {
  identityNumber: string
}

export interface CompanyOnboarding {
  status: CompanyStatus
  currentStep: CompanyOnboardingStep
  canEdit: boolean
  providerId: string | null
  company: CompanyProfile | null
  representative: CompanyRepresentative | null
  serviceAreas: CompanyServiceArea[]
  requiredDocumentTypes: CompanyDocumentType[]
  documents: CompanyDocument[]
  feedback: CompanyFeedback | null
  submittedAtUtc: string | null
}

const onboardingKey = ['company', 'onboarding']

export const companyDocumentContentPath = (documentId: string) => `/company/onboarding/documents/${encodeURIComponent(documentId)}/content`

export function useCompanyOnboarding() {
  return useQuery({ queryKey: onboardingKey, queryFn: () => apiRequest<CompanyOnboarding>('/company/onboarding') })
}

// Mọi thao tác ghi đều trả lại toàn bộ hồ sơ, nên kết quả được đưa thẳng vào cache thay vì tải lại.
function useOnboardingMutation<TInput>(send: (input: TInput) => Promise<CompanyOnboarding>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: send, onSuccess: (onboarding) => queryClient.setQueryData(onboardingKey, onboarding) })
}

export function useSaveCompanyProfile() {
  return useOnboardingMutation((body: CompanyProfile) => apiRequest<CompanyOnboarding>('/company/onboarding/company', { method: 'PUT', body }))
}

export function useSaveCompanyRepresentative() {
  return useOnboardingMutation((body: SaveCompanyRepresentativeRequest) => apiRequest<CompanyOnboarding>('/company/onboarding/representative', { method: 'PUT', body }))
}

export function useSaveCompanyServiceAreas() {
  return useOnboardingMutation((serviceAreaIds: string[]) => apiRequest<CompanyOnboarding>('/company/onboarding/service-areas', { method: 'PUT', body: { serviceAreaIds } }))
}

export function useUploadCompanyDocument() {
  return useOnboardingMutation(({ file, type }: { file: File; type: CompanyDocumentType }) => {
    const body = new FormData()
    body.append('file', file)
    return apiRequest<CompanyOnboarding>(`/company/onboarding/documents/${type}`, { method: 'PUT', body })
  })
}

export function useSubmitCompanyOnboarding() {
  return useOnboardingMutation(() => apiRequest<CompanyOnboarding>('/company/onboarding/submit', { method: 'POST' }))
}
