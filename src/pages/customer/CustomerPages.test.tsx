// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddressPicker } from '../../features/customer/components/AddressPicker'
import { BookingCreatePage } from './BookingCreatePage'
import { CustomerDiscoveryPage } from './CustomerDiscoveryPage'
import { CustomerProviderPage } from './CustomerProviderPage'
import { OrderDetailPage } from './OrderDetailPage'

const providerId = 'dddddddd-0000-0000-0000-000000000001'

const divisions = [{ code: 79, name: 'Hồ Chí Minh', districts: [{ code: 760, name: 'Quận 1', isServed: true }] }]
const quan1Wards = [{ code: '26734', name: 'Phường Tân Định' }, { code: '26740', name: 'Phường Bến Nghé' }]
const wardsPath = '/catalog/administrative-divisions/provinces/79/districts/760/wards'

const booking = {
  id: 'b1', bookingNumber: 'AB261012HXQDC2', status: 'PendingDeposit', providerId, providerDisplayName: 'Nguyễn Thị Lan', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, holdExpiresAtUtc: '2099-01-01T00:00:00+00:00',
  addressSnapshot: 'A-1205, Vinhomes, 12 Lê Lợi, Bến Nghé, Quận 1, Hồ Chí Minh', customerNote: null, unitPriceVnd: 80000, surchargeAmountVnd: 0, extensionAmountVnd: 0, remainingAmountVnd: 136000,
  providerConfirmationDeadlineUtc: null, cancelledAtUtc: null, cancellationReason: null, depositPayment: null as unknown, tasks: [], timeline: [], allowedActions: ['PayDeposit', 'Cancel'], serverTimeUtc: '2098-12-31T23:50:00+00:00', photos: [] as unknown[],
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('customer booking screens', () => {
  it('books a free slot: provider availability, quote, hold, then deposit', async () => {
    let depositPayment: unknown = null
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/availability')) {
        return jsonResponse({ providerId, timeZone: 'Asia/Ho_Chi_Minh', slotStepMinutes: 30, minimumDurationMinutes: 120, days: [{ date: '2099-01-01', free: [{ startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T05:00:00+00:00' }], busy: [] }] })
      }
      if (url.includes(`/freelancers/${providerId}/ratings`)) {
        return jsonResponse({ items: [], page: 1, totalItems: 0, totalPages: 0 })
      }
      if (url.includes(`/freelancers/${providerId}`)) {
        return jsonResponse({
          providerId, displayName: 'Nguyễn Thị Lan', bio: 'Dọn dẹp gọn gàng.', gender: 'Female', averageRating: 4.8, ratingCount: 42, completedBookingCount: 38, experienceYears: 6, isAcceptingBookings: true,
          services: [{ serviceCategoryId: 'cat-1', code: 'CLEANING', name: 'Dọn dẹp', hourlyRateVnd: 80000, description: null }],
          serviceAreas: [{ id: 'a1', city: 'Hồ Chí Minh', district: 'Quận 1', wardOrComplex: null, travelRadiusKm: 10 }],
        })
      }
      if (url.endsWith(wardsPath)) return jsonResponse(quan1Wards)
      if (url.includes('/catalog/administrative-divisions')) return jsonResponse(divisions)
      if (url.includes('/catalog/service-areas')) return jsonResponse([{ id: 'a1', city: 'Hồ Chí Minh', district: 'Quận 1', wardOrComplex: null, isActive: true }, { id: 'a2', city: 'Hồ Chí Minh', district: 'Quận 3', wardOrComplex: null, isActive: true }])
      if (url.includes('/checklist')) return jsonResponse({ templateId: 't1', name: 'Dọn dẹp', version: 1, items: [{ id: 'i1', parentItemId: null, areaName: 'Bếp', description: 'Lau tủ lạnh', sortOrder: 1, isRequired: false }] })
      if (url.includes('/catalog/service-categories')) return jsonResponse([{ id: 'cat-1', code: 'CLEANING', name: 'Dọn dẹp nhà cửa', description: null, isActive: true }, { id: 'cat-2', code: 'COOKING', name: 'Nấu ăn gia đình', description: null, isActive: true }])
      if (url.includes('/customer/addresses')) return jsonResponse([{ id: 'addr-1', label: 'Nhà', apartmentNumber: 'A-1205', floor: '12', buildingName: 'Vinhomes', streetAddress: '12 Lê Lợi', ward: 'Bến Nghé', district: 'Quận 1', city: 'Hồ Chí Minh', accessInstructions: null, isDefault: true }])
      if (url.includes('/bookings/quote')) return jsonResponse({ unitPriceVnd: 80000, durationMinutes: 120, baseAmountVnd: 160000, surchargeAmountVnd: 0, depositAmountVnd: 24000, depositPercent: 15, remainingAmountVnd: 136000, holdMinutes: 15 })
      if (url.endsWith('/bookings') && init?.method === 'POST') return jsonResponse(booking, 201)
      if (url.includes('/deposit')) {
        depositPayment = { paymentId: 'pay-1', status: 'Pending', amountVnd: 24000, method: 'Momo', expiresAtUtc: null, checkoutUrl: null }
        return jsonResponse(depositPayment)
      }
      if (url.includes('/bookings/b1')) return jsonResponse({ ...booking, depositPayment })
      return jsonResponse({ items: [{ providerId, displayName: 'Nguyễn Thị Lan', bio: null, averageRating: 4.8, ratingCount: 42, completedBookingCount: 38, experienceYears: 6, isAcceptingBookings: true, minHourlyRateVnd: 80000, serviceCodes: ['CLEANING'] }], page: 1, pageSize: 12, totalItems: 1, totalPages: 1 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const postTo = (path: string) => fetchMock.mock.calls.find(([input, init]) => String(input).endsWith(path) && init?.method === 'POST')?.[1]

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/discover']}>
          <Routes>
            <Route element={<CustomerDiscoveryPage />} path="/discover" />
            <Route element={<CustomerProviderPage />} path="/discover/:providerId" />
            <Route element={<BookingCreatePage />} path="/book/:providerId" />
            <Route element={<OrderDetailPage />} path="/orders/:id" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    // Gõ không dấu vẫn lọc được tỉnh/thành; chọn xong thì danh bạ được gọi lại với đúng tên server dùng.
    await screen.findAllByRole('link', { name: 'Xem hồ sơ' })
    // Ô chọn dịch vụ (select gốc) cũng mang role combobox và đứng đầu.
    const [, cityBox, districtBox] = screen.getAllByRole('combobox') as HTMLInputElement[]
    expect(districtBox.disabled).toBe(true)
    fireEvent.focus(cityBox)
    fireEvent.change(cityBox, { target: { value: 'ho chi' } })
    fireEvent.click(await screen.findByRole('option', { name: 'Hồ Chí Minh' }))
    await waitFor(() => expect(fetchMock.mock.calls.some(([input]) => decodeURIComponent(String(input)).replace(/\+/g, ' ').includes('city=Hồ Chí Minh'))).toBe(true))
    expect((screen.getAllByRole('combobox')[2] as HTMLInputElement).disabled).toBe(false)

    // Trang hồ sơ chỉ hiển thị thông tin + nút đặt lịch, không có time picker
    fireEvent.click((await screen.findAllByRole('link', { name: 'Xem hồ sơ' }))[0])
    expect(await screen.findByText('Dịch vụ & bảng giá')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '08:00' })).toBeNull()

    // Bấm "Đặt lịch ngay" → trang booking, bước 1: chọn dịch vụ + giờ
    fireEvent.click(screen.getByRole('link', { name: /Đặt lịch ngay/ }))

    // Lịch rảnh 08:00–12:00 giờ VN: mặc định chọn ca tối thiểu 2 giờ đầu tiên.
    expect((await screen.findByRole('button', { name: '08:00' })).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /2 giờ.*đến 10:00/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: '10:30' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(await screen.findByRole('heading', { name: 'Xác nhận & đặt cọc' })).toBeTruthy()

    fireEvent.click(await screen.findByLabelText(/Lau tủ lạnh/))
    await screen.findByText('Đặt cọc ngay (15%)')
    fireEvent.click(screen.getByRole('button', { name: 'Đặt lịch & giữ chỗ' }))

    expect(await screen.findByText('Đơn #AB261012HXQDC2')).toBeTruthy()
    expect(JSON.parse(String(postTo('/bookings')?.body))).toEqual({
      providerId, serviceCategoryId: 'cat-1', customerAddressId: 'addr-1', startsAtUtc: '2099-01-01T01:00:00.000Z', endsAtUtc: '2099-01-01T03:00:00.000Z', checklistItemIds: ['i1'],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán cọc' }))
    expect(await screen.findByText('Cổng thanh toán giả lập')).toBeTruthy()
    expect(new Headers(postTo('/bookings/b1/deposit')?.headers).get('Idempotency-Key')).toBeTruthy()
  })
})

describe('customer address form', () => {
  function renderAddressBook(wards: unknown, addresses: unknown[] = []) {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith(wardsPath)) return jsonResponse(wards)
      if (url.includes('/catalog/administrative-divisions')) return jsonResponse(divisions)
      if (init?.method === 'POST' || init?.method === 'PUT') return jsonResponse({ id: 'addr-new', ...JSON.parse(String(init.body)) }, 201)
      return jsonResponse(addresses)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AddressPicker /></QueryClientProvider>)
    return fetchMock
  }

  async function chooseQuan1() {
    await screen.findByRole('option', { name: 'Hồ Chí Minh' })
    fireEvent.change(screen.getByLabelText('Tỉnh / Thành phố'), { target: { value: 'Hồ Chí Minh' } })
    fireEvent.change(screen.getByLabelText('Quận / Huyện'), { target: { value: 'Quận 1' } })
  }

  it('lists the wards of the chosen district and saves the ward name', async () => {
    const fetchMock = renderAddressBook(quan1Wards)
    fireEvent.click(await screen.findByRole('button', { name: /Thêm địa chỉ mới/ }))
    expect((screen.getByLabelText('Phường / Xã') as HTMLSelectElement).disabled).toBe(true)

    await chooseQuan1()
    await screen.findByRole('option', { name: 'Phường Tân Định' })
    const wardSelect = screen.getByLabelText('Phường / Xã') as HTMLSelectElement
    expect([...wardSelect.options].map((option) => option.text)).toEqual(['Chọn phường / xã', 'Phường Tân Định', 'Phường Bến Nghé'])

    fireEvent.change(screen.getByLabelText('Số căn hộ'), { target: { value: 'A-1205' } })
    fireEvent.change(screen.getByLabelText('Tòa nhà / Chung cư'), { target: { value: 'Vinhomes' } })
    fireEvent.change(screen.getByLabelText('Số nhà, tên đường'), { target: { value: '12 Lê Lợi' } })
    fireEvent.change(wardSelect, { target: { value: 'Phường Tân Định' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu địa chỉ' }))

    await waitFor(() => expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true))
    const body = JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')?.[1]?.body))
    expect(body).toMatchObject({ city: 'Hồ Chí Minh', district: 'Quận 1', ward: 'Phường Tân Định' })
  })

  it('resets the ward when the district changes', async () => {
    renderAddressBook(quan1Wards)
    fireEvent.click(await screen.findByRole('button', { name: /Thêm địa chỉ mới/ }))
    await chooseQuan1()
    await screen.findByRole('option', { name: 'Phường Tân Định' })
    fireEvent.change(screen.getByLabelText('Phường / Xã'), { target: { value: 'Phường Tân Định' } })
    fireEvent.change(screen.getByLabelText('Quận / Huyện'), { target: { value: '' } })
    const wardSelect = screen.getByLabelText('Phường / Xã') as HTMLSelectElement
    expect(wardSelect.value).toBe('')
    expect(wardSelect.disabled).toBe(true)
  })

  it('falls back to a free-text ward when the server has no ward data', async () => {
    renderAddressBook([])
    fireEvent.click(await screen.findByRole('button', { name: /Thêm địa chỉ mới/ }))
    await chooseQuan1()
    await waitFor(() => expect(screen.getByLabelText('Phường / Xã').tagName).toBe('INPUT'))
  })

  it('keeps a previously typed ward that is not in the list when editing', async () => {
    renderAddressBook(quan1Wards, [{ id: 'addr-1', label: 'Nhà', apartmentNumber: 'A-1205', floor: null, buildingName: 'Vinhomes', streetAddress: '12 Lê Lợi', ward: 'Bến Nghé cũ', district: 'Quận 1', city: 'Hồ Chí Minh', accessInstructions: null, isDefault: true }])
    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    await screen.findByRole('option', { name: 'Phường Tân Định' })
    const wardSelect = screen.getByLabelText('Phường / Xã') as HTMLSelectElement
    expect(wardSelect.value).toBe('Bến Nghé cũ')
    expect([...wardSelect.options].map((option) => option.text)).toContain('Bến Nghé cũ')
  })
})
