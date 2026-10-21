import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, request as pwRequest, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test'

// Các case ngoài luồng chính của booking, chạy với backend thật (docker, cổng 8080).
// Dữ liệu thử: backend/scripts/seed-fake-freelancers.ps1 và seed-booking-fixtures.ps1.
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const CUSTOMER = { phone: process.env.E2E_CUSTOMER_PHONE ?? '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: process.env.E2E_FREELANCER_PHONE ?? '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000001'
const UNAPPROVED_PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000006'
const COOKING_CATEGORY_ID = 'aaaaaaaa-0000-0000-0000-000000000003'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

type Who = { phone: string; password: string }
interface Slot { startsAtUtc: string; endsAtUtc: string }
interface Row { id: string; expected: string; actual: string; ok: boolean }

let ctx: APIRequestContext
let customerToken = ''
let freelancerToken = ''
let serviceCategoryId = ''
let addressId = ''
let rateLimited = 0
const rows: Row[] = []
const pageErrors: string[] = []
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// Backend giới hạn 30 request ghi / 10 phút / người dùng nên test tự theo dõi và chờ trước mỗi case.
const WRITE_LIMIT = 27
const writes = new Map<string, number[]>()
const isBookingWrite = (method: string, path: string) => method !== 'GET' && !path.startsWith('/auth') && !path.endsWith('/bookings/quote')
function noteWrite(who: string) { writes.set(who, [...(writes.get(who) ?? []), Date.now()]) }
async function budget(who: string, needed: number) {
  for (;;) {
    const now = Date.now()
    const recent = (writes.get(who) ?? []).filter((t) => now - t < 600_000)
    writes.set(who, recent)
    if (recent.length + needed <= WRITE_LIMIT) return
    await sleep(Math.max(1_000, recent[0] + 600_000 - now + 1_000))
  }
}

async function call(token: string | null, method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  if (token && isBookingWrite(method, path)) noteWrite(token === customerToken ? 'customer' : 'freelancer')
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await ctx.fetch(API + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, data: body as never })
    if (res.status() === 429) {
      rateLimited++
      await sleep(Math.min(Number(res.headers()['retry-after'] ?? 60), 120) * 1000)
      continue
    }
    const text = await res.text()
    let json: any
    try { json = JSON.parse(text) } catch { json = undefined }
    return { status: res.status(), json, code: json?.code as string | undefined }
  }
  throw new Error(`Vẫn bị 429 sau nhiều lần thử: ${method} ${path}`)
}

async function tokenOf(who: Who) {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: who.phone, password: who.password })
  expect(r.status, `đăng nhập ${who.phone}`).toBe(200)
  return r.json.accessToken as string
}

// Khung rảnh muộn nhất còn trống; mỗi lần đặt xong khung đó bị chiếm nên lần sau tự chuyển sang khung khác.
async function pickSlot(hours = 2): Promise<Slot> {
  const r = await call(null, 'GET', `/freelancers/${PROVIDER_ID}/availability?days=14`)
  const ranges = (r.json.days as { free: Slot[] }[]).flatMap((d) => d.free).filter((x) => Date.parse(x.startsAtUtc) > Date.now() + 4 * 3_600_000)
  ranges.sort((a, b) => Date.parse(b.startsAtUtc) - Date.parse(a.startsAtUtc))
  expect(ranges.length, 'phải còn khung rảnh (chạy lại seed-booking-fixtures.ps1 nếu hết)').toBeGreaterThan(0)
  const start = new Date(ranges[0].startsAtUtc).toISOString()
  return { startsAtUtc: start, endsAtUtc: new Date(Date.parse(start) + hours * 3_600_000).toISOString() }
}

const bookingBody = (slot: Slot, extra: Record<string, unknown> = {}) =>
  ({ providerId: PROVIDER_ID, serviceCategoryId, customerAddressId: addressId, ...slot, ...extra })

async function createBooking(slot?: Slot) {
  const r = await call(customerToken, 'POST', '/bookings', bookingBody(slot ?? await pickSlot()))
  expect(r.status, `tạo đơn: ${JSON.stringify(r.json)}`).toBe(201)
  return r.json as { id: string; depositAmountVnd: number; status: string }
}

async function payDeposit(bookingId: string, succeeded = true) {
  const d = await call(customerToken, 'POST', `/bookings/${bookingId}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() })
  expect(d.status, `khởi tạo cọc: ${JSON.stringify(d.json)}`).toBe(200)
  const c = await call(customerToken, 'POST', `/payments/sandbox/${d.json.paymentId}/confirm`, { succeeded })
  expect(c.status, `chốt sandbox: ${JSON.stringify(c.json)}`).toBe(200)
}

const getBooking = async (id: string) => (await call(customerToken, 'GET', `/bookings/${id}`)).json
const cancelBooking = (id: string) => call(customerToken, 'POST', `/bookings/${id}/cancel`, {})

function sql(query: string) {
  return execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'abstrict', '-d', 'abstrict', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()
}
const asGuid = (id: string) => { expect(id).toMatch(GUID); return id }

async function waitForStatus(id: string, wanted: string, timeoutMs = 180_000) {
  const until = Date.now() + timeoutMs
  let status = ''
  while (Date.now() < until) {
    status = (await getBooking(id)).status
    if (status === wanted) return status
    await sleep(5_000)
  }
  return status
}

function record(id: string, expected: string, r: { status: number; code?: string }) {
  const actual = `${r.status}${r.code ? ' ' + r.code : ''}`
  const ok = actual === expected
  rows.push({ id, expected, actual, ok })
  expect.soft(actual, id).toBe(expected)
}

// /auth/login giới hạn 10 lần/phút nên chỉ đăng nhập UI một lần mỗi vai trò, các context sau dùng lại cookie phiên.
const sessions = new Map<string, Awaited<ReturnType<BrowserContext['storageState']>>>()

async function openAs(browser: Browser, who: Who, loginPath: string): Promise<Page> {
  const saved = sessions.get(who.phone)
  const context = await browser.newContext(saved ? { storageState: saved } : {})
  const page = await context.newPage()
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('request', (r) => {
    const path = new URL(r.url()).pathname.replace('/api/v1', '')
    if (r.url().includes('/api/v1/') && isBookingWrite(r.method(), path)) noteWrite(who === CUSTOMER ? 'customer' : 'freelancer')
  })
  if (saved) return page
  await page.goto(loginPath)
  await page.getByPlaceholder('090 123 4567').fill(who.phone)
  await page.getByPlaceholder('••••••••').fill(who.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/\/(partners\/)?login/)
  sessions.set(who.phone, await context.storageState())
  return page
}

const asCustomer = (browser: Browser) => openAs(browser, CUSTOMER, '/login')
const asFreelancer = (browser: Browser) => openAs(browser, FREELANCER, '/partners/login')

test.describe.configure({ mode: 'serial' })

test.describe('Booking – các nhánh ngoài luồng chính (backend thật)', () => {
  const writeNeeds: [RegExp, number][] = [
    [/freelancer từ chối/, 4], [/hết hạn xác nhận/, 6], [/thanh toán thất bại/, 6], [/hủy đơn đang chờ/, 2], [/hủy đơn chưa đặt cọc/, 5],
    [/hủy đơn đã xác nhận/, 10], [/địa chỉ ngoài/, 4], [/khung giờ vừa/, 6], [/các mã lỗi/, 13],
  ]
  test.beforeEach(async ({}, testInfo) => {
    test.setTimeout(1_800_000)
    await budget('customer', writeNeeds.find(([pattern]) => pattern.test(testInfo.title))?.[1] ?? 0)
  })

  test.beforeAll(async () => {
    test.setTimeout(1_800_000)
    ctx = await pwRequest.newContext()
    customerToken = await tokenOf(CUSTOMER)
    freelancerToken = await tokenOf(FREELANCER)
    const provider = await call(null, 'GET', `/freelancers/${PROVIDER_ID}`)
    serviceCategoryId = provider.json.services.find((s: { code: string }) => s.code === 'CLEANING').serviceCategoryId
    const addresses = (await call(customerToken, 'GET', '/customer/addresses')).json as { id: string; district: string }[]
    addressId = addresses.find((a) => a.district === 'Quận 1')!.id
    // Thăm dò giới hạn ghi: nếu lần chạy trước còn chiếm cửa sổ 10 phút thì call() tự chờ ở đây.
    await call(customerToken, 'POST', `/bookings/${crypto.randomUUID()}/cancel`, {})
    // Dọn các đơn chờ cọc còn sót lại để không chạm giới hạn 3 đơn chờ cọc.
    const stale = (await call(customerToken, 'GET', '/bookings?status=PendingDeposit&pageSize=50')).json.items as { id: string }[]
    for (const b of stale) await cancelBooking(b.id)
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/negative-cases.json', JSON.stringify({ rows, rateLimited, pageErrors }, null, 2))
    console.log('CASE_ROWS:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
  })

  test('freelancer từ chối đơn → customer thấy "Bị từ chối", cọc được hoàn', async ({ browser }) => {
    const booking = await createBooking()
    await payDeposit(booking.id)

    const fPage = await asFreelancer(browser)
    await fPage.goto(`/partner/orders/${booking.id}`)
    await expect(fPage.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible()
    await fPage.getByRole('button', { name: 'Từ chối', exact: true }).click()
    await expect(fPage.getByText('Khách sẽ được hoàn đủ tiền cọc.')).toBeVisible()
    await fPage.getByLabel('Lý do từ chối').selectOption('Bận việc đột xuất')
    await fPage.getByRole('button', { name: 'Gửi lý do từ chối' }).click()
    await expect(fPage.getByText('Bị từ chối', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(fPage.getByRole('button', { name: 'Xác nhận nhận ca' })).toHaveCount(0)

    const cPage = await asCustomer(browser)
    await cPage.goto(`/orders/${booking.id}`)
    await expect(cPage.getByText('Bị từ chối', { exact: true })).toBeVisible()
    await expect(cPage.getByText('Đối tác từ chối', { exact: true })).toBeVisible()
    await expect(cPage.getByText('“Bận việc đột xuất”')).toBeVisible()

    const detail = await getBooking(booking.id)
    expect(detail.allowedActions).toEqual([])
    expect.soft(['Refunded', 'PartiallyRefunded'], 'trạng thái giao dịch cọc sau khi từ chối').toContain(detail.depositPayment?.status)
    rows.push({ id: 'freelancer từ chối: trạng thái cọc', expected: 'Refunded', actual: String(detail.depositPayment?.status), ok: detail.depositPayment?.status === 'Refunded' })
  })

  test('hết hạn xác nhận và hết hạn giữ chỗ (ép mốc thời gian, chờ job nền xử lý)', async ({ browser }) => {
    const awaiting = await createBooking()
    await payDeposit(awaiting.id)
    const held = await createBooking()

    sql(`update bookings set provider_confirmation_deadline_utc = now() - interval '1 minute' where id = '${asGuid(awaiting.id)}'`)
    sql(`update bookings set hold_expires_at_utc = now() - interval '1 minute' where id = '${asGuid(held.id)}'`)

    // Trước khi job chạy: thao tác quá hạn phải bị chặn.
    const lateConfirm = await call(freelancerToken, 'POST', `/freelancer/bookings/${awaiting.id}/confirm`)
    expect.soft(['409 CONFIRMATION_EXPIRED', '409 BOOKING_INVALID_STATE']).toContain(`${lateConfirm.status} ${lateConfirm.code}`)
    rows.push({ id: 'freelancer xác nhận sau hạn', expected: '409 CONFIRMATION_EXPIRED', actual: `${lateConfirm.status} ${lateConfirm.code}`, ok: lateConfirm.code === 'CONFIRMATION_EXPIRED' })
    const lateDeposit = await call(customerToken, 'POST', `/bookings/${held.id}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() })
    expect.soft(['409 HOLD_EXPIRED', '409 BOOKING_INVALID_STATE']).toContain(`${lateDeposit.status} ${lateDeposit.code}`)
    rows.push({ id: 'đặt cọc sau khi hết giữ chỗ', expected: '409 HOLD_EXPIRED', actual: `${lateDeposit.status} ${lateDeposit.code}`, ok: lateDeposit.code === 'HOLD_EXPIRED' })

    expect(await waitForStatus(awaiting.id, 'Expired'), 'đơn quá hạn xác nhận phải chuyển Expired').toBe('Expired')
    expect(await waitForStatus(held.id, 'Expired'), 'đơn hết giữ chỗ phải chuyển Expired').toBe('Expired')
    const a = await getBooking(awaiting.id)
    const h = await getBooking(held.id)
    expect(a.timeline.at(-1).reason).toBe('ConfirmationExpired')
    expect(h.timeline.at(-1).reason).toBe('HoldExpired')
    rows.push({ id: 'cọc sau khi quá hạn xác nhận', expected: 'Refunded', actual: String(a.depositPayment?.status), ok: a.depositPayment?.status === 'Refunded' })
    expect.soft(['Refunded', 'PartiallyRefunded'], 'cọc phải được hoàn khi đối tác không phản hồi').toContain(a.depositPayment?.status)

    const cPage = await asCustomer(browser)
    await cPage.goto(`/orders/${awaiting.id}`)
    await expect(cPage.getByText('Hết hạn', { exact: true })).toBeVisible()
    await expect(cPage.getByText('Đối tác không phản hồi kịp hạn', { exact: true })).toBeVisible()
    await cPage.goto(`/orders/${held.id}`)
    await expect(cPage.getByText('Hết hạn', { exact: true })).toBeVisible()
    await expect(cPage.getByText('Hết thời gian giữ chỗ', { exact: true })).toBeVisible()

    const fPage = await asFreelancer(browser)
    await fPage.goto(`/partner/orders/${awaiting.id}`)
    await expect(fPage.getByText('Hết hạn', { exact: true })).toBeVisible()
    await expect(fPage.getByRole('button', { name: 'Xác nhận nhận ca' })).toHaveCount(0)
  })

  let paidThenCancelId = ''

  test('thanh toán thất bại giữ đơn ở "Chờ đặt cọc", thanh toán lại thành công', async ({ browser }) => {
    const booking = await createBooking()
    paidThenCancelId = booking.id
    const page = await asCustomer(browser)
    await page.goto(`/orders/${booking.id}`)

    await page.getByRole('button', { name: 'Thanh toán cọc' }).click()
    await page.getByRole('button', { name: 'Giả lập thất bại' }).click()
    await expect(page.getByText('Thanh toán không thành công. Bạn có thể thử lại trong thời gian giữ chỗ.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Chờ đặt cọc', { exact: true })).toBeVisible()
    expect((await getBooking(booking.id)).status).toBe('PendingDeposit')

    await page.getByRole('button', { name: 'Thanh toán lại' }).click()
    await page.getByRole('button', { name: 'Giả lập thành công' }).click()
    await expect(page.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('customer hủy đơn đang chờ đối tác xác nhận → hoàn đủ cọc', async ({ browser }) => {
    const page = await asCustomer(browser)
    await page.goto(`/orders/${paidThenCancelId}`)
    const before = await getBooking(paidThenCancelId)
    expect(before.status).toBe('PendingProviderConfirmation')

    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click()
    await expect(page.getByText('Hoàn lại cho bạn')).toBeVisible({ timeout: 15_000 })
    const preview = (await call(customerToken, 'GET', `/bookings/${paidThenCancelId}/cancellation-preview`)).json
    expect(preview.refundAmountVnd).toBe(before.depositAmountVnd)
    expect(preview.retainedAmountVnd).toBe(0)

    await page.getByLabel('Lý do (không bắt buộc)').fill('E2E hủy khi chờ xác nhận')
    await page.getByRole('button', { name: 'Xác nhận hủy' }).click()
    await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Lý do hủy: E2E hủy khi chờ xác nhận')).toBeVisible()
    expect.soft(['Refunded', 'PartiallyRefunded']).toContain((await getBooking(paidThenCancelId)).depositPayment?.status)
  })

  test('customer hủy đơn chưa đặt cọc; hủy/đặt cọc lại đơn đã hủy bị từ chối', async ({ browser }) => {
    const booking = await createBooking()
    const page = await asCustomer(browser)
    await page.goto(`/orders/${booking.id}`)
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click()
    await expect(page.getByText('Hoàn lại cho bạn')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Xác nhận hủy' }).click()
    await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible({ timeout: 15_000 })

    record('hủy đơn đã hủy', '409 BOOKING_NOT_CANCELLABLE', await cancelBooking(booking.id))
    record('đặt cọc đơn đã hủy', '409 BOOKING_INVALID_STATE', await call(customerToken, 'POST', `/bookings/${booking.id}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() }))
  })

  test('hủy đơn đã xác nhận: còn ≥2 giờ hoàn đủ cọc; còn <2 giờ mất cọc', async ({ browser }) => {
    const early = await createBooking()
    await payDeposit(early.id)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${early.id}/confirm`)).status).toBe(200)
    record('freelancer xác nhận lần 2', '409 BOOKING_INVALID_STATE', await call(freelancerToken, 'POST', `/freelancer/bookings/${early.id}/confirm`))

    const page = await asCustomer(browser)
    await page.goto(`/orders/${early.id}`)
    await expect(page.getByText('Đã xác nhận', { exact: true }).first()).toBeVisible()
    await page.getByRole('button', { name: 'Hủy đơn', exact: true }).click()
    await expect(page.getByText(/Hủy miễn phí đến/)).toBeVisible({ timeout: 15_000 })
    const earlyPreview = (await call(customerToken, 'GET', `/bookings/${early.id}/cancellation-preview`)).json
    expect(earlyPreview.freeCancellation).toBe(true)
    expect(earlyPreview.refundAmountVnd).toBe(early.depositAmountVnd)
    await page.getByRole('button', { name: 'Xác nhận hủy' }).click()
    await expect(page.getByText('Đã hủy', { exact: true })).toBeVisible({ timeout: 15_000 })

    // Dời giờ bắt đầu của một đơn Confirmed còn 60 phút để kiểm tra nhánh hủy muộn.
    const late = await createBooking()
    await payDeposit(late.id)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${late.id}/confirm`)).status).toBe(200)
    // Đơn E2E của các phiên trước (vd. phiên check-in) có thể đang chiếm khung giờ quanh hiện tại và sẽ trùng slot sắp dời tới.
    sql(`update bookings set starts_at_utc = starts_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)), ends_at_utc = ends_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)) where customer_user_id = (select id from users where phone_number = '${CUSTOMER.phone}') and provider_id = '${PROVIDER_ID}' and status in ('PendingDeposit','PendingProviderConfirmation','Confirmed','CheckedIn','InProgress','PendingAcceptance') and ends_at_utc > now() - interval '3 hours' and starts_at_utc < now() + interval '5 hours' and id <> '${asGuid(late.id)}'`)
    sql(`update bookings set starts_at_utc = now() + interval '60 minutes', ends_at_utc = now() + interval '180 minutes' where id = '${asGuid(late.id)}'`)
    const latePreview = (await call(customerToken, 'GET', `/bookings/${late.id}/cancellation-preview`)).json
    rows.push({ id: 'hủy muộn (<2h): freeCancellation', expected: 'false', actual: String(latePreview.freeCancellation), ok: latePreview.freeCancellation === false })
    rows.push({ id: 'hủy muộn (<2h): tiền hoàn', expected: '0', actual: String(latePreview.refundAmountVnd), ok: latePreview.refundAmountVnd === 0 })
    expect.soft(latePreview.freeCancellation).toBe(false)
    expect.soft(latePreview.refundAmountVnd).toBe(0)
    expect.soft(latePreview.retainedAmountVnd).toBe(late.depositAmountVnd)
    const lateCancel = await cancelBooking(late.id)
    expect(lateCancel.status).toBe(200)
    expect(lateCancel.json.status).toBe('Cancelled')
  })

  test('địa chỉ ngoài khu vực phục vụ của freelancer', async ({ browser }) => {
    const created = await call(customerToken, 'POST', '/customer/addresses', {
      label: 'E2E Quận 5', apartmentNumber: 'B-1', floor: null, buildingName: 'E2E Tower', streetAddress: '1 Trần Hưng Đạo',
      ward: 'Phường 1', district: 'Quận 5', city: 'Hồ Chí Minh', accessInstructions: null, isDefault: false,
    })
    expect(created.status, JSON.stringify(created.json)).toBe(201)
    const outId = created.json.id as string
    try {
      record('báo giá với địa chỉ Quận 5 (freelancer chỉ phục vụ Q1/Q3/Q7)', '409 ADDRESS_OUT_OF_SERVICE_AREA',
        await call(customerToken, 'POST', '/bookings/quote', bookingBody(await pickSlot(), { customerAddressId: outId })))

      const page = await asCustomer(browser)
      await page.goto(`/book/${PROVIDER_ID}`)
      await page.getByRole('group', { name: 'Ngày làm' }).getByRole('button').last().click()
      await page.getByRole('button', { name: /Tiếp tục/ }).click()
      await expect(page.getByText(/Đặt cọc ngay \(\d+%\)/)).toBeVisible({ timeout: 15_000 })
      await page.getByRole('radio', { name: /E2E Quận 5/ }).check()
      await expect(page.getByRole('alert').filter({ hasText: 'Địa chỉ nằm ngoài khu vực phục vụ của đối tác.' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByRole('button', { name: 'Đặt lịch & giữ chỗ' })).toBeDisabled()
    } finally {
      await call(customerToken, 'DELETE', `/customer/addresses/${outId}`)
    }
  })

  test('khung giờ vừa bị người khác đặt khi customer đang ở bước xác nhận', async ({ browser }) => {
    const page = await asCustomer(browser)
    const quoteRequest = page.waitForRequest((r) => r.url().includes('/bookings/quote') && r.method() === 'POST')
    await page.goto(`/book/${PROVIDER_ID}`)
    await page.getByRole('group', { name: 'Ngày làm' }).getByRole('button').last().click()
    await page.getByRole('button', { name: /Tiếp tục/ }).click()
    const slot = (await quoteRequest).postDataJSON() as Slot
    await expect(page.getByText(/Đặt cọc ngay \(\d+%\)/)).toBeVisible({ timeout: 15_000 })

    const taken = await createBooking({ startsAtUtc: slot.startsAtUtc, endsAtUtc: slot.endsAtUtc })
    try {
      record('đặt lại đúng khung giờ vừa bị giữ (API)', '409 SLOT_UNAVAILABLE', await call(customerToken, 'POST', '/bookings', bookingBody(slot)))
      await page.getByRole('button', { name: 'Đặt lịch & giữ chỗ' }).click()
      await expect(page.getByRole('alert').filter({ hasText: /Khung giờ này vừa có người đặt|không nằm trọn trong lịch rảnh/ })).toBeVisible({ timeout: 15_000 })
      await expect(page).toHaveURL(/\/book\//)
    } finally {
      await cancelBooking(taken.id)
    }
  })

  test('các mã lỗi booking trả về từ API', async () => {
    const slot = await pickSlot()
    const quote = (body: Record<string, unknown>, token: string | null = customerToken) => call(token, 'POST', '/bookings/quote', body)
    const startMs = Date.parse(slot.startsAtUtc)
    const step = 30 * 60_000
    const soonStart = Math.ceil((Date.now() + 10 * 60_000) / step) * step
    const farStart = Math.ceil((Date.now() + 40 * 86_400_000) / step) * step
    const tomorrowVn = new Date(Date.now() + 7 * 3_600_000 + 86_400_000).toISOString().slice(0, 10)
    const range = (from: number, hours: number): Slot => ({ startsAtUtc: new Date(from).toISOString(), endsAtUtc: new Date(from + hours * 3_600_000).toISOString() })

    record('giờ lệch bước 30 phút', '400 INVALID_TIME_RANGE', await quote(bookingBody(range(startMs + 15 * 60_000, 2))))
    record('giờ kết thúc trước giờ bắt đầu', '400 INVALID_TIME_RANGE', await quote(bookingBody({ startsAtUtc: slot.endsAtUtc, endsAtUtc: slot.startsAtUtc })))
    record('thời lượng 1 giờ', '400 DURATION_TOO_SHORT', await quote(bookingBody(range(startMs, 1))))
    record('thời lượng 13 giờ', '400 DURATION_TOO_LONG', await quote(bookingBody(range(startMs, 13))))
    record('bắt đầu sau 10 phút nữa', '400 START_TOO_SOON', await quote(bookingBody(range(soonStart, 2))))
    record('bắt đầu sau 40 ngày', '400 START_TOO_FAR', await quote(bookingBody(range(farStart, 2))))
    record('mục checklist không thuộc dịch vụ', '400 INVALID_CHECKLIST_ITEM', await quote(bookingBody(slot, { checklistItemIds: [crypto.randomUUID()] })))
    record('dịch vụ freelancer không cung cấp (COOKING)', '409 SERVICE_NOT_OFFERED', await quote(bookingBody(slot, { serviceCategoryId: COOKING_CATEGORY_ID })))
    record('freelancer chưa được duyệt', '409 PROVIDER_NOT_BOOKABLE', await quote(bookingBody(slot, { providerId: UNAPPROVED_PROVIDER_ID })))
    record('freelancer không tồn tại (báo giá trả PROVIDER_NOT_BOOKABLE, khác GET hồ sơ/lịch rảnh trả 404 FREELANCER_NOT_FOUND)', '409 PROVIDER_NOT_BOOKABLE', await quote(bookingBody(slot, { providerId: crypto.randomUUID() })))
    record('địa chỉ không tồn tại', '404 ADDRESS_NOT_FOUND', await quote(bookingBody(slot, { customerAddressId: crypto.randomUUID() })))
    record('ngoài lịch rảnh (20:00-22:00 ngày mai)', '409 OUTSIDE_AVAILABILITY', await quote(bookingBody(range(Date.parse(`${tomorrowVn}T20:00:00+07:00`), 2))))
    record('báo giá không có token', '401', await quote(bookingBody(slot), null))
    record('freelancer gọi API báo giá của customer', '403', await quote(bookingBody(slot), freelancerToken))
    record('customer gọi API đơn của freelancer', '403', await call(customerToken, 'GET', '/freelancer/bookings'))
    record('xem đơn không tồn tại', '404 BOOKING_NOT_FOUND', await call(customerToken, 'GET', `/bookings/${crypto.randomUUID()}`))
    record('lọc đơn theo status không hợp lệ', '400 VALIDATION_FAILED', await call(customerToken, 'GET', '/bookings?status=NotAStatus'))

    // Đặt cọc: thiếu khóa và dùng lại khóa cho đơn khác.
    const first = await createBooking()
    const second = await createBooking()
    record('đặt cọc thiếu Idempotency-Key', '400 IDEMPOTENCY_KEY_REQUIRED', await call(customerToken, 'POST', `/bookings/${first.id}/deposit`, { method: 'Momo' }))
    const key = crypto.randomUUID()
    expect((await call(customerToken, 'POST', `/bookings/${first.id}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': key })).status).toBe(200)
    record('dùng lại Idempotency-Key cho đơn khác', '409 IDEMPOTENCY_KEY_REUSED', await call(customerToken, 'POST', `/bookings/${second.id}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': key }))

    // Giới hạn 3 đơn chờ cọc: first + second đang chờ; đơn thứ 3 được, đơn thứ 4 bị chặn.
    const third = await createBooking()
    record('đơn chờ cọc thứ 4', '409 TOO_MANY_PENDING_BOOKINGS', await call(customerToken, 'POST', '/bookings', bookingBody(await pickSlot())))
    for (const b of [first, second, third]) await cancelBooking(b.id)
  })
})
