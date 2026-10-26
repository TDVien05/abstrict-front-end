// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPlanReport } from './AdminPlanReport'

const report = {
  generatedAtUtc: '2099-01-10T00:00:00+00:00', activePlanCount: 3, inactivePlanCount: 1, paidPurchases: 5, activeNow: 2, pendingPayment: 1, paymentFailed: 4,
  totalRevenueVnd: 380000, last7DaysRevenueVnd: 150000,
  daily: [
    { date: '2099-01-04', purchases: 0, revenueVnd: 0 }, { date: '2099-01-05', purchases: 1, revenueVnd: 50000 }, { date: '2099-01-06', purchases: 0, revenueVnd: 0 },
    { date: '2099-01-07', purchases: 0, revenueVnd: 0 }, { date: '2099-01-08', purchases: 0, revenueVnd: 0 }, { date: '2099-01-09', purchases: 1, revenueVnd: 100000 }, { date: '2099-01-10', purchases: 0, revenueVnd: 0 },
  ],
  audiences: [{ audience: 'Freelancer', purchases: 4, revenueVnd: 230000 }, { audience: 'Company', purchases: 1, revenueVnd: 150000 }],
  plans: [
    { planId: 'p1', code: 'C30', name: 'Gói doanh nghiệp 30 ngày', audience: 'Company', isActive: true, purchases: 1, activeNow: 1, revenueVnd: 150000 },
    { planId: 'p2', code: 'F7', name: 'Gói nổi bật 7 ngày', audience: 'Freelancer', isActive: false, purchases: 4, activeNow: 1, revenueVnd: 230000 },
  ],
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function renderReport(response: Response) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => (String(input).includes('/auth/refresh') ? json({ status: 401, code: 'SESSION_EXPIRED' }, 401) : response.clone())))
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><AdminPlanReport /></MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('admin plan report', () => {
  it('shows revenue, active plans, pending payments, audiences and per-plan results', async () => {
    renderReport(json(report))
    expect(await screen.findByText('Tổng doanh thu gói')).toBeTruthy()
    expect(screen.getByText(/380\.000/)).toBeTruthy()
    expect(screen.getByText(/5 lượt mua đã thanh toán/)).toBeTruthy()
    expect(screen.getByText(/4 thanh toán thất bại/)).toBeTruthy()
    expect(screen.getByText(/3 gói đang bán, 1 gói đã tắt/)).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Doanh thu gói theo ngày' }).children).toHaveLength(7)

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Gói doanh nghiệp 30 ngày')).toBeTruthy()
    expect(within(rows[1]).getByText('Đã tắt')).toBeTruthy()
  })

  it('shows an empty state when there are no plans', async () => {
    renderReport(json({ ...report, plans: [], audiences: [], paidPurchases: 0, totalRevenueVnd: 0 }))
    expect(await screen.findByText('Chưa có gói nào.')).toBeTruthy()
  })

  it('shows the server error when the report cannot be loaded', async () => {
    renderReport(json({ status: 403, code: 'FORBIDDEN', title: 'Forbidden' }, 403))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
  })
})
