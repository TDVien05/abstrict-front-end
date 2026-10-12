// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { PartnerOrdersPage } from './PartnerOrdersPage'
import { PartnerDashboardPage } from './PartnerDashboardPage'
import { PartnerRegistrationPage } from './PartnerRegistrationPage'
import { partnerRegistrationSchema } from '../../features/partner/registration-schema'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function renderPartner(page: React.ReactNode) {
  return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AuthProvider><MemoryRouter>{page}</MemoryRouter></AuthProvider></QueryClientProvider>)
}

const pendingBooking = {
  id: 'b1', bookingNumber: 'AB261012HXQDC2', status: 'PendingProviderConfirmation', customerName: 'Hoàng Yến', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, areaLabel: 'Quận 1, Hồ Chí Minh', providerConfirmationDeadlineUtc: '2098-12-31T10:00:00+00:00', allowedActions: ['Confirm', 'Reject'],
}

function stubBookings(refusal?: { status: number; code: string }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.endsWith('/auth/refresh')) return new Response(JSON.stringify({ status: 401, code: 'SESSION_EXPIRED' }), { status: 401 })
    if (url.endsWith('/counts')) return new Response(JSON.stringify({ counts: { PendingProviderConfirmation: 1, Confirmed: 0, Completed: 0 }, total: 1 }))
    if (init?.method !== 'POST') return new Response(JSON.stringify({ items: [pendingBooking], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 }))
    if (refusal) return new Response(JSON.stringify(refusal), { status: refusal.status })
    return new Response(JSON.stringify({ ...pendingBooking, status: 'Confirmed', allowedActions: [], addressSnapshot: null, customerNote: null, tasks: [], timeline: [] }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('Partner screens', () => {
  it('lists bookings from the API and confirms one', async () => {
    const fetchMock = stubBookings()
    renderPartner(<PartnerOrdersPage />)
    expect(await screen.findByText('Hoàng Yến')).toBeTruthy()
    expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/freelancer/bookings?status=PendingProviderConfirmation'))).toBe(true)
    expect(await screen.findByRole('button', { name: 'Chờ bạn xác nhận (1)' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nhận ca' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý nhận ca' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/freelancer/bookings/b1/confirm') && init?.method === 'POST')).toBe(true))
  })

  it('does not falsely confirm a booking when the server refuses', async () => {
    stubBookings({ status: 409, code: 'CONFIRMATION_EXPIRED' })
    renderPartner(<PartnerOrdersPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận nhận ca' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý nhận ca' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Đã quá hạn xác nhận đơn này. Trạng thái đơn không thay đổi.')
  })

  it('collects a rejection reason and lets the user cancel', async () => {
    const fetchMock = stubBookings()
    renderPartner(<PartnerOrdersPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
    fireEvent.change(screen.getByLabelText('Lý do từ chối'), { target: { value: 'Bận việc đột xuất' } })
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByLabelText('Lý do từ chối')).toBeNull()
    expect(fetchMock.mock.calls.some(([input]) => /\/(confirm|reject)$/.test(String(input)))).toBe(false)
  })

  it('shows the selected plan without claiming a completed payment', () => {
    renderPartner(<PartnerDashboardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Nâng cấp gói 30 ngày' }))
    expect(within(screen.getByRole('status')).getByText(/bạn chưa bị tính phí/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lựa chọn' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('validates empty KYC fields before attempting submission', async () => {
    renderPartner(<PartnerRegistrationPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi hồ sơ thẩm định KYC' }))
    await waitFor(() => expect(screen.getByText('Số điện thoại không hợp lệ.')).toBeTruthy())
    expect(screen.getByText('Chọn ít nhất một kỹ năng.')).toBeTruthy()
    expect(screen.getByText('Bạn cần xác nhận thông tin trước khi gửi.')).toBeTruthy()
  })
})

describe('KYC document validation', () => {
  it('rejects unsupported or oversized documents and PDFs as identity photos', () => {
    const pdf = new File(['document'], 'cccd.pdf', { type: 'application/pdf' })
    const exe = new File(['document'], 'file.exe', { type: 'application/octet-stream' })
    const huge = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })
    const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    expect(partnerRegistrationSchema.shape.front.safeParse([pdf]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.health.safeParse([exe]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.back.safeParse([huge]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.front.safeParse([photo]).success).toBe(true)
    expect(partnerRegistrationSchema.shape.health.safeParse([pdf]).success).toBe(true)
  })
})
