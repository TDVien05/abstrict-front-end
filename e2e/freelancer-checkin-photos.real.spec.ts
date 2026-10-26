import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Check-in QR, checklist, ảnh tiến độ và hoàn tất ca. Frontend hiện chỉ có phần QR của customer,
// nên các thao tác của freelancer được gọi thẳng API; QR của customer test qua UI.
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const OTHER_FREELANCER = { phone: '0910000002', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000001'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

interface Row { id: string; expected: string; actual: string; ok: boolean }
interface Res { status: number; json?: any; code?: string; body?: Buffer; contentType?: string }

let ctx: APIRequestContext
let customerToken = ''
let freelancerToken = ''
let otherToken = ''
let bookingId = ''
let taskId = ''
let beforePhotoId = ''
let afterPhotoId = ''
let rateLimited = 0
const rows: Row[] = []
const pageErrors: string[] = []
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function send(make: () => Promise<Awaited<ReturnType<APIRequestContext['fetch']>>>): Promise<Res> {
  for (let attempt = 0; attempt < 15; attempt++) {
    let res: Awaited<ReturnType<typeof make>>
    try { res = await make() } catch { return { status: 0, code: 'CLIENT_ERROR_OR_TIMEOUT' } }
    if (res.status() === 429) { rateLimited++; await sleep(Math.min(Number(res.headers()['retry-after'] ?? 60), 120) * 1000); continue }
    const contentType = res.headers()['content-type']
    const body = await res.body()
    let json: any
    if (contentType?.includes('json')) { try { json = JSON.parse(body.toString('utf8')) } catch { json = undefined } }
    return { status: res.status(), json, code: json?.code, body, contentType }
  }
  throw new Error('Vẫn bị 429 sau nhiều lần thử')
}

const auth = (token: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})
const call = (token: string | null, method: string, path: string, data?: unknown, headers: Record<string, string> = {}) =>
  send(() => ctx.fetch(API + path, { method, headers: { ...auth(token), ...headers }, data: data as never }))
const upload = (token: string, id: string, file: { name: string; mimeType: string; buffer: Buffer }, fields: Record<string, string>) =>
  send(() => ctx.fetch(`${API}/freelancer/bookings/${id}/photos`, { method: 'POST', headers: auth(token), multipart: { file, ...fields }, timeout: 30_000 }))

const login = async (who: { phone: string; password: string }) => {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: who.phone, password: who.password })
  expect(r.status, `đăng nhập ${who.phone}`).toBe(200)
  return r.json.accessToken as string
}

function sql(query: string) {
  return execFileSync('docker', ['exec', DB_CONTAINER, 'psql', '-U', 'abstrict', '-d', 'abstrict', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()
}

function record(id: string, expected: string, r: Res) {
  const actual = `${r.status}${r.code ? ' ' + r.code : ''}`
  rows.push({ id, expected, actual, ok: actual === expected })
  expect.soft(actual, id).toBe(expected)
}

function recordOneOf(id: string, expected: string[], r: Res) {
  const actual = `${r.status}${r.code ? ' ' + r.code : ''}`
  rows.push({ id, expected: expected.join(' | '), actual, ok: expected.includes(actual) })
  expect.soft(expected, id).toContain(actual)
}

const checkInToken = async () => {
  const r = await call(customerToken, 'POST', `/bookings/${bookingId}/check-in-token`)
  expect(r.status, `lấy mã QR: ${JSON.stringify(r.json)}`).toBe(200)
  return r.json.token as string
}
const checkIn = (token: string, as = freelancerToken) => call(as, 'POST', `/freelancer/bookings/${bookingId}/check-in`, { token })
const fBooking = async () => (await call(freelancerToken, 'GET', `/freelancer/bookings/${bookingId}`)).json
const cBooking = async () => (await call(customerToken, 'GET', `/bookings/${bookingId}`)).json

test.describe.configure({ mode: 'serial' })

test.describe('Freelancer check-in, checklist, ảnh tiến độ, hoàn tất ca (backend thật)', () => {
  test.beforeEach(() => { test.setTimeout(900_000) })

  test.beforeAll(async () => {
    test.setTimeout(900_000)
    ctx = await pwRequest.newContext()
    customerToken = await login(CUSTOMER)
    freelancerToken = await login(FREELANCER)
    otherToken = await login(OTHER_FREELANCER)
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/checkin-photos.json', JSON.stringify({ bookingId, rows, rateLimited, pageErrors }, null, 2))
    console.log('BOOKING_ID:', bookingId)
    console.log('CASE_ROWS:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
  })

  test('chuẩn bị đơn Confirmed; trước khung giờ check-in thì mã QR/check-in/ảnh đều bị chặn', async ({ browser }) => {
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
    const dep = await call(customerToken, 'POST', `/bookings/${bookingId}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() })
    expect((await call(customerToken, 'POST', `/payments/sandbox/${dep.json.paymentId}/confirm`, { succeeded: true })).status).toBe(200)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/confirm`)).status).toBe(200)
    expect((await cBooking()).status).toBe('Confirmed')

    record('lấy mã QR khi chưa tới khung giờ (API)', '409 CHECK_IN_NOT_OPEN', await call(customerToken, 'POST', `/bookings/${bookingId}/check-in-token`))
    record('check-in khi chưa tới khung giờ', '409 CHECK_IN_NOT_OPEN', await checkIn('khong-phai-token'))
    record('tải ảnh khi đơn còn Confirmed', '409 BOOKING_INVALID_STATE',
      await upload(freelancerToken, bookingId, { name: 'a.png', mimeType: 'image/png', buffer: PNG }, { type: 'Before' }))
    record('hoàn tất ca khi đơn còn Confirmed', '409 BOOKING_INVALID_STATE', await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/complete`))

    const actions = (await cBooking()).allowedActions as string[]
    const cPage = await (await browser.newContext()).newPage()
    cPage.on('pageerror', (e) => pageErrors.push(e.message))
    await cPage.goto('/login')
    await cPage.getByPlaceholder('090 123 4567').fill(CUSTOMER.phone)
    await cPage.getByPlaceholder('••••••••').fill(CUSTOMER.password)
    await cPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(cPage).toHaveURL(/\/discover/)
    await cPage.goto(`/orders/${bookingId}`)
    await expect(cPage.getByText('Đã xác nhận', { exact: true }).first()).toBeVisible()
    rows.push({ id: 'allowedActions của customer khi Confirmed, chưa tới giờ', expected: 'không có ShowCheckInQr', actual: JSON.stringify(actions), ok: !actions.includes('ShowCheckInQr') })
    expect.soft(actions).not.toContain('ShowCheckInQr')
    await expect(cPage.getByRole('button', { name: 'Hiện mã QR' })).toHaveCount(0)

    // Các lần chạy trước để lại đơn CheckedIn/InProgress/PendingAcceptance quanh giờ hiện tại và sẽ trùng khung giờ sắp dời tới;
    // dời lùi 30 ngày chỉ các đơn của customer test với freelancer này.
    const moved = sql(`update bookings set starts_at_utc = starts_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)), ends_at_utc = ends_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)) where customer_user_id = (select id from users where phone_number = '${CUSTOMER.phone}') and provider_id = '${PROVIDER_ID}' and status in ('CheckedIn','InProgress','PendingAcceptance') and ends_at_utc > now() - interval '3 hours' and starts_at_utc < now() + interval '3 hours' and id <> '${bookingId}'`)
    rows.push({ id: 'dọn đơn E2E cũ đang chiếm khung giờ gần hiện tại', expected: 'thông tin', actual: moved, ok: true })

    // Dời giờ ca về 10 phút nữa để vào khung check-in (từ 30 phút trước giờ bắt đầu).
    sql(`update bookings set starts_at_utc = now() + interval '10 minutes', ends_at_utc = now() + interval '130 minutes' where id = '${bookingId}'`)
    const inWindow = (await cBooking()).allowedActions as string[]
    rows.push({ id: 'allowedActions của customer khi vào khung check-in', expected: 'có ShowCheckInQr', actual: JSON.stringify(inWindow), ok: inWindow.includes('ShowCheckInQr') })
    expect.soft(inWindow).toContain('ShowCheckInQr')
    await cPage.reload()
    await cPage.getByRole('button', { name: 'Hiện mã QR' }).click()
    await expect(cPage.getByText(/Mã đổi sau/)).toBeVisible({ timeout: 15_000 })
    await expect(cPage.locator('svg title', { hasText: 'Mã QR check-in' })).toHaveCount(1)
  })

  test('check-in: token sai, token cũ, sai người, token đúng, dùng lại token', async ({ browser }) => {
    const oldToken = await checkInToken()
    const freshToken = await checkInToken()
    record('check-in bằng token bịa', '409 CHECK_IN_TOKEN_INVALID', await checkIn('khong-phai-token'))
    record('check-in bằng token cũ (đã bị mã mới thay thế)', '409 CHECK_IN_TOKEN_EXPIRED', await checkIn(oldToken))
    record('check-in bởi freelancer không thuộc đơn', '404 BOOKING_NOT_FOUND', await checkIn(freshToken, otherToken))
    record('customer gọi API check-in của freelancer', '403', await checkIn(freshToken, customerToken))
    record('check-in không có token đăng nhập', '401', await call(null, 'POST', `/freelancer/bookings/${bookingId}/check-in`, { token: freshToken }))

    const ok = await checkIn(freshToken)
    record('check-in bằng token đúng', '200', ok)
    expect((await fBooking()).status).toBe('CheckedIn')
    record('dùng lại token đã dùng', '409 BOOKING_INVALID_STATE', await checkIn(freshToken))
    record('lấy mã QR khi đơn đã CheckedIn', '409 BOOKING_INVALID_STATE', await call(customerToken, 'POST', `/bookings/${bookingId}/check-in-token`))

    const cPage = await (await browser.newContext()).newPage()
    cPage.on('pageerror', (e) => pageErrors.push(e.message))
    await cPage.goto('/login')
    await cPage.getByPlaceholder('090 123 4567').fill(CUSTOMER.phone)
    await cPage.getByPlaceholder('••••••••').fill(CUSTOMER.password)
    await cPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(cPage).toHaveURL(/\/discover/)
    await cPage.goto(`/orders/${bookingId}`)
    await expect(cPage.getByText('Đã check-in', { exact: true }).first()).toBeVisible()
    await expect(cPage.getByRole('button', { name: 'Hiện mã QR' })).toHaveCount(0)
  })

  test('tải ảnh tiến độ: các trường hợp lỗi', async () => {
    const png = { name: 'a.png', mimeType: 'image/png', buffer: PNG }
    record('hoàn tất ca khi chưa có ảnh After', '409 AFTER_PHOTO_REQUIRED', await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/complete`))
    record('loại ảnh không hợp lệ (tài liệu ghi INVALID_PHOTO_TYPE, thực tế bị chặn ở bước bind enum)', '400 VALIDATION_FAILED', await upload(freelancerToken, bookingId, png, { type: 'Middle' }))
    record('tệp ảnh rỗng', '400 EMPTY_FILE', await upload(freelancerToken, bookingId, { name: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }, { type: 'Before' }))
    record('tệp văn bản đặt tên .png', '415 UNSUPPORTED_IMAGE', await upload(freelancerToken, bookingId, { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('không phải ảnh') }, { type: 'Before' }))
    record('ảnh vừa vượt 5 MB (5,2 MB)', '413 FILE_TOO_LARGE', await upload(freelancerToken, bookingId, { name: 'big.png', mimeType: 'image/png', buffer: Buffer.concat([PNG, Buffer.alloc(5_452_000)]) }, { type: 'Before' }))
    // Body > 5.505.024 byte bị Kestrel/form chặn trước khi tới logic ảnh; server đóng kết nối sớm nên client có thể báo lỗi/timeout.
    recordOneOf('ảnh 6 MB (vượt giới hạn body của form)', ['400 VALIDATION_FAILED', '0 CLIENT_ERROR_OR_TIMEOUT'], await upload(freelancerToken, bookingId, { name: 'huge.png', mimeType: 'image/png', buffer: Buffer.concat([PNG, Buffer.alloc(6 * 1024 * 1024)]) }, { type: 'Before' }))
    record('gắn ảnh vào mục checklist không tồn tại (tài liệu ghi 404 BOOKING_TASK_NOT_FOUND)', '400 INVALID_BOOKING_TASK', await upload(freelancerToken, bookingId, png, { type: 'Before', bookingTaskId: crypto.randomUUID() }))
    recordOneOf('chú thích dài hơn 300 ký tự', ['400 VALIDATION_FAILED'], await upload(freelancerToken, bookingId, png, { type: 'Before', caption: 'x'.repeat(301) }))
    record('tải ảnh bởi freelancer không thuộc đơn', '404 BOOKING_NOT_FOUND', await upload(otherToken, bookingId, png, { type: 'Before' }))
    expect((await fBooking()).status, 'các lần tải lỗi không được đổi trạng thái đơn').toBe('CheckedIn')
  })

  test('checklist và ảnh Before: đơn chuyển InProgress', async () => {
    const detail = await fBooking()
    taskId = detail.tasks[0].id
    record('đổi mục checklist sang trạng thái không hợp lệ (tài liệu ghi INVALID_TASK_STATUS)', '400 VALIDATION_FAILED', await call(freelancerToken, 'PATCH', `/freelancer/bookings/${bookingId}/tasks/${taskId}`, { status: 'Done' }))
    record('đổi mục checklist không tồn tại', '404 BOOKING_TASK_NOT_FOUND', await call(freelancerToken, 'PATCH', `/freelancer/bookings/${bookingId}/tasks/${crypto.randomUUID()}`, { status: 'Completed' }))

    const before = await upload(freelancerToken, bookingId, { name: 'before.png', mimeType: 'image/png', buffer: PNG }, { type: 'Before', bookingTaskId: taskId, caption: 'Trước khi làm' })
    recordOneOf('tải ảnh Before hợp lệ', ['200', '201'], before)
    expect((await fBooking()).status).toBe('InProgress')
    const timeline = (await cBooking()).timeline as { reason: string }[]
    rows.push({ id: 'timeline sau ảnh Before đầu tiên', expected: 'WorkStarted', actual: timeline.at(-1)!.reason, ok: timeline.at(-1)!.reason === 'WorkStarted' })
    expect.soft(timeline.at(-1)!.reason).toBe('WorkStarted')

    record('đổi mục checklist sang Completed', '200', await call(freelancerToken, 'PATCH', `/freelancer/bookings/${bookingId}/tasks/${taskId}`, { status: 'Completed' }))
    const customerView = await cBooking()
    const task = customerView.tasks.find((t: { id: string }) => t.id === taskId)
    rows.push({ id: 'customer thấy mục checklist đã Completed', expected: 'Completed', actual: String(task?.status), ok: task?.status === 'Completed' })
    expect.soft(task?.status).toBe('Completed')

    const photos = ((await fBooking()).photos ?? []) as { id: string; type: string; contentUrl: string }[]
    beforePhotoId = photos.find((p) => p.type === 'Before')?.id ?? ''
    rows.push({ id: 'chi tiết đơn của freelancer có ảnh Before', expected: 'photos có 1 ảnh Before', actual: JSON.stringify(photos.map((p) => p.type)), ok: photos.some((p) => p.type === 'Before') })
    expect.soft(beforePhotoId, 'phải lấy được id ảnh Before').toMatch(GUID)
  })

  test('ảnh After, tải nội dung ảnh và phân quyền xem', async () => {
    const after = await upload(freelancerToken, bookingId, { name: 'after.png', mimeType: 'image/png', buffer: PNG }, { type: 'After', caption: 'Sau khi làm' })
    recordOneOf('tải ảnh After hợp lệ', ['200', '201'], after)
    const photos = ((await fBooking()).photos ?? []) as { id: string; type: string }[]
    afterPhotoId = photos.find((p) => p.type === 'After')?.id ?? ''
    expect.soft(afterPhotoId).toMatch(GUID)

    const own = await send(() => ctx.fetch(`${API}/freelancer/bookings/${bookingId}/photos/${beforePhotoId}/content`, { headers: auth(freelancerToken) }))
    record('freelancer xem nội dung ảnh', '200', own)
    rows.push({ id: 'nội dung ảnh trả về đúng byte đã tải', expected: 'giống tệp gốc', actual: own.body?.equals(PNG) ? 'giống' : 'khác', ok: Boolean(own.body?.equals(PNG)) })
    expect.soft(own.body?.equals(PNG)).toBe(true)
    record('customer xem nội dung ảnh của đơn mình', '200', await send(() => ctx.fetch(`${API}/bookings/${bookingId}/photos/${beforePhotoId}/content`, { headers: auth(customerToken) })))
    record('xem ảnh không có token', '401', await send(() => ctx.fetch(`${API}/bookings/${bookingId}/photos/${beforePhotoId}/content`)))
    record('freelancer không thuộc đơn xem ảnh', '404 BOOKING_PHOTO_NOT_FOUND', await send(() => ctx.fetch(`${API}/freelancer/bookings/${bookingId}/photos/${beforePhotoId}/content`, { headers: auth(otherToken) })))
    record('xem ảnh không tồn tại', '404 BOOKING_PHOTO_NOT_FOUND', await send(() => ctx.fetch(`${API}/freelancer/bookings/${bookingId}/photos/${crypto.randomUUID()}/content`, { headers: auth(freelancerToken) })))
  })

  test('hoàn tất ca → chờ nghiệm thu; sau đó không sửa/tải thêm được', async ({ browser }) => {
    record('freelancer khác hoàn tất ca', '404 BOOKING_NOT_FOUND', await call(otherToken, 'POST', `/freelancer/bookings/${bookingId}/complete`))
    record('hoàn tất ca đã có ảnh After', '200', await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/complete`))
    expect((await fBooking()).status).toBe('PendingAcceptance')
    const customerView = await cBooking()
    expect(customerView.timeline.at(-1).reason).toBe('WorkFinished')

    record('hoàn tất ca lần 2', '409 BOOKING_INVALID_STATE', await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/complete`))
    record('tải ảnh sau khi hoàn tất', '409 BOOKING_INVALID_STATE', await upload(freelancerToken, bookingId, { name: 'late.png', mimeType: 'image/png', buffer: PNG }, { type: 'After' }))
    record('đổi checklist sau khi hoàn tất', '409 BOOKING_INVALID_STATE', await call(freelancerToken, 'PATCH', `/freelancer/bookings/${bookingId}/tasks/${taskId}`, { status: 'Pending' }))
    // Token phải dài 8–128 ký tự, nếu không bị chặn ở bước validate (400) trước khi kiểm tra trạng thái đơn.
    record('check-in lại sau khi hoàn tất', '409 BOOKING_INVALID_STATE', await checkIn('khong-phai-token-nhung-du-dai'))

    const cPage = await (await browser.newContext()).newPage()
    cPage.on('pageerror', (e) => pageErrors.push(e.message))
    await cPage.goto('/login')
    await cPage.getByPlaceholder('090 123 4567').fill(CUSTOMER.phone)
    await cPage.getByPlaceholder('••••••••').fill(CUSTOMER.password)
    await cPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(cPage).toHaveURL(/\/discover/)
    await cPage.goto(`/orders/${bookingId}`)
    await expect(cPage.getByText('Chờ nghiệm thu', { exact: true }).first()).toBeVisible()
    const photoOrAccept = await cPage.locator('main img, main [role="img"]').count() + await cPage.getByRole('button', { name: /nghiệm thu|chấp nhận/i }).count()
    rows.push({ id: 'UI customer hiển thị ảnh tiến độ / nút nghiệm thu', expected: 'có (backend đã có accept-work và contentUrl)', actual: photoOrAccept === 0 ? 'không có' : `có ${photoOrAccept} phần tử`, ok: photoOrAccept > 0 })

    const fPage = await (await browser.newContext()).newPage()
    fPage.on('pageerror', (e) => pageErrors.push(e.message))
    await fPage.goto('/partners/login')
    await fPage.getByPlaceholder('090 123 4567').fill(FREELANCER.phone)
    await fPage.getByPlaceholder('••••••••').fill(FREELANCER.password)
    await fPage.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(fPage).not.toHaveURL(/\/partners\/login/)
    await fPage.goto(`/partner/orders/${bookingId}`)
    await expect(fPage.getByRole('heading', { name: 'Xử lý đơn hàng' })).toBeVisible()
    const controls = await fPage.getByRole('button', { name: /check-in|tải ảnh|hoàn tất ca/i }).count()
    rows.push({ id: 'UI freelancer có nút check-in / tải ảnh / hoàn tất ca', expected: 'có (backend có allowedActions CheckIn, UploadPhotos, CompleteWork)', actual: controls === 0 ? 'không có' : `có ${controls}`, ok: controls > 0 })
  })
})
