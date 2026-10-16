import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { FreelancerKyc, KycDocument, KycDocumentType, KycGender } from '../../../entities/kyc'
import { apiRequest } from '../../../shared/api/http-client'

export interface SaveKycProfileRequest {
  legalFullName: string
  /** ISO `YYYY-MM-DD`. */
  dateOfBirth: string
  gender: KycGender
  /** Bắt buộc mỗi lần lưu; server chỉ trả lại 4 số cuối. */
  citizenIdNumber: string
  permanentAddress: string
  currentAddress: string
  experienceYears: number
}

const kycKey = ['freelancer', 'kyc']

export function useFreelancerKyc() {
  return useQuery({ queryKey: kycKey, queryFn: () => apiRequest<FreelancerKyc>('/freelancer/kyc'), retry: false })
}

// Lưu thông tin trả lại toàn bộ hồ sơ, nên đưa thẳng vào cache.
export function useSaveKycProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: SaveKycProfileRequest) => apiRequest<FreelancerKyc>('/freelancer/kyc/profile', { method: 'PUT', body }),
    onSuccess: (kyc) => queryClient.setQueryData(kycKey, kyc),
  })
}

// Upload chỉ trả về một giấy tờ, không phải toàn bộ hồ sơ, nên phải tải lại để đồng bộ trạng thái.
export function useUploadKycDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: KycDocumentType }) => {
      const body = new FormData()
      body.append('file', file)
      return apiRequest<KycDocument>(`/freelancer/kyc/documents/${type}`, { method: 'PUT', body })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: kycKey }),
  })
}

export function useSubmitKyc() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiRequest<FreelancerKyc>('/freelancer/kyc/submit', { method: 'POST' }),
    onSuccess: (kyc) => queryClient.setQueryData(kycKey, kyc),
  })
}
