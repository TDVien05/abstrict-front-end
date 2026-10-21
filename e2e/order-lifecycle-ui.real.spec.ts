import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { QRCodeSVG } from 'qrcode.react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { test, expect, request as pwRequest, type APIRequestContext, type Browser, type BrowserContext, type Page } from '@playwright/test'

// Vòng đời đơn đi hoàn toàn bằng giao diện (backend thật): freelancer check-in bằng cách quét QR (camera giả lập),
// làm ca, tải ảnh, hoàn tất → customer xem ảnh, nghiệm thu, đánh giá, mở khiếu nại → admin xử lý và ra quyết định.
// Chỉ phần dựng đơn (đặt lịch, đặt cọc, xác nhận, dời giờ) dùng API/DB để rút ngắn thời gian.
// Phần admin cần E2E_ADMIN_PASSWORD (và E2E_ADMIN_PHONE nếu khác 0900000001).
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
const PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000001'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
// Mỗi lần chạy gửi một đánh giá công khai thật nên nội dung phải duy nhất theo mã đơn, nếu không các lần chạy trước làm bộ chọn trùng.
const commentText = () => `Làm sạch, đúng giờ. <b>Rất tốt</b> ${bookingNumber} 😀`

type Who = { phone: string; password: string }
interface Row { id: string; expected: string; actual: string; ok: boolean }

let ctx: APIRequestContext
let customerToken = ''
let freelancerToken = ''
let bookingId = ''
let bookingNumber = ''
let disputeId = ''
let rateLimited = 0
const rows: Row[] = []
const pageErrors: string[] = []
const sessions = new Map<string, Awaited<ReturnType<BrowserContext['storageState']>>>()
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function call(token: string | null, method: string, path: string, data?: unknown, headers: Record<string, string> = {}) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await ctx.fetch(API + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers }, data: data as never, timeout: 30_000 })
    if (res.status() === 429) { rateLimited++; await sleep(Math.min(Number(res.headers()['retry-after'] ?? 60), 120) * 1000); continue }
    let json: any
    try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
    return { status: res.status(), json }
  }
  throw new Error('Vẫn bị 429 sau nhiều lần thử')
}

const login = async (who: Who) => {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: who.phone, password: who.password })
  expect(r.status, `đăng nhập ${who.phone}`).toBe(200)
  return r.json.accessToken as string
}

function sql(query: string) {
  return execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'abstrict', '-d', 'abstrict', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()
}

function note(id: string, expected: string, actual: string, ok = true) { rows.push({ id, expected, actual, ok }) }

// Đăng nhập bằng giao diện một lần mỗi tài khoản (/auth/login giới hạn 10 lần/phút), các context sau dùng lại cookie phiên.
async function openAs(browser: Browser, who: Who, loginPath: string): Promise<Page> {
  const saved = sessions.get(who.phone)
  const context = await browser.newContext(saved ? { storageState: saved } : {})
  const page = await context.newPage()
  page.on('pageerror', (e) => pageErrors.push(e.message))
  if (saved) return page
  await page.goto(loginPath)
  await page.getByPlaceholder('090 123 4567').fill(who.phone)
  await page.getByPlaceholder('••••••••').fill(who.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/\/(partners\/)?login/)
  sessions.set(who.phone, await context.storageState())
  return page
}

// Camera giả: một canvas vẽ mã QR, trả về như luồng video của getUserMedia để trình quét thật (jsqr) đọc.
async function installFakeCamera(page: Page, token: string) {
  // SVG nạp như ảnh bắt buộc có xmlns, trong khi React không tự thêm.
  const svg = renderToStaticMarkup(createElement(QRCodeSVG, { value: token, size: 360, marginSize: 4 })).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  await page.addInitScript((markup) => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 480
      canvas.height = 480
      const context = canvas.getContext('2d')!
      const image = new Image()
      image.src = `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`
      await image.decode()
      const draw = () => { context.fillStyle = '#ffffff'; context.fillRect(0, 0, 480, 480); context.drawImage(image, 60, 60, 360, 360) }
      draw()
      window.setInterval(draw, 100)
      return canvas.captureStream(10)
    }
  }, svg)
}

test.describe.configure({ mode: 'serial' })

test.describe('Vòng đời đơn bằng giao diện (backend thật)', () => {
  test.beforeEach(() => { test.setTimeout(1_800_000) })

  test.beforeAll(async () => {
    test.setTimeout(1_800_000)
    ctx = await pwRequest.newContext()
    customerToken = await login(CUSTOMER)
    freelancerToken = await login(FREELANCER)
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/order-lifecycle-ui.json', JSON.stringify({ bookingId, bookingNumber, disputeId, rows, rateLimited, pageErrors }, null, 2))
    console.log('BOOKING:', bookingId, bookingNumber, 'DISPUTE:', disputeId)
    console.log('NOTES:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
  })

  test('dựng đơn đã xác nhận và đưa vào khung check-in', async () => {
    const provider = (await call(null, 'GET', `/freelancers/${PROVIDER_ID}`)).json
    const serviceCategoryId = provider.services.find((s: { code: string }) => s.code === 'CLEANING').serviceCategoryId
    const addresses = (await call(customerToken, 'GET', '/customer/addresses')).json as { id: string; district: string }[]
    const customerAddressId = addresses.find((a) => a.district === 'Quận 1')!.id
    const availability = (await call(null, 'GET', `/freelancers/${PROVIDER_ID}/availability?days=14`)).json
    const ranges = (availability.days as { free: { startsAtUtc: string }[] }[]).flatMap((d) => d.free).sort((a, b) => Date.parse(b.startsAtUtc) - Date.parse(a.startsAtUtc))
    const start = new Date(ranges[0].startsAtUtc).toISOString()
    const created = await call(customerToken, 'POST', '/bookings', { providerId: PROVIDER_ID, serviceCategoryId, customerAddressId, startsAtUtc: start, endsAtUtc: new Date(Date.parse(start) + 2 * 3_600_000).toISOString() })
    expect(created.status, JSON.stringify(created.json)).toBe(201)
    bookingId = created.json.id
    bookingNumber = created.json.bookingNumber
    const deposit = await call(customerToken, 'POST', `/bookings/${bookingId}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() })
    expect((await call(customerToken, 'POST', `/payments/sandbox/${deposit.json.paymentId}/confirm`, { succeeded: true })).status).toBe(200)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/confirm`)).status).toBe(200)
    // Dời các đơn E2E cũ khỏi khung giờ quanh hiện tại rồi đưa đơn này vào khung check-in (từ 30 phút trước giờ bắt đầu).
    sql(`update bookings set starts_at_utc = starts_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)), ends_at_utc = ends_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)) where customer_user_id = (select id from users where phone_number = '${CUSTOMER.phone}') and provider_id = '${PROVIDER_ID}' and status in ('PendingDeposit','PendingProviderConfirmation','Confirmed','CheckedIn','InProgress','PendingAcceptance') and ends_at_utc > now() - interval '3 hours' and starts_at_utc < now() + interval '5 hours' and id <> '${bookingId}'`)
    sql(`update bookings set starts_at_utc = now() + interval '10 minutes', ends_at_utc = now() + interval '130 minutes' where id = '${bookingId}'`)
  })

  test('freelancer: quét QR để check-in, làm checklist, tải ảnh trước/sau, hoàn tất ca', async ({ browser }) => {
    // Customer lấy mã QR (UI của customer chỉ vẽ mã; ở đây lấy chuỗi mã để camera giả vẽ lại đúng mã đó).
    const qr = await call(customerToken, 'POST', `/bookings/${bookingId}/check-in-token`)
    expect(qr.status, JSON.stringify(qr.json)).toBe(200)

    const page = await openAs(browser, FREELANCER, '/partners/login')
    await installFakeCamera(page, qr.json.token)
    await page.goto(`/partner/orders/${bookingId}`)
    await expect(page.getByRole('heading', { name: 'Xử lý đơn hàng' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Check-in tại nơi làm' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Xác nhận nhận ca' })).toHaveCount(0)

    await page.getByRole('button', { name: /Quét mã QR bằng camera/ }).click()
    await expect(page.getByRole('heading', { name: 'Hoàn tất ca' })).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Đã check-in', { exact: true }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Check-in tại nơi làm' })).toHaveCount(0)
    note('freelancer quét QR bằng camera giả và check-in thành công', 'đơn CheckedIn, hiện panel Hoàn tất ca', 'đúng')

    // Không hoàn tất được khi chưa có ảnh After.
    await expect(page.getByRole('button', { name: 'Hoàn tất ca' })).toBeDisabled()
    await expect(page.getByText(/Cần tải ít nhất một ảnh "Sau khi làm"/)).toBeVisible()

    const selects = page.getByLabel(/^Trạng thái: /)
    const count = await selects.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) await selects.nth(i).selectOption('Completed')
    await expect(page.getByText(new RegExp(`Đã xong ${count}/${count} mục`))).toBeVisible()

    for (const [type, label] of [['Before', 'Trước khi làm'], ['After', 'Sau khi làm']] as const) {
      await page.getByLabel('Loại ảnh').selectOption(type)
      await page.getByLabel(/Chú thích/).fill(`Ảnh ${label}`)
      await page.getByLabel(/Ảnh \(JPG hoặc PNG/).setInputFiles({ name: `${type}.png`, mimeType: 'image/png', buffer: PNG })
      await page.getByRole('button', { name: 'Tải ảnh lên' }).click()
      await expect(page.getByRole('img', { name: `${label}: Ảnh ${label}` })).toBeVisible({ timeout: 15_000 })
    }
    await expect(page.getByText('Đang thực hiện', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Hoàn tất ca' }).click()
    await page.getByRole('button', { name: 'Xác nhận hoàn tất ca' }).click()
    await expect(page.getByText('Chờ nghiệm thu', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Hoàn tất ca' })).toHaveCount(0)
    await expect(page.getByText('Tải ảnh tiến độ')).toHaveCount(0)
  })

  test('customer: xem ảnh tiến độ, nghiệm thu, đánh giá', async ({ browser }) => {
    const page = await openAs(browser, CUSTOMER, '/login')
    await page.goto(`/orders/${bookingId}`)
    await expect(page.getByText('Chờ nghiệm thu', { exact: true }).first()).toBeVisible()
    const photos = page.getByRole('img', { name: /Trước khi làm|Sau khi làm/ })
    await expect(photos).toHaveCount(2, { timeout: 15_000 })
    for (let i = 0; i < 2; i++) await expect.poll(() => photos.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth), { timeout: 15_000 }).toBeGreaterThan(0)
    note('customer thấy 2 ảnh tiến độ tải được bằng token', 'cả hai ảnh có kích thước > 0', 'đúng')

    await page.getByRole('button', { name: 'Nghiệm thu công việc' }).click()
    await page.getByRole('button', { name: 'Xác nhận nghiệm thu' }).click()
    await expect(page.getByText('Hoàn thành', { exact: true }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('button', { name: 'Nghiệm thu công việc' })).toHaveCount(0)

    await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
    await expect(page.getByText('Vui lòng chọn số sao.')).toBeVisible()
    await page.getByRole('radio', { name: '5 sao' }).click()
    await page.getByLabel(/Nhận xét/).fill(commentText())
    await page.getByRole('button', { name: 'Gửi đánh giá' }).click()
    await expect(page.getByRole('heading', { name: 'Đánh giá của bạn' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(commentText())).toBeVisible()
    await expect(page.getByRole('radio')).toHaveCount(0)

    // Đánh giá hiện công khai trên hồ sơ freelancer, bình luận HTML hiển thị như chữ thường.
    await page.goto(`/discover/${PROVIDER_ID}`)
    await expect(page.getByText(commentText())).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('main b').filter({ hasText: 'Rất tốt' })).toHaveCount(0)
  })

  test('customer: mở khiếu nại kèm ảnh bằng chứng và nhắn tin', async ({ browser }) => {
    const page = await openAs(browser, CUSTOMER, '/login')
    await page.goto(`/orders/${bookingId}`)
    await page.getByRole('link', { name: 'Mở khiếu nại' }).click()
    await expect(page).toHaveURL(new RegExp(`/orders/${bookingId}/dispute$`))

    await page.getByRole('button', { name: 'Gửi khiếu nại' }).click()
    await expect(page.getByText('Vui lòng chọn loại khiếu nại.')).toBeVisible()
    await page.getByLabel('Loại khiếu nại').selectOption('ServiceQuality')
    await page.getByLabel(/Mô tả vấn đề/).fill('Khu vực bếp chưa được vệ sinh kỹ như checklist đã thỏa thuận.')
    await page.getByLabel(/Ảnh bằng chứng/).setInputFiles([{ name: 'bep.png', mimeType: 'image/png', buffer: PNG }])
    await expect(page.getByText('bep.png')).toBeVisible()
    await page.getByRole('button', { name: 'Gửi khiếu nại' }).click()

    await expect(page).toHaveURL(/\/disputes\/[0-9a-f-]{36}$/, { timeout: 30_000 })
    disputeId = page.url().split('/').pop()!
    await expect(page.getByRole('heading', { name: `Khiếu nại đơn #${bookingNumber}` })).toBeVisible()
    await expect(page.getByText('Đã tiếp nhận', { exact: true })).toBeVisible()
    await expect(page.getByRole('img', { name: 'Ảnh bằng chứng' })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Tin nhắn cho ABSTRICT').fill('Tôi đã chụp ảnh lúc nhận lại nhà.')
    await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
    await expect(page.getByText('Tôi đã chụp ảnh lúc nhận lại nhà.')).toBeVisible()

    await page.goto(`/orders/${bookingId}`)
    await expect(page.getByText('Đang khiếu nại', { exact: true }).first()).toBeVisible()
    await page.getByRole('link', { name: 'Xem khiếu nại' }).click()
    await expect(page).toHaveURL(new RegExp(`/disputes/${disputeId}$`))
    await page.goto('/disputes')
    await expect(page.getByRole('link', { name: new RegExp(bookingNumber) })).toBeVisible()
  })

  test('admin: xử lý khiếu nại, ghi chú nội bộ và ra quyết định', async ({ browser }) => {
    test.skip(!ADMIN.password, 'đặt E2E_ADMIN_PASSWORD để chạy phần admin')
    const page = await openAs(browser, ADMIN, '/login')
    await expect(page).toHaveURL(/\/admin/)
    await page.goto('/admin/disputes')
    await expect(page.getByRole('heading', { name: 'Quản lý khiếu nại' })).toBeVisible()
    await page.getByRole('link', { name: `#${bookingNumber}` }).click()
    await expect(page).toHaveURL(new RegExp(`/admin/disputes/${disputeId}$`))
    await expect(page.getByRole('heading', { name: `Khiếu nại đơn #${bookingNumber}` })).toBeVisible()
    await expect(page.getByText('Khách Hàng Thử').first()).toBeVisible()
    await expect(page.getByRole('img', { name: 'Ảnh bằng chứng' })).toBeVisible({ timeout: 15_000 })

    await page.getByLabel('Tin nhắn', { exact: true }).fill('Admin đã tiếp nhận, đang liên hệ người làm.')
    await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
    await expect(page.getByText('Admin đã tiếp nhận, đang liên hệ người làm.')).toBeVisible()
    await page.getByLabel('Tin nhắn', { exact: true }).fill('NỘI BỘ: ảnh khớp với phản ánh.')
    await page.getByLabel(/Ghi chú nội bộ \(khách hàng không nhìn thấy\)/).check()
    await page.getByRole('button', { name: 'Gửi tin nhắn' }).click()
    await expect(page.getByText('NỘI BỘ: ảnh khớp với phản ánh.')).toBeVisible()
    await expect(page.getByText('Ghi chú nội bộ', { exact: true }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Ghi nhận quyết định' }).click()
    await expect(page.getByText('Lý do cần ít nhất 5 ký tự.')).toBeVisible()
    await page.getByLabel('Kết quả').selectOption('PartialRefund')
    await page.getByLabel(/Hoàn cho khách/).fill('40000')
    await page.getByLabel(/Trả cho người làm/).fill('80000')
    await page.getByLabel(/Lý do \(khách hàng sẽ nhìn thấy\)/).fill('Hoàn một phần do khu vực bếp chưa sạch.')
    await page.getByRole('button', { name: 'Ghi nhận quyết định' }).click()
    await expect(page.getByText('Quyết định không thể thay đổi sau khi ghi nhận.')).toBeVisible()
    await page.getByRole('button', { name: 'Xác nhận quyết định' }).click()
    await expect(page.getByText('Khiếu nại đã có quyết định nên không thể ghi nhận thêm.')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('heading', { name: 'Quyết định đã ghi nhận' })).toBeVisible()

    await page.goto('/admin/disputes')
    await page.getByRole('button', { name: 'Đã quyết định' }).click()
    await expect(page.getByRole('link', { name: `#${bookingNumber}` })).toBeVisible()
  })

  test('customer: thấy quyết định, không thấy ghi chú nội bộ, không nhắn thêm được', async ({ browser }) => {
    test.skip(!ADMIN.password, 'phụ thuộc phần admin')
    const page = await openAs(browser, CUSTOMER, '/login')
    await page.goto(`/disputes/${disputeId}`)
    await expect(page.getByRole('heading', { name: 'Quyết định của ABSTRICT' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Hoàn một phần do khu vực bếp chưa sạch.')).toBeVisible()
    await expect(page.getByText('Đã có quyết định', { exact: true })).toBeVisible()
    await expect(page.getByText('Admin đã tiếp nhận, đang liên hệ người làm.')).toBeVisible()
    await expect(page.getByText('NỘI BỘ: ảnh khớp với phản ánh.')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Gửi tin nhắn' })).toHaveCount(0)
    await expect(page.getByText('Bổ sung ảnh bằng chứng')).toHaveCount(0)
    note('ghi chú nội bộ không lộ cho customer trên giao diện', 'không thấy', 'không thấy')
  })
})
