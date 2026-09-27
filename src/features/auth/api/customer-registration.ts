import { apiRequest } from '../../../shared/api/http-client'
import { ApiError } from '../../../shared/api/problem-details'

export interface RegisterCustomerRequest {
  fullName: string
  phoneNumber: string
  password: string
  confirmPassword: string
  acceptTermsAndPrivacy: boolean
}

export interface CustomerRegistrationResponse {
  userId: string
  challengeId: string
  phoneNumber: string
  expiresAtUtc: string
  resendAvailableAtUtc: string
  developmentOtpCode?: string
}

export interface VerifyPhoneOtpRequest {
  challengeId: string
  code: string
}

export interface CustomerPhoneVerificationResponse {
  userId: string
  status: string
  phoneVerifiedAtUtc: string
}

export function registerCustomer(request: RegisterCustomerRequest) {
  return apiRequest<CustomerRegistrationResponse>('/auth/register', {
    method: 'POST',
    body: request,
  })
}

export function verifyPhoneOtp(request: VerifyPhoneOtpRequest) {
  return apiRequest<CustomerPhoneVerificationResponse>('/auth/verify-phone-otp', {
    method: 'POST',
    body: request,
  })
}

export function resendPhoneOtp(challengeId: string) {
  return apiRequest<CustomerRegistrationResponse>('/auth/resend-phone-otp', {
    method: 'POST',
    body: { challengeId },
  })
}

export function getAuthApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.problem.code === 'INVALID_CREDENTIALS' || error.problem.title === 'INVALID_CREDENTIALS') {
      return 'Số điện thoại hoặc mật khẩu không chính xác, hoặc tài khoản chưa được xác thực.'
    }

    const validationMessage = Object.values(error.problem.errors ?? {}).flat()[0]
    return validationMessage ?? error.problem.detail ?? error.problem.title ?? 'Yêu cầu không thành công.'
  }

  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}
