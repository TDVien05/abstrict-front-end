// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BookingCreatePage } from './BookingCreatePage'
import { CustomerDiscoveryPage } from './CustomerDiscoveryPage'
import { CustomerProviderPage } from './CustomerProviderPage'
import { OrderDetailPage } from './OrderDetailPage'

const providerId = 'dddddddd-0000-0000-0000-000000000001'

const booking = {
  id: 'b1', bookingNumber: 'AB261012HXQDC2', status: 'PendingDeposit', providerId, providerDisplayName: 'Nguyễn Thị Lan', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, holdExpiresAtUtc: '2099-01-01T00:00:00+00:00',
  addressSnapshot: 'A-1205, Vinhomes, 12 Lê Lợi, Bến Nghé, Quận 1, Hồ Chí Minh', customerNote: null, unitPriceVnd: 80000, surchargeAmountVnd: 0, extensionAmountVnd: 0, remainingAmountVnd: 136000,
  providerConfirmationDeadlineUtc: null, cancelledAtUtc: null, cancellationReason: null, depositPayment: null as unknown, tasks: [], timeline: [], allowedActions: ['PayDeposit', 'Cancel'], serverTimeUtc: '2098-12-31T23:50:00+00:00',
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
      if (url.includes(`/freelancers/${providerId}`)) {
        return jsonResponse({
          providerId, displayName: 'Nguyễn Thị Lan', bio: 'Dọn dẹp gọn gàng.', gender: 'Female', averageRating: 4.8, ratingCount: 42, completedBookingCount: 38, experienceYears: 6, isAcceptingBookings: true,
          services: [{ serviceCategoryId: 'cat-1', code: 'CLEANING', name: 'Dọn dẹp', hourlyRateVnd: 80000, description: null }],
          serviceAreas: [{ id: 'a1', city: 'Hồ Chí Minh', district: 'Quận 1', wardOrComplex: null, travelRadiusKm: 10 }],
        })
      }
      if (url.includes('/checklist')) return jsonResponse({ templateId: 't1', name: 'Dọn dẹp', version: 1, items: [{ id: 'i1', parentItemId: null, areaName: 'Bếp', description: 'Lau tủ lạnh', sortOrder: 1, isRequired: false }] })
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

    fireEvent.click((await screen.findAllByRole('link', { name: 'Xem hồ sơ' }))[0])
    expect(await screen.findByText('Dịch vụ & bảng giá')).toBeTruthy()

    // Lịch rảnh 08:00–12:00 giờ VN: mặc định chọn ca tối thiểu 2 giờ đầu tiên.
    expect((await screen.findByRole('button', { name: '08:00' })).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /2 giờ.*đến 10:00/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('button', { name: '10:30' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục đặt lịch/ }))
    expect(await screen.findByRole('heading', { name: 'Xác nhận đặt dịch vụ & ký quỹ' })).toBeTruthy()

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
