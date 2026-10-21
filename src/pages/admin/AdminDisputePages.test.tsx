// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdminDisputeDetailPage, AdminDisputesPage } from './AdminDisputePages'

const dispute = {
  id: 'd1', bookingId: 'b1', bookingNumber: 'AB261022QTQ845', bookingStatus: 'Disputed', customerUserId: 'u-customer', customerName: 'Khách Hàng Thử',
  providerId: 'p1', providerName: 'Nguyễn Thị Lan', category: 'ServiceQuality', status: 'Open', description: 'Bếp chưa sạch như checklist.',
  responseDeadlineUtc: '2099-01-03T01:00:00+00:00', createdAtUtc: '2099-01-01T01:00:00+00:00',
  evidence: [{ id: 'e1', uploadedByUserId: 'u-customer', description: 'Ảnh bếp', createdAtUtc: '2099-01-01T01:05:00+00:00', contentUrl: '/api/v1/admin/disputes/d1/evidence/e1/content' }],
  messages: [
    { id: 'm1', authorUserId: 'u-customer', body: 'Tôi đã chụp ảnh.', isInternalAdminNote: false, createdAtUtc: '2099-01-01T01:10:00+00:00' },
    { id: 'm2', authorUserId: 'u-admin', body: 'NỘI BỘ: ảnh khớp.', isInternalAdminNote: true, createdAtUtc: '2099-01-01T02:00:00+00:00' },
  ],
  decisions: [] as unknown[],
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(current: unknown = dispute, overrides: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    for (const [suffix, make] of Object.entries(overrides)) if (url.includes(suffix)) return make()
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/evidence/')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
    if (url.includes('/messages') && method === 'POST') return json({ ...dispute, messages: [...dispute.messages, { id: 'm3', authorUserId: 'u-admin', body: JSON.parse(String(init?.body)).body, isInternalAdminNote: url.includes('internalNote=true'), createdAtUtc: '2099-01-01T03:00:00+00:00' }] })
    if (url.endsWith('/decision') && method === 'POST') return json({ ...dispute, status: 'Decided', decisions: [{ id: 'dc1', adminUserId: 'u-admin', type: 'Initial', outcomeCode: 'PartialRefund', reason: 'Hoàn một phần.', refundAmountVnd: 40000, providerAmountVnd: 80000, decidedAtUtc: '2099-01-02T01:00:00+00:00' }] })
    if (url.includes('/admin/disputes/d1')) return json(current)
    if (url.includes('/admin/disputes')) return json({ items: [dispute], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 })
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (match: string, method = 'POST') => fetchMock.mock.calls.filter(([input, init]) => String(input).includes(match) && (init?.method ?? 'GET') === method)
  return { calls, fetchMock }
}

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<AdminDisputesPage />} path="/admin/disputes" />
          <Route element={<AdminDisputeDetailPage />} path="/admin/disputes/:disputeId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:evidence') })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('admin dispute queue', () => {
  it('shows the Open queue by default and re-queries when the status tab changes', async () => {
    const api = stubApi()
    renderAt('/admin/disputes')
    const link = await screen.findByRole('link', { name: '#AB261022QTQ845' })
    expect(link.getAttribute('href')).toBe('/admin/disputes/d1')
    expect(api.calls('/admin/disputes?status=Open', 'GET').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Tất cả' }))
    await waitFor(() => expect(api.fetchMock.mock.calls.some(([input]) => String(input).includes('/admin/disputes?') && !String(input).includes('status='))).toBe(true))
  })

  it('says so when a status has no disputes', async () => {
    stubApi(dispute, { '/admin/disputes?': () => json({ items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 }) })
    renderAt('/admin/disputes')
    expect(await screen.findByText('Không có khiếu nại nào ở trạng thái này.')).toBeTruthy()
  })
})

describe('admin dispute detail', () => {
  it('shows who said what, including internal notes marked as such', async () => {
    stubApi()
    renderAt('/admin/disputes/d1')
    expect(await screen.findByRole('heading', { name: 'Khiếu nại đơn #AB261022QTQ845' })).toBeTruthy()
    expect(screen.getAllByText('Khách Hàng Thử').length).toBeGreaterThan(0)
    expect(screen.getByText('Ghi chú nội bộ')).toBeTruthy()
    expect(screen.getByText('NỘI BỘ: ảnh khớp.')).toBeTruthy()
    expect(await screen.findByAltText('Ảnh bếp')).toBeTruthy()
  })

  it('sends internal notes only when the checkbox is ticked', async () => {
    const api = stubApi()
    renderAt('/admin/disputes/d1')
    fireEvent.change(await screen.findByLabelText('Tin nhắn'), { target: { value: 'Đã liên hệ người làm.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))
    await waitFor(() => expect(api.calls('/messages')).toHaveLength(1))
    expect(String(api.calls('/messages')[0][0])).not.toContain('internalNote')

    fireEvent.change(screen.getByLabelText('Tin nhắn'), { target: { value: 'Ghi chú riêng.' } })
    fireEvent.click(screen.getByLabelText(/Ghi chú nội bộ \(khách hàng không nhìn thấy\)/))
    fireEvent.click(screen.getByRole('button', { name: 'Gửi tin nhắn' }))
    await waitFor(() => expect(api.calls('/messages')).toHaveLength(2))
    expect(String(api.calls('/messages')[1][0])).toContain('?internalNote=true')
  })

  it('validates the decision, asks for confirmation, then records it', async () => {
    const api = stubApi()
    renderAt('/admin/disputes/d1')
    await screen.findByRole('heading', { name: 'Khiếu nại đơn #AB261022QTQ845' })

    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Lý do cần ít nhất 5 ký tự.')

    fireEvent.change(screen.getByLabelText('Kết quả'), { target: { value: 'PartialRefund' } })
    fireEvent.change(screen.getByLabelText(/Hoàn cho khách/), { target: { value: '40000' } })
    fireEvent.change(screen.getByLabelText(/Trả cho người làm/), { target: { value: '8 0000' } })
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: '  Hoàn một phần.  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Số tiền phải là số nguyên không âm (VND).')

    fireEvent.change(screen.getByLabelText(/Trả cho người làm/), { target: { value: '80000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    expect(await screen.findByText('Quyết định không thể thay đổi sau khi ghi nhận.')).toBeTruthy()
    expect(api.calls('/decision')).toHaveLength(0)

    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận quyết định' }))
    await waitFor(() => expect(api.calls('/decision')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/decision')[0][1]?.body))).toEqual({ outcomeCode: 'PartialRefund', reason: 'Hoàn một phần.', refundAmountVnd: 40000, providerAmountVnd: 80000 })
    expect(await screen.findByText('Khiếu nại đã có quyết định nên không thể ghi nhận thêm.')).toBeTruthy()
  })

  it('leaves amounts out when none apply and accepts a custom outcome code', async () => {
    const api = stubApi()
    renderAt('/admin/disputes/d1')
    fireEvent.change(await screen.findByLabelText('Kết quả'), { target: { value: '__custom' } })
    fireEvent.change(screen.getByLabelText('Mã kết quả'), { target: { value: 'BacKhieuNai' } })
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Không đủ bằng chứng.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận quyết định' }))
    await waitFor(() => expect(api.calls('/decision')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/decision')[0][1]?.body))).toEqual({ outcomeCode: 'BacKhieuNai', reason: 'Không đủ bằng chứng.' })
  })

  it('shows the server error and returns to the form when the decision is refused', async () => {
    stubApi(dispute, { '/decision': () => json({ status: 400, code: 'INVALID_DISPUTE_AMOUNT' }, 400) })
    renderAt('/admin/disputes/d1')
    fireEvent.change(await screen.findByLabelText(/Hoàn cho khách/), { target: { value: '999999999' } })
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Hoàn quá mức.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Xác nhận quyết định' }))
    expect((await screen.findByRole('alert')).textContent).toContain('vượt quá giá trị đơn')
    expect(screen.queryByText('Quyết định không thể thay đổi sau khi ghi nhận.')).toBeNull()
    expect(screen.getByRole('button', { name: 'Ghi nhận quyết định' })).toBeTruthy()
  })

  it('does not offer a decision for a dispute that already has one', async () => {
    stubApi({ ...dispute, status: 'Decided', decisions: [{ id: 'dc1', adminUserId: 'u-admin', type: 'Initial', outcomeCode: 'FullRefund', reason: 'Hoàn đủ.', refundAmountVnd: 160000, providerAmountVnd: null, decidedAtUtc: '2099-01-02T01:00:00+00:00' }] })
    renderAt('/admin/disputes/d1')
    expect(await screen.findByText('Khiếu nại đã có quyết định nên không thể ghi nhận thêm.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ghi nhận quyết định' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Quyết định đã ghi nhận' })).toBeTruthy()
  })
})
