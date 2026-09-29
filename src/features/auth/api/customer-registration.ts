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

const authErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: 'Số điện thoại hoặc mật khẩu không chính xác, hoặc tài khoản chưa được xác thực.',
  PASSWORD_CONFIRMATION_MISMATCH: 'Mật khẩu xác nhận chưa khớp.',
  TERMS_NOT_ACCEPTED: 'Bạn cần đồng ý với điều khoản sử dụng và chính sách quyền riêng tư.',
  INVALID_FULL_NAME: 'Vui lòng nhập đầy đủ họ và tên.',
  INVALID_PHONE_NUMBER: 'Số điện thoại chưa đúng định dạng.',
  PHONE_ALREADY_REGISTERED: 'Số điện thoại này đã được đăng ký. Vui lòng đăng nhập hoặc dùng số khác.',
  OTP_SEND_LIMIT_EXCEEDED: 'Bạn đã vượt giới hạn gửi OTP trong ngày. Vui lòng thử lại sau.',
  OTP_RESEND_COOLDOWN: 'Vui lòng chờ vài giây trước khi yêu cầu mã OTP mới.',
  OTP_DELIVERY_UNAVAILABLE: 'Dịch vụ gửi OTP tạm thời không khả dụng. Vui lòng thử lại sau.',
  OTP_CHALLENGE_NOT_FOUND: 'Không tìm thấy yêu cầu xác thực. Vui lòng đăng ký lại.',
  OTP_ALREADY_USED: 'Mã OTP đã được sử dụng. Vui lòng gửi lại mã mới.',
  OTP_EXPIRED: 'Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.',
  OTP_ATTEMPTS_EXCEEDED: 'Bạn đã nhập sai quá số lần cho phép. Vui lòng gửi lại mã mới.',
  INVALID_OTP: 'Mã OTP không chính xác.',
  FREELANCER_REGISTRATION_NOT_PENDING: 'Tài khoản không còn ở trạng thái chờ xác thực.',
}

export function getAuthApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem.code ?? error.problem.title
    if (code && code in authErrorMessages) {
      return authErrorMessages[code]
    }

    const validationMessage = Object.values(error.problem.errors ?? {}).flat()[0]
    return validationMessage ?? error.problem.detail ?? error.problem.title ?? 'Yêu cầu không thành công.'
  }

  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}
