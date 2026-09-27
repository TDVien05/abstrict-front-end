import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  registerCustomer,
  resendPhoneOtp,
  verifyPhoneOtp,
  type CustomerRegistrationResponse,
} from './customer-registration'

const registrationResponse: CustomerRegistrationResponse = {
  userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  challengeId: '34cfbb61-a308-4e66-8b7a-42b0790e571b',
  phoneNumber: '0901234567',
  expiresAtUtc: '2026-09-27T16:10:35.490Z',
  resendAvailableAtUtc: '2026-09-27T16:06:20.490Z',
  developmentOtpCode: '993603',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('customer registration API', () => {
  it('uses the register, verify and resend contracts', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(registrationResponse), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        userId: registrationResponse.userId,
        status: 'Active',
        phoneVerifiedAtUtc: '2026-09-27T16:11:54.394Z',
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(registrationResponse), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    await registerCustomer({
      fullName: 'Nguyễn Thu Hà',
      phoneNumber: '0901234567',
      password: 'abc12345',
      confirmPassword: 'abc12345',
      acceptTermsAndPrivacy: true,
    })
    await verifyPhoneOtp({ challengeId: registrationResponse.challengeId, code: '993603' })
    await resendPhoneOtp(registrationResponse.challengeId)

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/auth/register', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Nguyễn Thu Hà',
        phoneNumber: '0901234567',
        password: 'abc12345',
        confirmPassword: 'abc12345',
        acceptTermsAndPrivacy: true,
      }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/auth/verify-phone-otp', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ challengeId: registrationResponse.challengeId, code: '993603' }),
    }))
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/auth/resend-phone-otp', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ challengeId: registrationResponse.challengeId }),
    }))
  })
})
