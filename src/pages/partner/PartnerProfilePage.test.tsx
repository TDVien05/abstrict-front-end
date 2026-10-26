// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PartnerProfilePage } from './PartnerProfilePage'

const profile = {
  providerId: 'p1', displayName: 'Phạm Quốc Bảo', approvalStatus: 'Approved', bio: 'Thợ điện lạnh', experienceYears: 4,
  isAcceptingBookings: true, autoAcceptBookings: false, canAcceptBookings: true, missingForBookings: [], acceptingBookingsPaused: false,
  services: [{ serviceCategoryId: 'c-ac', code: 'AC', name: 'Vệ sinh máy lạnh', hourlyRateVnd: 120000, description: 'Có đồ nghề', isActive: true, isListed: true }],
  serviceAreas: [{ serviceAreaId: 'a1', city: 'TP.HCM', district: 'Quận 1', wardOrComplex: null, travelRadiusKm: 15, isActive: true }],
}
const categories = [
  { id: 'c-ac', code: 'AC', name: 'Vệ sinh máy lạnh', description: null, isActive: true },
  { id: 'c-garden', code: 'GARDEN', name: 'Làm vườn', description: null, isActive: true },
]
const areas = [
  { id: 'a1', city: 'TP.HCM', district: 'Quận 1', wardOrComplex: null, isActive: true },
  { id: 'a2', city: 'TP.HCM', district: 'Quận 3', wardOrComplex: null, isActive: true },
]

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(overrides: Record<string, (init?: RequestInit) => Response> = {}, current: unknown = profile) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const key = `${init?.method ?? 'GET'} ${url.replace(/^.*\/api\/v1/, '')}`
    for (const [match, make] of Object.entries(overrides)) if (key.startsWith(match)) return make(init)
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/catalog/service-categories')) return json(categories)
    if (url.includes('/catalog/service-areas')) return json(areas)
    if (url.includes('/freelancer/profile')) return json(current)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (method: string, match: string) => fetchMock.mock.calls.filter(([input, init]) => String(input).includes(match) && (init?.method ?? 'GET') === method)
  return { calls }
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter><PartnerProfilePage /></MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('freelancer profile page', () => {
  it('shows the bio, skills with rates, areas and the booking switches', async () => {
    stubApi()
    renderPage()
    expect(await screen.findByText('Vệ sinh máy lạnh', { selector: 'p' })).toBeTruthy()
    expect(screen.getByText(/120\.000/)).toBeTruthy()
    expect(screen.getByDisplayValue('Thợ điện lạnh')).toBeTruthy()
    expect((screen.getByRole('switch', { name: 'Đang nhận đơn' }) as HTMLInputElement).checked).toBe(true)
    expect((await screen.findByLabelText('Bán kính di chuyển Quận 1') as HTMLInputElement).value).toBe('15')
  })

  it('saves only the changed bio, trimmed', async () => {
    const api = stubApi({ 'PATCH': () => json({ ...profile, bio: 'Mới' }) })
    renderPage()
    const save = await screen.findByRole('button', { name: 'Lưu giới thiệu' })
    expect((save as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Giới thiệu bản thân'), { target: { value: '  Mới  ' } })
    fireEvent.click(save)
    await waitFor(() => expect(api.calls('PATCH', '/freelancer/profile')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('PATCH', '/freelancer/profile')[0][1]?.body))).toEqual({ bio: 'Mới' })
  })

  it('adds a new skill from the catalog, offering only skills not yet added', async () => {
    const api = stubApi({ 'PUT /freelancer/profile/services/c-garden': () => json(profile) })
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm kỹ năng' }))
    const form = screen.getByRole('form', { name: 'Thêm kỹ năng' })
    await waitFor(() => expect(within(form).getAllByRole('option').map((option) => option.textContent)).toEqual(['Chọn kỹ năng…', 'Làm vườn']))
    const submit = within(form).getByRole('button', { name: 'Thêm kỹ năng' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    fireEvent.change(within(form).getByLabelText('Kỹ năng'), { target: { value: 'c-garden' } })
    fireEvent.change(within(form).getByLabelText(/Giá theo giờ/), { target: { value: '90000' } })
    fireEvent.change(within(form).getByLabelText('Mô tả kỹ năng'), { target: { value: '  Cắt tỉa  ' } })
    fireEvent.click(submit)
    await waitFor(() => expect(api.calls('PUT', '/services/c-garden')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('PUT', '/services/c-garden')[0][1]?.body))).toEqual({ hourlyRateVnd: 90000, description: 'Cắt tỉa', isActive: true })
  })

  it('keeps the submit button disabled for a rate outside the allowed range', async () => {
    stubApi()
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    const form = screen.getByRole('form', { name: 'Sửa kỹ năng' })
    fireEvent.change(within(form).getByLabelText(/Giá theo giờ/), { target: { value: '5000' } })
    expect((within(form).getByRole('button', { name: 'Lưu kỹ năng' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(within(form).getByLabelText(/Giá theo giờ/), { target: { value: '150000' } })
    expect((within(form).getByRole('button', { name: 'Lưu kỹ năng' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('turns a skill off keeping its rate and removes one after confirmation', async () => {
    const api = stubApi({ 'PUT /freelancer/profile/services/c-ac': () => json(profile), 'DELETE': () => json({ ...profile, services: [] }) })
    vi.stubGlobal('confirm', () => true)
    window.confirm = () => true
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: 'Tắt' }))
    await waitFor(() => expect(api.calls('PUT', '/services/c-ac')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('PUT', '/services/c-ac')[0][1]?.body))).toEqual({ hourlyRateVnd: 120000, description: 'Có đồ nghề', isActive: false })
    fireEvent.click(screen.getByRole('button', { name: 'Xóa kỹ năng Vệ sinh máy lạnh' }))
    await waitFor(() => expect(api.calls('DELETE', '/services/c-ac')).toHaveLength(1))
    expect(await screen.findByText(/chưa thêm kỹ năng nào/)).toBeTruthy()
  })

  it('replaces the whole area list with the chosen radius per area', async () => {
    const api = stubApi({ 'PUT /freelancer/profile/service-areas': () => json(profile) })
    renderPage()
    const q1 = await screen.findByLabelText('Bán kính di chuyển Quận 1')
    fireEvent.change(q1, { target: { value: '20' } })
    fireEvent.click(screen.getByLabelText('Quận 3'))
    fireEvent.click(screen.getByRole('button', { name: 'Lưu khu vực' }))
    await waitFor(() => expect(api.calls('PUT', '/service-areas')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('PUT', '/service-areas')[0][1]?.body))).toEqual({
      serviceAreas: [{ serviceAreaId: 'a1', travelRadiusKm: 20 }, { serviceAreaId: 'a2', travelRadiusKm: 10 }],
    })
  })

  it('explains what is missing and blocks turning bookings on when the profile is not ready', async () => {
    stubApi({}, { ...profile, approvalStatus: 'Submitted', isAcceptingBookings: false, canAcceptBookings: false, missingForBookings: ['NOT_APPROVED', 'NO_SERVICE_AREA'] })
    renderPage()
    const missing = await screen.findByRole('list', { name: 'Điều kiện còn thiếu' })
    expect(missing.textContent).toContain('Hồ sơ cần được duyệt')
    expect(missing.textContent).toContain('khu vực nhận ca')
    expect((screen.getByRole('switch', { name: 'Đang nhận đơn' }) as HTMLInputElement).disabled).toBe(true)
  })

  it('shows the server error when a save is rejected', async () => {
    stubApi({ 'PATCH': () => json({ status: 409, code: 'PROVIDER_SUSPENDED', title: 'Conflict', detail: 'Hồ sơ đang bị tạm ngưng nên chưa thể chỉnh sửa.' }, 409) })
    renderPage()
    fireEvent.change(await screen.findByLabelText('Giới thiệu bản thân'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu giới thiệu' }))
    expect((await screen.findByRole('alert')).textContent).toBeTruthy()
  })
})
