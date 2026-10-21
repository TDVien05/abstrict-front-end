// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { OrderDetailPage } from './OrderDetailPage'

const baseBooking = {
  id: 'b1', bookingNumber: 'AB261022QTQ845', status: 'PendingAcceptance', providerId: 'p1', providerDisplayName: 'Nguyễn Thị Lan', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, holdExpiresAtUtc: null,
  addressSnapshot: 'A-1205, Vinhomes, Quận 1', customerNote: null, unitPriceVnd: 80000, surchargeAmountVnd: 0, extensionAmountVnd: 0, remainingAmountVnd: 136000,
  providerConfirmationDeadlineUtc: null, cancelledAtUtc: null, cancellationReason: null, depositPayment: null,
  tasks: [{ id: 't1', areaName: 'Bếp', description: 'Lau tủ lạnh', sortOrder: 1, status: 'Completed' }],
  timeline: [], allowedActions: ['AcceptWork', 'OpenDispute'], serverTimeUtc: '2098-12-31T23:50:00+00:00',
  photos: [
    { id: 'ph1', type: 'Before', bookingTaskId: 't1', caption: 'Bếp trước khi dọn', takenAtUtc: '2098-12-31T10:00:00+00:00', uploadedByUserId: 'f1', contentUrl: '/api/v1/bookings/b1/photos/ph1/content' },
    { id: 'ph2', type: 'After', bookingTaskId: null, caption: null, takenAtUtc: '2098-12-31T12:00:00+00:00', uploadedByUserId: 'f1', contentUrl: '/api/v1/bookings/b1/photos/ph2/content' },
  ],
}

const savedRating = { id: 'r1', bookingId: 'b1', bookingNumber: 'AB261022QTQ845', providerId: 'p1', providerName: 'Nguyễn Thị Lan', score: 4, comment: 'Làm sạch và đúng giờ.', createdAtUtc: '2099-01-02T01:00:00+00:00', publishedAtUtc: '2099-01-02T01:00:00+00:00' }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(initial: Partial<typeof baseBooking> = {}) {
  const state = { booking: { ...baseBooking, ...initial } as typeof baseBooking, rating: null as typeof savedRating | null }
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/photos/')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
    if (url.endsWith('/accept-work') && method === 'POST') {
      state.booking = { ...state.booking, status: 'Completed', allowedActions: ['RateProvider', 'OpenDispute'] as never }
      return json(state.booking)
    }
    if (url.endsWith('/rating') && method === 'POST') {
      const body = JSON.parse(String(init?.body))
      state.rating = { ...savedRating, score: body.score, comment: body.comment ?? null }
      state.booking = { ...state.booking, allowedActions: ['OpenDispute'] as never }
      return json(state.rating, 201)
    }
    if (url.endsWith('/rating')) return state.rating ? json(state.rating) : json({ status: 404, code: 'RATING_NOT_FOUND' }, 404)
    if (url.includes('/disputes')) return json({ items: [], page: 1, pageSize: 50, totalItems: 0, totalPages: 0 })
    if (url.includes('/bookings/b1')) return json(state.booking)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (suffix: string, method = 'POST') => fetchMock.mock.calls.filter(([input, init]) => String(input).endsWith(suffix) && (init?.method ?? 'GET') === method)
  return { calls, state }
}

function renderOrder() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/orders/b1']}>
          <Routes>
            <Route element={<OrderDetailPage />} path="/orders/:id" />
            <Route element={<p>Trang khiếu nại</p>} path="/orders/:id/dispute" />
          </Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:photo') })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('customer order after the freelancer finishes', () => {
  it('shows the progress photos, labelled by type and linked to the task', async () => {
    stubApi()
    renderOrder()
    expect(await screen.findByRole('heading', { name: 'Ảnh tiến độ' })).toBeTruthy()
    expect(await screen.findByAltText('Trước khi làm: Bếp trước khi dọn')).toBeTruthy()
    expect(await screen.findByAltText('Sau khi làm')).toBeTruthy()
    expect(screen.getByText('Bếp: Lau tủ lạnh')).toBeTruthy()
  })

  it('asks for confirmation before accepting the work, then moves on to rating', async () => {
    const api = stubApi()
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Nghiệm thu công việc' }))
    expect(api.calls('/accept-work')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nghiệm thu' }))
    await waitFor(() => expect(api.calls('/accept-work')).toHaveLength(1))
    expect(await screen.findByRole('heading', { name: /Đánh giá Nguyễn Thị Lan/ })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Nghiệm thu công việc' })).toBeNull()
  })

  it('lets the user back out of accepting', async () => {
    const api = stubApi()
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Nghiệm thu công việc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.getByRole('button', { name: 'Nghiệm thu công việc' })).toBeTruthy()
    expect(api.calls('/accept-work')).toHaveLength(0)
  })

  it('shows an error and keeps the order when acceptance is refused', async () => {
    const api = stubApi()
    const original = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => String(input).endsWith('/accept-work') ? json({ status: 409, code: 'BOOKING_INVALID_STATE' }, 409) : original(input, init)))
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Nghiệm thu công việc' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận nghiệm thu' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Thao tác không phù hợp với trạng thái hiện tại của đơn.')
    expect(api.state.booking.status).toBe('PendingAcceptance')
  })

  it('requires a star score before rating and sends score and comment', async () => {
    const api = stubApi({ status: 'Completed', allowedActions: ['RateProvider', 'OpenDispute'] as never })
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi đánh giá' }))
    expect(await screen.findByText('Vui lòng chọn số sao.')).toBeTruthy()
    expect(api.calls('/rating')).toHaveLength(0)

    fireEvent.click(screen.getByRole('radio', { name: '5 sao' }))
    fireEvent.change(screen.getByLabelText(/Nhận xét/), { target: { value: '  Rất hài lòng  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đánh giá' }))
    await waitFor(() => expect(api.calls('/rating')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/rating')[0][1]?.body))).toEqual({ score: 5, comment: 'Rất hài lòng' })
    expect(await screen.findByRole('heading', { name: 'Đánh giá của bạn' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi đánh giá' })).toBeNull()
  })

  it('shows the saved rating instead of the form once the order has been rated', async () => {
    const api = stubApi({ status: 'Completed', allowedActions: ['OpenDispute'] as never })
    api.state.rating = savedRating
    renderOrder()
    expect(await screen.findByRole('heading', { name: 'Đánh giá của bạn' })).toBeTruthy()
    expect(screen.getByText('Làm sạch và đúng giờ.')).toBeTruthy()
    expect(screen.getByRole('img', { name: '4 trên 5 sao' })).toBeTruthy()
    expect(screen.queryByRole('radio')).toBeNull()
  })

  it('offers the dispute form only while the order can be disputed', async () => {
    stubApi()
    renderOrder()
    const link = await screen.findByRole('link', { name: 'Mở khiếu nại' })
    expect(link.getAttribute('href')).toBe('/orders/b1/dispute')
    cleanup()

    stubApi({ status: 'Cancelled', allowedActions: [] as never, photos: [] })
    renderOrder()
    await screen.findByText(/Đơn #AB261022QTQ845/)
    expect(screen.queryByRole('link', { name: 'Mở khiếu nại' })).toBeNull()
    expect(within(document.body).queryByRole('button', { name: 'Gửi đánh giá' })).toBeNull()
  })

  it('links a disputed order to its dispute', async () => {
    stubApi({ status: 'Disputed', allowedActions: [] as never })
    const original = globalThis.fetch
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => String(input).includes('/disputes?') ? json({ items: [{ id: 'd1', bookingId: 'b1' }], page: 1, pageSize: 50, totalItems: 1, totalPages: 1 }) : original(input, init)))
    renderOrder()
    const link = await screen.findByRole('link', { name: 'Xem khiếu nại' })
    await waitFor(() => expect(link.getAttribute('href')).toBe('/disputes/d1'))
  })
})
