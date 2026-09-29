import { apiRequest } from '../../../shared/api/http-client'

export interface CccdOcrResult {
  fullName?: string
  dateOfBirth?: string
  gender?: string
  permanentAddress?: string
  currentAddress?: string
}

export function scanCccd(front: File, back: File) {
  const body = new FormData()
  body.append('front', front)
  body.append('back', back)
  return apiRequest<CccdOcrResult>('/partners/kyc/ocr', { method: 'POST', body })
}
