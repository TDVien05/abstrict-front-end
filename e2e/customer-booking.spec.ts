import { test, expect, type BrowserContext, type Route } from '@playwright/test'

const PROVIDER_ID = 'prov-0001'
const BOOKING_ID = 'book-0001'
const PAYMENT_ID = 'pay-0001'
const ADDRESS = {
  id: 'addr-1', label: 'Nhà', apartmentNumber: 'A-1205', floor: '12', buildingName: 'Vinhomes Central Park',
  streetAddress: '720A Điện Biên Phủ', ward: 'Phường 22', district: 'Bình Thạnh', city: 'TP. Hồ Chí Minh',
  accessInstructions: null, isDefault: true,
}
const SERVICE = { serviceCategoryId: 'cat-1', code: 'CLEANING', name: 'Dọn dẹp nhà cửa', hourlyRateVnd: 100_000, description: 'Dọn dẹp định kỳ' }
const HOURLY = SERVICE.hourlyRateVnd

type Status = 'PendingDeposit' | 'PendingProviderConfirmation' | 'Confirmed'
interface State {
  created: boolean
  status: Status
  startsAtUtc: string
  endsAtUtc: string
  payment: null | { paymentId: string; status: 'Pending' | 'Succeeded'; amountVnd: number; method: string; expiresAtUtc: null; checkoutUrl: null }
  timeline: { fromStatus: Status; toStatus: Status; reason: string | null; note: null; atUtc: string }[]
}

const state: State = { created: false, status: 'PendingDeposit', startsAtUtc: '', endsAtUtc: '', payment: null, timeline: [] }
const unhandled: string[] = []
const pageErrors: string[] = []

function vnTomorrow() {
  return new Date(Date.now() + 86_400_000 + 7 * 3_600_000).toISOString().slice(0, 10)
}

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

function loginResponse(role: 'Customer' | 'Freelancer') {
  return {
    accessToken: `token-${role}`, tokenType: 'Bearer', expiresAtUtc: new Date(Date.now() + 3_600_000).toISOString(),
    userId: role === 'Customer' ? 'user-c' : 'user-f', fullName: role === 'Customer' ? 'Nguyễn Văn Khách' : 'Trần Thu Hà',
    phoneNumber: role === 'Customer' ? '0901234567' : '0907654321', role,
    customerProfile: role === 'Customer' ? { avatarUrl: null } : null,
    freelancerOnboarding: role === 'Freelancer' ? { providerId: PROVIDER_ID, kycStatus: 'Approved', currentStep: 'Completed' } : null,
    companyOnboarding: null,
  }
}

function amounts() {
  const minutes = (Date.parse(state.endsAtUtc) - Date.parse(state.startsAtUtc)) / 60_000
  const base = (minutes / 60) * HOURLY
  const deposit = Math.round(base * 0.3)
  return { minutes, base, deposit, remaining: base - deposit }
}

function allowedCustomerActions() {
  return state.status === 'PendingDeposit' ? ['PayDeposit', 'Cancel'] : state.status === 'PendingProviderConfirmation' ? ['Cancel'] : ['ShowCheckInQr', 'Cancel']
}

function customerBooking() {
  const a = amounts()
  return {
    id: BOOKING_ID, bookingNumber: 'BK-0001', status: state.status, providerId: PROVIDER_ID, providerDisplayName: 'Trần Thu Hà',
    serviceCategoryCode: SERVICE.code, serviceCategoryName: SERVICE.name, startsAtUtc: state.startsAtUtc, endsAtUtc: state.endsAtUtc,
    baseAmountVnd: a.base, depositAmountVnd: a.deposit, holdExpiresAtUtc: state.status === 'PendingDeposit' ? new Date(Date.now() + 900_000).toISOString() : null,
    addressSnapshot: 'A-1205, Vinhomes Central Park, 720A Điện Biên Phủ, Phường 22, Bình Thạnh, TP. Hồ Chí Minh',
    customerNote: null, unitPriceVnd: HOURLY, surchargeAmountVnd: 0, extensionAmountVnd: 0, remainingAmountVnd: a.remaining,
    providerConfirmationDeadlineUtc: state.status === 'PendingProviderConfirmation' ? new Date(Date.now() + 7_200_000).toISOString() : null,
    cancelledAtUtc: null, cancellationReason: null, depositPayment: state.payment,
    tasks: [{ id: 't1', areaName: 'Phòng khách', description: 'Lau sàn', sortOrder: 1, status: 'Pending' }],
    timeline: state.timeline, allowedActions: allowedCustomerActions(), serverTimeUtc: new Date().toISOString(),
  }
}

function freelancerBooking() {
  const a = amounts()
  return {
    id: BOOKING_ID, bookingNumber: 'BK-0001', status: state.status, customerName: 'Nguyễn Văn Khách',
    serviceCategoryCode: SERVICE.code, serviceCategoryName: SERVICE.name, startsAtUtc: state.startsAtUtc, endsAtUtc: state.endsAtUtc,
    baseAmountVnd: a.base, depositAmountVnd: a.deposit, areaLabel: 'Bình Thạnh, TP. Hồ Chí Minh',
    providerConfirmationDeadlineUtc: state.status === 'PendingProviderConfirmation' ? new Date(Date.now() + 7_200_000).toISOString() : null,
    allowedActions: state.status === 'PendingProviderConfirmation' ? ['Confirm', 'Reject'] : [],
    addressSnapshot: null, customerNote: null,
    tasks: [{ id: 't1', areaName: 'Phòng khách', description: 'Lau sàn', sortOrder: 1, status: 'Pending' }],
    timeline: state.timeline,
  }
}

function move(to: Status, reason: string) {
  state.timeline.push({ fromStatus: state.status, toStatus: to, reason, note: null, atUtc: new Date().toISOString() })
  state.status = to
}

async function installApi(context: BrowserContext, role: 'Customer' | 'Freelancer') {
  await context.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const method = request.method()

    if (path === '/auth/refresh') return json(route, loginResponse(role))
    if (path === `/freelancers/${PROVIDER_ID}` && method === 'GET') {
      return json(route, { providerId: PROVIDER_ID, displayName: 'Trần Thu Hà', bio: null, gender: null, averageRating: 4.9, ratingCount: 12, completedBookingCount: 30, experienceYears: 3, isAcceptingBookings: true, services: [SERVICE], serviceAreas: [] })
    }
    if (path === `/freelancers/${PROVIDER_ID}/availability`) {
      const d = vnTomorrow()
      return json(route, {
        providerId: PROVIDER_ID, timeZone: 'Asia/Ho_Chi_Minh', slotStepMinutes: 30, minimumDurationMinutes: 120,
        days: [{ date: d, free: [{ startsAtUtc: new Date(`${d}T08:00:00+07:00`).toISOString(), endsAtUtc: new Date(`${d}T18:00:00+07:00`).toISOString() }], busy: [] }],
      })
    }
    if (path === '/customer/addresses' && method === 'GET') return json(route, [ADDRESS])
    if (path === `/catalog/service-categories/${SERVICE.code}/checklist`) {
      return json(route, { templateId: 'tpl', name: 'Dọn dẹp', version: 1, items: [
        { id: 'i1', parentItemId: null, areaName: 'Phòng khách', description: 'Lau sàn', sortOrder: 1, isRequired: true },
        { id: 'i2', parentItemId: null, areaName: 'Bếp', description: 'Lau bếp', sortOrder: 2, isRequired: false },
      ] })
    }
    if (path === '/bookings/quote') {
      const body = request.postDataJSON() as { startsAtUtc: string; endsAtUtc: string }
      const minutes = (Date.parse(body.endsAtUtc) - Date.parse(body.startsAtUtc)) / 60_000
      const base = (minutes / 60) * HOURLY
      return json(route, { unitPriceVnd: HOURLY, durationMinutes: minutes, baseAmountVnd: base, surchargeAmountVnd: 0, depositAmountVnd: Math.round(base * 0.3), depositPercent: 30, remainingAmountVnd: base - Math.round(base * 0.3), holdMinutes: 15 })
    }
    if (path === '/bookings' && method === 'POST') {
      const body = request.postDataJSON() as { startsAtUtc: string; endsAtUtc: string }
      Object.assign(state, { created: true, status: 'PendingDeposit', startsAtUtc: body.startsAtUtc, endsAtUtc: body.endsAtUtc, payment: null, timeline: [] })
      state.timeline.push({ fromStatus: 'PendingDeposit', toStatus: 'PendingDeposit', reason: 'Created', note: null, atUtc: new Date().toISOString() })
      return json(route, customerBooking(), 201)
    }
    if (path === `/bookings/${BOOKING_ID}` && method === 'GET') return json(route, customerBooking())
    if (path === `/bookings/${BOOKING_ID}/deposit`) {
      state.payment = { paymentId: PAYMENT_ID, status: 'Pending', amountVnd: amounts().deposit, method: 'Momo', expiresAtUtc: null, checkoutUrl: null }
      return json(route, state.payment)
    }
    if (path === `/payments/sandbox/${PAYMENT_ID}/confirm`) {
      state.payment = { ...state.payment!, status: 'Succeeded' }
      move('PendingProviderConfirmation', 'DepositPaid')
      return json(route, state.payment)
    }
    if (path === `/freelancer/bookings/${BOOKING_ID}` && method === 'GET') return json(route, freelancerBooking())
    if (path === `/freelancer/bookings/${BOOKING_ID}/confirm`) {
      move('Confirmed', 'ProviderConfirmed')
      return json(route, freelancerBooking())
    }

    unhandled.push(`${method} ${path}`)
    return json(route, { status: 404, title: 'Not mocked' }, 404)
  })
}

test.describe.configure({ mode: 'serial' })

test.describe('Luồng booking Customer → Freelancer xác nhận (mock API)', () => {
  test.afterAll(() => {
    console.log('UNHANDLED_API_CALLS:', JSON.stringify([...new Set(unhandled)]))
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
  })

  test('customer chọn dịch vụ, khung giờ, xác nhận và đặt lịch', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://localhost:5173' })
    await installApi(context, 'Customer')
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await page.goto(`/book/${PROVIDER_ID}`)
    await expect(page.getByRole('heading', { name: 'Chọn dịch vụ & thời gian' })).toBeVisible()
    await page.getByRole('button', { name: /Dọn dẹp nhà cửa/ }).click()
    await page.getByRole('group', { name: 'Giờ bắt đầu' }).getByRole('button', { name: '09:00', exact: true }).click()
    await page.getByRole('group', { name: 'Thời lượng' }).getByRole('button', { name: /^3 giờ/ }).click()
    await expect(page.getByText('09:00 – 12:00')).toBeVisible()
    await expect(page.getByText('300.000')).toBeVisible()

    await page.getByRole('button', { name: /Tiếp tục/ }).click()
    await expect(page.getByRole('heading', { name: 'Xác nhận & đặt cọc' })).toBeVisible()
    await expect(page.getByText('Vinhomes Central Park')).toBeVisible()
    await expect(page.getByText(/Đặt cọc ngay \(30%\)/)).toBeVisible()
    await page.getByPlaceholder('Thú cưng, lưu ý khi đến...').fill('Nhà có chó nhỏ')

    await page.getByRole('button', { name: 'Đặt lịch & giữ chỗ' }).click()
    await expect(page).toHaveURL(new RegExp(`/orders/${BOOKING_ID}$`))
    await expect(page.getByText('Chờ đặt cọc', { exact: true })).toBeVisible()
    await context.close()
  })

  test('customer đặt cọc (sandbox) → đơn chuyển sang chờ đối tác xác nhận', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://localhost:5173' })
    await installApi(context, 'Customer')
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await page.goto(`/orders/${BOOKING_ID}`)
    await expect(page.getByRole('heading', { name: /Đặt cọc/ })).toBeVisible()
    await page.getByRole('button', { name: 'Thanh toán cọc' }).click()
    await expect(page.getByText('Cổng thanh toán giả lập')).toBeVisible()
    await page.getByRole('button', { name: 'Giả lập thành công' }).click()

    await expect(page.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible()
    await expect(page.getByText(/Đã nhận cọc\. Đối tác cần xác nhận trước/)).toBeVisible()
    await context.close()
  })

  test('freelancer xác nhận nhận ca', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://localhost:5173' })
    await installApi(context, 'Freelancer')
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await page.goto(`/partner/orders/${BOOKING_ID}`)
    await expect(page.getByRole('heading', { name: 'Xử lý đơn hàng' })).toBeVisible()
    await expect(page.getByText('Nguyễn Văn Khách')).toBeVisible()
    await expect(page.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Xác nhận nhận ca' }).click()
    await page.getByRole('button', { name: 'Đồng ý nhận ca' }).click()
    await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Xác nhận nhận ca' })).toHaveCount(0)
    await context.close()
  })

  test('customer thấy đơn đã được xác nhận', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: 'http://localhost:5173' })
    await installApi(context, 'Customer')
    const page = await context.newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))

    await page.goto(`/orders/${BOOKING_ID}`)
    await expect(page.getByText('Đã xác nhận', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Đối tác xác nhận', { exact: true })).toBeVisible()
    await context.close()
  })
})
