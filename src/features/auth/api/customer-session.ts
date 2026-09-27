import { apiRequest } from '../../../shared/api/http-client'

export interface CustomerLoginRequest {
  phoneNumber: string
  password: string
}

export interface CustomerLoginResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresAtUtc: string
  userId: string
  fullName: string
  phoneNumber: string
  role: string
}

export function loginCustomer(request: CustomerLoginRequest) {
  return apiRequest<CustomerLoginResponse>('/auth/login', {
    method: 'POST',
    body: request,
  })
}
