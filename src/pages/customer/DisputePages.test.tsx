// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { DisputeCreatePage, DisputeDetailPage, DisputesPage } from './DisputePages'

const categories = [
  { value: 'ServiceQuality', code: 'ServiceQuality', label: 'Chất lượng dịch vụ', description: 'Công việc chưa đúng mô tả.' },
  { value: 'Damage', code: 'Damage', label: 'Thiệt hại tài sản', description: 'Tài sản bị hư hỏng.' },
]

const booking = {
  id: 'b1', bookingNumber: 'AB261022QTQ845', status: 'Completed', providerId: 'p1', providerDisplayName: 'Nguyễn Thị Lan', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, holdExpiresAtUtc: null,
  addressSnapshot: 'Quận 1', customerNote: null, unitPriceVnd: 80000, surchargeAmountVnd: 0, extensionAmountVnd: 0, remainingAmountVnd: 136000,
  providerConfirmationDeadlineUtc: null, cancelledAtUtc: null, cancellationReason: null, depositPayment: null, tasks: [], timeline: [],
  allowedActions: ['OpenDispute'], serverTimeUtc: '2098-12-31T23:50:00+00:00', photos: [],
}

const openDispute = {
  id: 'd1', bookingId: 'b1', bookingNumber: 'AB261022QTQ845', bookingStatus: 'Disputed', customerUserId: 'u-customer', customerName: 'Khách Hàng Thử',
  providerId: 'p1', providerName: 'Nguyễn Thị Lan', category: 'ServiceQuality', status: 'Open', description: 'Bếp chưa sạch như checklist.',
  responseDeadlineUtc: '2099-01-03T01:00:00+00:00', createdAtUtc: '2099-01-01T01:00:00+00:00',
  evidence: [{ id: 'e1', uploadedByUserId: 'u-customer', description: 'Ảnh bếp', createdAtUtc: '2099-01-01T01:05:00+00:00', contentUrl: '/api/v1/disputes/d1/evidence/e1/content' }],
  messages: [
    { id: 'm1', authorUserId: 'u-customer', body: 'Tôi đã chụp ảnh.', isInternalAdminNote: false, createdAtUtc: '2099-01-01T01:10:00+00:00' },
    { id: 'm2', authorUserId: 'u-admin', body: 'Admin đã tiếp nhận.', isInternalAdminNote: false, createdAtUtc: '2099-01-01T02:00:00+00:00' },
  ],
  decisions: [] as unknown[],
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(dispute: unknown = openDispute, overrides: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    for (const [suffix, make] of Object.entries(overrides)) if (url.endsWith(suffix)) return make()
    if (url.includes('/auth/refresh')) {
      return json({ accessToken: 'token', tokenType: 'Bearer', expiresAtUtc: '2099-01-01T00:00:00+00:00', userId: 'u-customer', fullName: 'Khách Hàng Thử', phoneNumber: '0920000001', role: 'Customer', customerProfile: { avatarUrl: null }, freelancerOnboarding: null, companyOnboarding: null })
    }
    if (url.includes('/evidence/') && url.endsWith('/content')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
    if (url.endsWith('/disputes/categories')) return json(categories)
    if (url.endsWith('/disputes/bookings/b1') && method === 'POST') return json({ ...openDispute, evidence: [] }, 200)
    if (url.endsWith('/disputes/d1/evidence') && method === 'POST') return json({ id: 'e2', uploadedByUserId: 'u-customer', description: null, createdAtUtc: '2099-01-01T01:06:00+00:00', contentUrl: '/x' })
    if (url.endsWith('/disputes/d1/messages') && method === 'POST') return json({ ...(dispute as object), messages: [...(dispute as typeof openDispute).messages, { id: 'm3', authorUserId: 'u-customer', body: JSON.parse(String(init?.body)).body, isInternalAdminNote: false, createdAtUtc: '2099-01-01T03:00:00+00:00' }] })
    if (url.includes('/disputes/d1')) return json(dispute)
    if (url.includes('/disputes?')) return json({ items: [dispute], page: 1, pageSize: 10, totalItems: 1, totalPages: 1 })
    if (url.includes('/bookings/b1')) return json(booking)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const posts = (suffix: string) => fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith(suffix) && init?.method === 'POST')
  return { posts }
}

function renderAt(path: string, staleTime = 0) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } })}>
      <AuthProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<DisputeCreatePage />} path="/orders/:id/dispute" />
            <Route element={<DisputesPage />} path="/disputes" />
            <Route element={<DisputeDetailPage />} path="/disputes/:disputeId" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:evidence') })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const png = (name = 'bep.png', size = 1000) => new File([new Uint8Array(size)], name, { type: 'image/png' })

describe('opening a dispute', () => {
  it('validates category and description before anything is sent', async () => {
    const api = stubApi()
    renderAt('/orders/b1/dispute')
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi khiếu nại' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Vui lòng chọn loại khiếu nại.')

    fireEvent.change(screen.getByLabelText('Loại khiếu nại'), { target: { value: 'ServiceQuality' } })
    fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: 'ngắn quá' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Mô tả cần ít nhất 10 ký tự.')
    expect(api.posts('/disputes/bookings/b1')).toHaveLength(0)
  })

  it('creates the dispute, uploads each evidence photo, then opens the detail page', async () => {
    const api = stubApi()
    renderAt('/orders/b1/dispute')
    fireEvent.change(await screen.findByLabelText('Loại khiếu nại'), { target: { value: 'ServiceQuality' } })
    fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: '  Khu vực bếp chưa được vệ sinh kỹ.  ' } })
    fireEvent.change(screen.getByLabelText(/Ảnh bằng chứng/), { target: { files: [png('bep.png'), png('san.png')] } })
    expect(screen.getByText('bep.png')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }))

    expect(await screen.findByRole('heading', { name: 'Khiếu nại đơn #AB261022QTQ845' })).toBeTruthy()
    expect(JSON.parse(String(api.posts('/disputes/bookings/b1')[0][1]?.body))).toEqual({ category: 'ServiceQuality', description: 'Khu vực bếp chưa được vệ sinh kỹ.' })
    expect(api.posts('/disputes/d1/evidence')).toHaveLength(2)
    expect((api.posts('/disputes/d1/evidence')[0][1]?.body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('shows the uploaded evidence on the detail page even with the app cache settings', async () => {
    // Như AppProviders: dữ liệu còn "mới" 30 giây nên trang chi tiết không tự tải lại nếu cache đã có bản cũ (chưa có ảnh).
    stubApi()
    renderAt('/orders/b1/dispute', 30_000)
    fireEvent.change(await screen.findByLabelText('Loại khiếu nại'), { target: { value: 'ServiceQuality' } })
    fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: 'Khu vực bếp chưa được vệ sinh kỹ.' } })
    fireEvent.change(screen.getByLabelText(/Ảnh bằng chứng/), { target: { files: [png('bep.png')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }))
    expect(await screen.findByRole('heading', { name: 'Khiếu nại đơn #AB261022QTQ845' })).toBeTruthy()
    expect(await screen.findByAltText('Ảnh bếp')).toBeTruthy()
    expect(screen.queryByText('Chưa có ảnh bằng chứng nào.')).toBeNull()
  })

  it('rejects non-image and oversized files before uploading', async () => {
    stubApi()
    renderAt('/orders/b1/dispute')
    fireEvent.change(await screen.findByLabelText(/Ảnh bằng chứng/), { target: { files: [new File(['x'], 'tai-lieu.pdf', { type: 'application/pdf' })] } })
    expect((await screen.findByRole('alert')).textContent).toContain('Chỉ nhận ảnh JPG hoặc PNG.')
    fireEvent.change(screen.getByLabelText(/Ảnh bằng chứng/), { target: { files: [png('to.png', 5 * 1024 * 1024 + 1)] } })
    expect((await screen.findByRole('alert')).textContent).toContain('Ảnh lớn hơn 5 MB.')
    expect(screen.queryByText('to.png')).toBeNull()
  })

  it('reports an order that can no longer be disputed', async () => {
    const original = stubApi()
    expect(original).toBeTruthy()
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => String(input).includes('/bookings/b1') ? json({ ...booking, status: 'Disputed', allowedActions: [] }) : json({}, 404)))
    renderAt('/orders/b1/dispute')
    expect((await screen.findByText(/hiện không thể khiếu nại/)).textContent).toContain('AB261022QTQ845')
    expect(screen.queryByRole('button', { name: 'Gửi khiếu nại' })).toBeNull()
  })

  it('shows the server reason when the dispute cannot be created', async () => {
    stubApi(openDispute, { '/disputes/bookings/b1': () => json({ status: 409, code: 'BOOKING_NOT_DISPUTABLE' }, 409) })
    renderAt('/orders/b1/dispute')
    fireEvent.change(await screen.findByLabelText('Loại khiếu nại'), { target: { value: 'Damage' } })
    fireEvent.change(screen.getByLabelText(/Mô tả vấn đề/), { target: { value: 'Tủ bị trầy xước nhiều chỗ.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi khiếu nại' }))
    expect((await screen.findByRole('alert')).textContent).toContain('mỗi đơn chỉ khiếu nại một lần')
    expect(screen.queryByRole('heading', { name: /Khiếu nại đơn/ })).toBeNull()
  })
})

describe('dispute list and detail', () => {
  it('lists the customer disputes with status', async () => {
    stubApi()
    renderAt('/disputes')
    const link = await screen.findByRole('link', { name: /AB261022QTQ845/ })
    expect(link.getAttribute('href')).toBe('/disputes/d1')
    expect(link.textContent).toContain('Đã tiếp nhận')
  })

  it('shows the thread with the right author labels and lets the customer reply', async () => {
    const api = stubApi()
    renderAt('/disputes/d1')
    expect(await screen.findByText('Tôi đã chụp ảnh.')).toBeTruthy()
    expect(screen.getByText('Bạn')).toBeTruthy()
    expect(screen.getByText('ABSTRICT')).toBeTruthy()
    expect(await screen.findByAltText('Ảnh bếp')).toBeTruthy()

    const send = screen.getByRole('button', { name: 'Gửi tin nhắn' })
    expect((send as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Tin nhắn cho ABSTRICT'), { target: { value: '  Tôi có thêm ảnh.  ' } })
    fireEvent.click(send)
    await waitFor(() => expect(api.posts('/disputes/d1/messages')).toHaveLength(1))
    expect(JSON.parse(String(api.posts('/disputes/d1/messages')[0][1]?.body))).toEqual({ body: 'Tôi có thêm ảnh.' })
    expect(await screen.findByText('Tôi có thêm ảnh.')).toBeTruthy()
  })

  it('locks replies and evidence once a decision exists and shows the decision', async () => {
    stubApi({ ...openDispute, status: 'Decided', decisions: [{ id: 'dc1', adminUserId: 'u-admin', type: 'Initial', outcomeCode: 'PartialRefund', reason: 'Hoàn một phần do bếp chưa sạch.', refundAmountVnd: 40000, providerAmountVnd: 80000, decidedAtUtc: '2099-01-02T01:00:00+00:00' }] })
    renderAt('/disputes/d1')
    expect(await screen.findByRole('heading', { name: 'Quyết định của ABSTRICT' })).toBeTruthy()
    expect(screen.getByText('Hoàn một phần do bếp chưa sạch.')).toBeTruthy()
    expect(screen.getByText(/40\.000/)).toBeTruthy()
    expect(screen.getByText(/không nhắn thêm được/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi tin nhắn' })).toBeNull()
    expect(screen.queryByText('Bổ sung ảnh bằng chứng')).toBeNull()
  })

  it('stops offering uploads once ten photos were sent', async () => {
    const evidence = Array.from({ length: 10 }, (_, index) => ({ id: `e${index}`, uploadedByUserId: 'u-customer', description: null, createdAtUtc: '2099-01-01T01:05:00+00:00', contentUrl: `/api/v1/disputes/d1/evidence/e${index}/content` }))
    const fetchMock = stubApi({ ...openDispute, evidence })
    expect(fetchMock).toBeTruthy()
    renderAt('/disputes/d1')
    expect(await screen.findByText(/đã gửi tối đa 10 ảnh/)).toBeTruthy()
    expect(screen.queryByText('Bổ sung ảnh bằng chứng')).toBeNull()
  })
})
