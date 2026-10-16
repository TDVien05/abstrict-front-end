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

const kycDocuments = [
  { id: 'd1', type: 'CitizenIdFront', status: 'Pending', originalFileName: 'front.jpg', uploadedAtUtc: '2026-10-12T09:00:00+00:00', rejectionReason: null },
  { id: 'd2', type: 'CitizenIdBack', status: 'Pending', originalFileName: 'back.jpg', uploadedAtUtc: '2026-10-12T09:00:00+00:00', rejectionReason: null },
  { id: 'd3', type: 'FaceVerification', status: 'Pending', originalFileName: 'face.jpg', uploadedAtUtc: '2026-10-12T09:00:00+00:00', rejectionReason: null },
]

function stubKyc(kyc: unknown) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/auth/refresh')) return new Response(JSON.stringify({ status: 401, code: 'SESSION_EXPIRED' }), { status: 401 })
    // Trả cùng cấu trúc hồ sơ cho cả GET và PUT profile.
    if (url.includes('/freelancer/kyc/profile') && init?.method === 'PUT') return new Response(JSON.stringify(kyc))
    return new Response(JSON.stringify(kyc))
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

  it('loads the KYC dossier and saves the profile as a draft', async () => {
    const fetchMock = stubKyc({ status: 'NotStarted', canEdit: true, profile: null, documents: [], feedback: null, submittedAtUtc: null })
    renderPartner(<PartnerRegistrationPage />)
    fireEvent.change(await screen.findByLabelText(/Họ và tên khai sinh/), { target: { value: 'Nguyễn Văn A' } })
    fireEvent.change(screen.getByLabelText(/Ngày tháng năm sinh/), { target: { value: '1995-05-01' } })
    fireEvent.change(screen.getByLabelText(/Số CCCD/), { target: { value: '079195001234' } })
    fireEvent.change(screen.getByLabelText(/Địa chỉ thường trú/), { target: { value: '12 Lê Lợi, Quận 1' } })
    fireEvent.change(screen.getByLabelText(/Địa chỉ tạm trú/), { target: { value: '34 Nguyễn Huệ, Quận 1' } })
    fireEvent.click(screen.getByLabelText(/Tôi cam kết/))
    fireEvent.click(screen.getByRole('button', { name: /Lưu bản nháp/ }))
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).includes('/freelancer/kyc/profile') && init?.method === 'PUT')
      expect(call).toBeTruthy()
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ legalFullName: 'Nguyễn Văn A', dateOfBirth: '1995-05-01', gender: 'Female', citizenIdNumber: '079195001234', experienceYears: 0 })
    })
  })

  it('validates CCCD and consent before submitting a complete dossier', async () => {
    stubKyc({ status: 'Draft', canEdit: true, profile: { legalFullName: 'Nguyễn Văn A', dateOfBirth: '1995-05-01', gender: 'Female', citizenIdLast4: '1234', permanentAddress: '12 Lê Lợi, Quận 1', currentAddress: '34 Nguyễn Huệ, Quận 1', experienceYears: 2 }, documents: kycDocuments, feedback: null, submittedAtUtc: null })
    renderPartner(<PartnerRegistrationPage />)
    fireEvent.click(await screen.findByRole('button', { name: /Gửi hồ sơ thẩm định KYC/ }))
    await waitFor(() => expect(screen.getByText('Số CCCD gồm đúng 12 chữ số.')).toBeTruthy())
    expect(screen.getByText('Bạn cần xác nhận thông tin trước khi gửi.')).toBeTruthy()
  })

  it('locks the form while the dossier is awaiting review', async () => {
    stubKyc({ status: 'Submitted', canEdit: false, profile: { legalFullName: 'Nguyễn Văn A', dateOfBirth: '1995-05-01', gender: 'Female', citizenIdLast4: '1234', permanentAddress: '12 Lê Lợi, Quận 1', currentAddress: '34 Nguyễn Huệ, Quận 1', experienceYears: 2 }, documents: kycDocuments, feedback: null, submittedAtUtc: '2026-10-12T09:00:00+00:00' })
    renderPartner(<PartnerRegistrationPage />)
    expect(await screen.findByText(/đang chờ ABSTRICT xét duyệt/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Gửi hồ sơ thẩm định KYC/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Lưu bản nháp/ })).toBeNull()
  })
})

describe('KYC document validation', () => {
  it('rejects unsupported or oversized files and non-images', () => {
    const pick = (size: number, type: string) => [{ size, type }]
    expect(partnerRegistrationSchema.shape.front.safeParse(pick(1000, 'application/pdf')).success).toBe(false)
    expect(partnerRegistrationSchema.shape.back.safeParse(pick(1000, 'application/octet-stream')).success).toBe(false)
    expect(partnerRegistrationSchema.shape.portrait.safeParse(pick(5 * 1024 * 1024 + 1, 'image/jpeg')).success).toBe(false)
    expect(partnerRegistrationSchema.shape.front.safeParse(pick(1000, 'image/jpeg')).success).toBe(true)
    expect(partnerRegistrationSchema.shape.portrait.safeParse(undefined).success).toBe(true)
  })
})
