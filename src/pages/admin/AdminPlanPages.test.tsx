// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminPlansPage } from './AdminPlanPages'

const plan = {
  id: 'pl1', code: 'FREELANCER_FEATURED_7D', name: 'Gói Nổi bật 7 ngày', audience: 'Freelancer', durationDays: 7, priceVnd: 49000,
  priorityRadiusKm: 10, workerLimit: null, benefits: ['Gắn nhãn Được tài trợ'], isActive: true, purchaseCount: 0,
  createdAtUtc: '2099-01-01T00:00:00+00:00', updatedAtUtc: '2099-01-01T00:00:00+00:00',
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(overrides: Record<string, (init?: RequestInit) => Response> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    for (const [key, make] of Object.entries(overrides)) if (`${init?.method ?? 'GET'} ${url}`.includes(key)) return make(init)
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/admin/promotion-plans')) return json([plan])
    if (url.includes('/partner/promotion-plans')) return json([{ ...plan, purchaseCount: undefined }])
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (method: string, match: string) => fetchMock.mock.calls.filter(([input, init]) => String(input).includes(match) && (init?.method ?? 'GET') === method)
  return { calls }
}

function renderPage(page: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('admin plans page', () => {
  it('lists plans and filters by audience on the server', async () => {
    const api = stubApi()
    renderPage(<AdminPlansPage />)
    expect(await screen.findByText('Gói Nổi bật 7 ngày')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Lọc theo đối tượng'), { target: { value: 'Company' } })
    await waitFor(() => expect(api.calls('GET', 'audience=Company')).toHaveLength(1))
  })

  it('creates a plan with benefits split into lines and hides the worker limit for freelancer plans', async () => {
    const api = stubApi({ 'POST /api/v1/admin/promotion-plans': () => json(plan, 201) })
    renderPage(<AdminPlansPage />)
    await screen.findByText('Gói Nổi bật 7 ngày')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo gói mới' }))
    expect(screen.queryByText('Giới hạn số người làm')).toBeNull()

    fireEvent.change(screen.getByLabelText('Mã gói'), { target: { value: 'FREELANCER_FEATURED_30D' } })
    fireEvent.change(screen.getByLabelText('Tên gói'), { target: { value: 'Gói 30 ngày' } })
    fireEvent.change(screen.getByLabelText('Giá (VND)'), { target: { value: '149000' } })
    fireEvent.change(screen.getByLabelText('Quyền lợi 1'), { target: { value: 'Một' } })
    fireEvent.keyDown(screen.getByLabelText('Quyền lợi 1'), { key: 'Enter' })
    fireEvent.change(screen.getByLabelText('Quyền lợi 2'), { target: { value: '  Hai  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm quyền lợi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xóa quyền lợi 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thêm quyền lợi' }))
    fireEvent.change(screen.getByLabelText('Quyền lợi 2'), { target: { value: '  Hai  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Thêm quyền lợi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' }))

    await waitFor(() => expect(api.calls('POST', '/admin/promotion-plans')).toHaveLength(1))
    const body = JSON.parse(String(api.calls('POST', '/admin/promotion-plans')[0][1]?.body))
    expect(body).toMatchObject({ code: 'FREELANCER_FEATURED_30D', audience: 'Freelancer', name: 'Gói 30 ngày', durationDays: 7, priceVnd: 149000, priorityRadiusKm: null, workerLimit: null, benefits: ['Một', 'Hai'], isActive: true })
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Tạo gói mới' })).toBeNull())
  })

  it('shows the server error when the code is already taken', async () => {
    stubApi({ 'POST /api/v1/admin/promotion-plans': () => json({ status: 409, code: 'PLAN_CODE_TAKEN', title: 'Conflict' }, 409) })
    renderPage(<AdminPlansPage />)
    await screen.findByText('Gói Nổi bật 7 ngày')
    fireEvent.click(screen.getByRole('button', { name: 'Tạo gói mới' }))
    fireEvent.change(screen.getByLabelText('Mã gói'), { target: { value: 'DUP' } })
    fireEvent.change(screen.getByLabelText('Tên gói'), { target: { value: 'Trùng' } })
    fireEvent.change(screen.getByLabelText('Giá (VND)'), { target: { value: '1000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo gói' }))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
  })

  it('turns a plan off with a PUT that keeps its other fields', async () => {
    const api = stubApi({ 'PUT': () => json({ ...plan, isActive: false }) })
    renderPage(<AdminPlansPage />)
    await screen.findByText('Gói Nổi bật 7 ngày')
    fireEvent.click(screen.getByRole('button', { name: 'Tắt' }))
    await waitFor(() => expect(api.calls('PUT', '/admin/promotion-plans/pl1')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('PUT', 'pl1')[0][1]?.body))).toMatchObject({ name: 'Gói Nổi bật 7 ngày', priceVnd: 49000, isActive: false })
  })

  it('does not offer delete for a plan that already has purchases', async () => {
    stubApi({ 'GET /api/v1/admin/promotion-plans': () => json([{ ...plan, purchaseCount: 3 }]) })
    renderPage(<AdminPlansPage />)
    await screen.findByText('Gói Nổi bật 7 ngày')
    expect(screen.queryByRole('button', { name: 'Xóa' })).toBeNull()
  })
})
