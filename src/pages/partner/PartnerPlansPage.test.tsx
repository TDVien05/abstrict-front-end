// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PartnerPlansPage } from './PartnerPlansPage'

const plan = {
  id: 'pl1', code: 'F7', name: 'Gói Nổi bật 7 ngày', audience: 'Freelancer', durationDays: 7, priceVnd: 49000,
  priorityRadiusKm: 10, workerLimit: null, benefits: ['Gắn nhãn Được tài trợ', 'Báo cáo lượt xem'],
}
const freePlan = { ...plan, id: 'pl0', code: 'F0', name: 'Gói dùng thử', durationDays: 3, priceVnd: 0, priorityRadiusKm: null, benefits: [] }

const purchase = (over: Record<string, unknown> = {}) => ({
  id: 'pu1', planId: 'pl1', planCode: 'F7', planName: plan.name, durationDays: 7, priceVnd: 49000, status: 'PendingPayment', isCurrent: false,
  startsAtUtc: null, endsAtUtc: null, paymentId: 'pay1', paymentMethod: 'Momo', createdAtUtc: '2099-01-01T00:00:00+00:00', ...over,
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(state: { plans?: unknown[]; purchases?: unknown[]; onPurchase?: (init?: RequestInit) => Response; onConfirm?: (init?: RequestInit) => Response } = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/partner/promotion-plans')) return json(state.plans ?? [plan])
    if (url.endsWith('/sandbox-confirm')) return state.onConfirm?.(init) ?? json(purchase({ status: 'Active' }))
    if (url.includes('/partner/promotion-purchases') && method === 'POST') return state.onPurchase?.(init) ?? json(purchase())
    if (url.includes('/partner/promotion-purchases')) return json(state.purchases ?? [])
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (match: string, method = 'POST') => fetchMock.mock.calls.filter(([input, init]) => String(input).includes(match) && (init?.method ?? 'GET') === method)
  return { calls }
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><PartnerPlansPage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('partner plans page', () => {
  it('shows price, duration, highlights and benefits from the server', async () => {
    stubApi()
    renderPage()
    expect(await screen.findByText('Gói Nổi bật 7 ngày')).toBeTruthy()
    expect(screen.getByText(/49\.000/)).toBeTruthy()
    expect(screen.getByText('Gắn nhãn Được tài trợ')).toBeTruthy()
    expect(screen.getByText('Báo cáo lượt xem')).toBeTruthy()
    expect(screen.getByText(/bán kính 10 km/)).toBeTruthy()
  })

  it('shows an empty state when no plan is on sale', async () => {
    stubApi({ plans: [] })
    renderPage()
    expect(await screen.findByText(/chưa có gói nào đang bán/)).toBeTruthy()
  })

  it('buys a paid plan with an idempotency key and then pays through the sandbox', async () => {
    const api = stubApi()
    renderPage()
    await screen.findByText('Gói Nổi bật 7 ngày')
    fireEvent.click(screen.getByRole('button', { name: 'Mua gói' }))
    fireEvent.change(screen.getByLabelText('Phương thức thanh toán'), { target: { value: 'VietQr' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mua' }))

    await waitFor(() => expect(api.calls('/partner/promotion-purchases')).toHaveLength(1))
    const [, init] = api.calls('/partner/promotion-purchases')[0]
    expect(JSON.parse(String(init?.body))).toEqual({ planId: 'pl1', method: 'VietQr' })
    expect(new Headers(init?.headers).get('Idempotency-Key')).toBeTruthy()

    fireEvent.click(await screen.findByRole('button', { name: 'Thanh toán thành công' }))
    await waitFor(() => expect(api.calls('/pu1/sandbox-confirm')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/pu1/sandbox-confirm')[0][1]?.body))).toEqual({ succeeded: true })
  })

  it('reports a failed sandbox payment to the server', async () => {
    const api = stubApi({ purchases: [purchase()] })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Thanh toán thất bại' }))
    await waitFor(() => expect(JSON.parse(String(api.calls('/pu1/sandbox-confirm')[0][1]?.body))).toEqual({ succeeded: false }))
  })

  it('resumes a pending payment after a reload instead of offering to buy again', async () => {
    stubApi({ purchases: [purchase()] })
    renderPage()
    expect(await screen.findByRole('group', { name: 'Thanh toán thử' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Mua gói' })).toBeNull()
  })

  it('activates a free plan immediately without asking for a payment method', async () => {
    stubApi({ plans: [freePlan], onPurchase: () => json(purchase({ planId: 'pl0', planName: 'Gói dùng thử', priceVnd: 0, status: 'Active', paymentId: null, startsAtUtc: '2099-01-01T00:00:00+00:00', endsAtUtc: '2099-01-04T00:00:00+00:00' })) })
    renderPage()
    await screen.findByText('Gói dùng thử')
    fireEvent.click(screen.getByRole('button', { name: 'Mua gói' }))
    expect(screen.queryByLabelText('Phương thức thanh toán')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mua' }))
    expect((await screen.findByRole('status')).textContent).toContain('Đã kích hoạt Gói dùng thử')
  })

  it('shows the server error when the plan can no longer be bought', async () => {
    stubApi({ onPurchase: () => json({ status: 409, code: 'PLAN_NOT_AVAILABLE', title: 'Conflict' }, 409) })
    renderPage()
    await screen.findByText('Gói Nổi bật 7 ngày')
    fireEvent.click(screen.getByRole('button', { name: 'Mua gói' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận mua' }))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
  })

  it('shows the current plan, the queued one and the history', async () => {
    stubApi({
      purchases: [
        purchase({ id: 'q', planName: 'Gói 30 ngày', status: 'Active', isCurrent: false, startsAtUtc: '2099-01-08T00:00:00+00:00', endsAtUtc: '2099-02-07T00:00:00+00:00' }),
        purchase({ id: 'c', status: 'Active', isCurrent: true, startsAtUtc: '2099-01-01T00:00:00+00:00', endsAtUtc: '2099-01-08T00:00:00+00:00' }),
        purchase({ id: 'f', status: 'PaymentFailed' }),
      ],
    })
    renderPage()
    const summary = await screen.findByRole('region', { name: 'Gói đang dùng' })
    expect(summary.textContent).toContain('đang hiệu lực')
    expect(summary.textContent).toContain('Tiếp theo')
    expect(await screen.findByText('Thanh toán thất bại')).toBeTruthy()
  })
})
