import type { Actor, AuthUser } from '../../../entities/auth'
import type { CompanyOnboardingStep, CompanyStatus } from '../../../entities/company'
import { apiRequest } from '../../../shared/api/http-client'

export interface CustomerLoginRequest {
  phoneNumber: string
  password: string
}

export type FreelancerOnboardingStep = 'Profile' | 'Documents' | 'Submit' | 'AwaitingReview' | 'Completed' | 'Suspended'

export interface LoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresAtUtc: string
  userId: string
  fullName: string
  phoneNumber: string
  role: 'Customer' | 'Freelancer' | 'Company' | 'Admin'
  customerProfile: { avatarUrl: string | null } | null
  freelancerOnboarding: { providerId: string | null; kycStatus: string; currentStep: FreelancerOnboardingStep } | null
  companyOnboarding: { providerId: string | null; status: CompanyStatus; currentStep: CompanyOnboardingStep } | null
}

const actorByRole: Record<LoginResponse['role'], Actor> = { Customer: 'customer', Freelancer: 'freelancer', Company: 'company', Admin: 'admin' }

const kycAnchorByStep: Partial<Record<FreelancerOnboardingStep, string>> = { Profile: 'kyc-1', Documents: 'kyc-2', Submit: 'kyc-4', AwaitingReview: 'kyc-4' }

// /auth/login và /auth/refresh dùng chung cho mọi vai trò và trả cùng cấu trúc.
export function loginCustomer(request: CustomerLoginRequest) {
  return apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: request,
  })
}

export function refreshSession() {
  return apiRequest<LoginResponse>('/auth/refresh', { method: 'POST' })
}

export function logout() {
  return apiRequest<void>('/auth/logout', { method: 'POST' })
}

export function sessionUserOf(response: LoginResponse): AuthUser {
  return {
    id: response.userId,
    displayName: response.fullName,
    phoneNumber: response.phoneNumber,
    actor: actorByRole[response.role] ?? 'customer',
    avatarUrl: response.customerProfile?.avatarUrl ?? null,
  }
}

export function homePathAfterLogin(response: LoginResponse) {
  if (response.role === 'Admin') return '/admin/approvals'
  // Doanh nghiệp chưa có màn hình nghiệp vụ nào ngoài hồ sơ, kể cả sau khi được duyệt.
  if (response.role === 'Company') return '/partner/company/onboarding'
  if (response.role !== 'Freelancer') return '/discover'
  const anchor = kycAnchorByStep[response.freelancerOnboarding?.currentStep ?? 'Profile']
  return anchor ? `/partners/register/kyc#${anchor}` : '/partner/orders'
}
