// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { OtpVerificationPage, SignUpPage } from './AuthPages'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function RegistrationStateProbe() {
  const location = useLocation()
  return <p>{JSON.stringify(location.state)}</p>
}

describe('SignUpPage legal dialogs', () => {
  it('opens and closes each legal document without selecting consent', () => {
    const queryClient = new QueryClient()
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SignUpPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const consentCheckbox = screen.getByRole('checkbox', {
      name: 'Đồng ý với điều khoản dịch vụ và chính sách quyền riêng tư',
    }) as HTMLInputElement

    fireEvent.click(screen.getByRole('button', { name: 'Điều khoản dịch vụ' }))

    expect(screen.getByRole('dialog', { name: 'Điều khoản dịch vụ' })).toBeTruthy()
    expect(consentCheckbox.checked).toBe(false)

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'Điều khoản dịch vụ' })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Chính sách quyền riêng tư' }))

    expect(screen.getByRole('dialog', { name: 'Chính sách quyền riêng tư' })).toBeTruthy()
    expect(screen.getByText('1. Thông tin chúng tôi thu thập')).toBeTruthy()
    expect(consentCheckbox.checked).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Tôi đã hiểu' }))

    expect(screen.queryByRole('dialog', { name: 'Chính sách quyền riêng tư' })).toBeNull()
  })

  it('registers with the form values and forwards the OTP challenge', async () => {
    const response = {
      userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      challengeId: '34cfbb61-a308-4e66-8b7a-42b0790e571b',
      phoneNumber: '0901234567',
      expiresAtUtc: new Date(Date.now() + 300_000).toISOString(),
      resendAvailableAtUtc: new Date(Date.now() + 45_000).toISOString(),
      developmentOtpCode: '993603',
    }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response), { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/register']}>
          <Routes>
            <Route element={<SignUpPage />} path="/register" />
            <Route element={<RegistrationStateProbe />} path="/verify-otp" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByPlaceholderText('Nguyễn Thu Hà'), { target: { value: 'Nguyễn Văn An' } })
    fireEvent.change(screen.getByPlaceholderText('090 123 4567'), { target: { value: '0901234567' } })
    fireEvent.change(screen.getByPlaceholderText('Tối thiểu 8 ký tự kèm chữ và số'), { target: { value: 'abc12345' } })
    fireEvent.change(screen.getByPlaceholderText('Nhập lại mật khẩu vừa tạo'), { target: { value: 'abc12345' } })
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/auth/register', expect.objectContaining({
      body: JSON.stringify({
        fullName: 'Nguyễn Văn An',
        phoneNumber: '0901234567',
        password: 'abc12345',
        confirmPassword: 'abc12345',
        acceptTermsAndPrivacy: true,
      }),
    }))
    expect(await screen.findByText((content) => content.includes(response.challengeId))).toBeTruthy()
  })
})

describe('OtpVerificationPage API flow', () => {
  it('uses the newest challenge when resending and verifying an OTP', async () => {
    const initialChallenge = {
      userId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      challengeId: '34cfbb61-a308-4e66-8b7a-42b0790e571b',
      phoneNumber: '0901234567',
      expiresAtUtc: new Date(Date.now() + 300_000).toISOString(),
      resendAvailableAtUtc: new Date(Date.now() - 1_000).toISOString(),
    }
    const resentChallenge = {
      ...initialChallenge,
      challengeId: '808ac645-e70d-481c-9b69-26eec67591cb',
      resendAvailableAtUtc: new Date(Date.now() + 45_000).toISOString(),
      developmentOtpCode: '993603',
    }
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(resentChallenge), { status: 202 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        userId: initialChallenge.userId,
        status: 'Active',
        phoneVerifiedAtUtc: new Date().toISOString(),
      }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[{ pathname: '/verify-otp', state: initialChallenge }]}>
          <Routes>
            <Route element={<OtpVerificationPage />} path="/verify-otp" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Gửi lại mã OTP' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/auth/resend-phone-otp', expect.objectContaining({
      body: JSON.stringify({ challengeId: initialChallenge.challengeId }),
    }))
    await screen.findByText(/Mã OTP môi trường phát triển/)

    screen.getAllByRole('textbox').forEach((input, index) => {
      fireEvent.change(input, { target: { value: '993603'[index] } })
    })
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận & Hoàn tất tạo tài khoản/ }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/auth/verify-phone-otp', expect.objectContaining({
      body: JSON.stringify({ challengeId: resentChallenge.challengeId, code: '993603' }),
    }))
    expect(await screen.findByText('Số điện thoại đã được xác thực. Tài khoản của bạn đã sẵn sàng.')).toBeTruthy()
  })
})
