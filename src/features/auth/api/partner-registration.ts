import { apiRequest } from '../../../shared/api/http-client'

export interface RegisterPartnerRequest {
  fullName: string
  phoneNumber: string
  password: string
  confirmPassword: string
  acceptTermsAndPrivacy: boolean
}

export interface PartnerRegistrationResponse {
  userId: string
  challengeId: string
  phoneNumber: string
  expiresAtUtc: string
  resendAvailableAtUtc: string
  developmentOtpCode?: string
}

export interface VerifyPartnerOtpRequest {
  challengeId: string
  code: string
}

export interface PartnerPhoneVerificationResponse {
  userId: string
  status: string
  phoneVerifiedAtUtc: string
}

// Freelancer đăng nhập qua /auth/login chung (xem customer-session.ts); chỉ bước đăng ký có đường dẫn riêng.
export function registerPartner(request: RegisterPartnerRequest) {
  return apiRequest<PartnerRegistrationResponse>('/auth/register-freelancer', {
    method: 'POST',
    body: request,
  })
}

// fullName là họ tên người quản lý tài khoản doanh nghiệp.
export function registerCompany(request: RegisterPartnerRequest) {
  return apiRequest<PartnerRegistrationResponse>('/auth/register-company', {
    method: 'POST',
    body: request,
  })
}

export function verifyPartnerPhoneOtp(request: VerifyPartnerOtpRequest) {
  return apiRequest<PartnerPhoneVerificationResponse>('/auth/verify-phone-otp', {
    method: 'POST',
    body: request,
  })
}

export function resendPartnerPhoneOtp(challengeId: string) {
  return apiRequest<PartnerRegistrationResponse>('/auth/resend-phone-otp', {
    method: 'POST',
    body: { challengeId },
  })
}
