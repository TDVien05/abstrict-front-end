import { apiRequest } from '../../../shared/api/http-client'

const FREELANCER_AUTH_BASE = '/auth/freelancers'

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

export interface PartnerLoginRequest {
  phoneNumber: string
  password: string
}

export type PartnerOnboardingStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'ChangesRequested' | 'Approved' | 'Rejected'
export type PartnerOnboardingStep = 'Personal' | 'Identity' | 'SupportingDocuments' | 'SkillsAndBank'

export interface PartnerLoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresAtUtc: string
  userId: string
  fullName: string
  phoneNumber: string
  role: string
  onboardingStatus: PartnerOnboardingStatus
  currentStep: PartnerOnboardingStep
}

export const partnerOnboardingStepAnchors: Record<PartnerOnboardingStep, string> = {
  Personal: 'kyc-1',
  Identity: 'kyc-2',
  SupportingDocuments: 'kyc-3',
  SkillsAndBank: 'kyc-4',
}

export function registerPartner(request: RegisterPartnerRequest) {
  return apiRequest<PartnerRegistrationResponse>(`${FREELANCER_AUTH_BASE}/register`, {
    method: 'POST',
    body: request,
  })
}

export function verifyPartnerPhoneOtp(request: VerifyPartnerOtpRequest) {
  return apiRequest<PartnerPhoneVerificationResponse>(`${FREELANCER_AUTH_BASE}/verify-phone-otp`, {
    method: 'POST',
    body: request,
  })
}

export function resendPartnerPhoneOtp(challengeId: string) {
  return apiRequest<PartnerRegistrationResponse>(`${FREELANCER_AUTH_BASE}/resend-phone-otp`, {
    method: 'POST',
    body: { challengeId },
  })
}

export function loginPartner(request: PartnerLoginRequest) {
  return apiRequest<PartnerLoginResponse>(`${FREELANCER_AUTH_BASE}/login`, {
    method: 'POST',
    body: request,
  })
}
