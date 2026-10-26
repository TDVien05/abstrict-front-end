import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Nghiệm thu và đánh giá của customer, chạy với backend thật. Frontend chưa có UI nghiệm thu / gửi đánh giá
// nên các thao tác này gọi thẳng API; phần hiển thị trạng thái và danh sách đánh giá công khai kiểm tra qua UI.
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const OTHER_CUSTOMER = { phone: '0920000002', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000001'
const REVIEWED_FIXTURE_BOOKING = 'b00b0000-0000-0000-0000-000000000012' // ABRATE-C002 của 0920000002, đã có đánh giá
const UNREVIEWED_FIXTURE_BOOKING = 'b00b0000-0000-0000-0000-000000000102' // ABUNRV-C002 của 0920000002, Completed chưa đánh giá
const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const RESUME_BOOKING = process.env.E2E_RESUME_BOOKING
const COMMENT ="Rất tốt <b>in đậm</b> & 'dấu nháy' \"kép\" 😀"

interface Row { id: string; expected: string; actual: string; ok: boolean }
interface Res { status: number; json?: any; code?: string }

let ctx: APIRequestContext
let customerToken = ''
let otherToken = ''
let freelancerToken = ''
let bookingId = ''
let bookingNumber = ''
let ratingId = ''
let before = { averageRating: 0, ratingCount: 0 }
let rateLimited = 0
const rows: Row[] = []
const pageErrors: string[] = []
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function send(make: () => Promise<Awaited<ReturnType<APIRequestContext['fetch']>>>): Promise<Res> {
  for (let attempt = 0; attempt < 15; attempt++) {
    let res: Awaited<ReturnType<typeof make>>
    try { res = await make() } catch { return { status: 0, code: 'CLIENT_ERROR_OR_TIMEOUT' } }
    if (res.status() === 429) { rateLimited++; await sleep(Math.min(Number(res.headers()['retry-after'] ?? 60), 120) * 1000); continue }
    let json: any
    try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
    return { status: res.status(), json, code: json?.code }
  }
  throw new Error('Vẫn bị 429 sau nhiều lần thử')
}

const auth = (token: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})
const call = (token: string | null, method: string, path: string, data?: unknown, headers: Record<string, string> = {}) =>
  send(() => ctx.fetch(API + path, { method, headers: { ...auth(token), ...headers }, data: data as never, timeout: 30_000 }))
const uploadAfter = (id: string) =>
  send(() => ctx.fetch(`${API}/freelancer/bookings/${id}/photos`, { method: 'POST', headers: auth(freelancerToken), multipart: { file: { name: 'after.png', mimeType: 'image/png', buffer: PNG }, type: 'After' }, timeout: 30_000 }))

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
function check(id: string, expected: string, actual: string, ok: boolean) {
  rows.push({ id, expected, actual, ok })
  expect.soft(ok, `${id}: kỳ vọng ${expected}, thực tế ${actual}`).toBe(true)
}

const cBooking = async () => (await call(customerToken, 'GET', `/bookings/${bookingId}`)).json
const rate = (body: unknown, token: string | null = customerToken, id = bookingId) => call(token, 'POST', `/bookings/${id}/rating`, body)
const provider = async () => (await call(null, 'GET', `/freelancers/${PROVIDER_ID}`)).json as { averageRating: number; ratingCount: number }

test.describe.configure({ mode: 'serial' })

test.describe('Customer nghiệm thu và đánh giá freelancer (backend thật)', () => {
  test.beforeEach(() => { test.setTimeout(1_800_000) })

  test.beforeAll(async () => {
    test.setTimeout(1_800_000)
    ctx = await pwRequest.newContext()
    customerToken = await login(CUSTOMER)
    otherToken = await login(OTHER_CUSTOMER)
    freelancerToken = await login(FREELANCER)
    // Chế độ tiếp tục: dùng một đơn đã Completed (chưa đánh giá) từ lần chạy trước, bỏ qua bước dựng chuỗi và nghiệm thu.
    if (RESUME_BOOKING) {
      bookingId = RESUME_BOOKING
      const resumed = await cBooking()
      expect(resumed.status, 'đơn tiếp tục phải ở trạng thái Completed').toBe('Completed')
      bookingNumber = resumed.bookingNumber
      before = await provider()
    }
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/rating.json', JSON.stringify({ bookingId, bookingNumber, ratingId, before, rows, rateLimited, pageErrors }, null, 2))
    console.log('BOOKING_ID:', bookingId, bookingNumber)
    console.log('CASE_ROWS:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
  })

  test('chuẩn bị: đặt lịch → xác nhận → check-in → ảnh After → hoàn tất ca; trước khi nghiệm thu chưa đánh giá được', async () => {
    test.skip(Boolean(RESUME_BOOKING), 'chế độ tiếp tục: dùng đơn Completed có sẵn')
    const detail = (await call(null, 'GET', `/freelancers/${PROVIDER_ID}`)).json
    const serviceCategoryId = detail.services.find((s: { code: string }) => s.code === 'CLEANING').serviceCategoryId
    const addresses = (await call(customerToken, 'GET', '/customer/addresses')).json as { id: string; district: string }[]
    const customerAddressId = addresses.find((a) => a.district === 'Quận 1')!.id
    const availability = (await call(null, 'GET', `/freelancers/${PROVIDER_ID}/availability?days=14`)).json
    const ranges = (availability.days as { free: { startsAtUtc: string }[] }[]).flatMap((d) => d.free).sort((a, b) => Date.parse(b.startsAtUtc) - Date.parse(a.startsAtUtc))
    const start = new Date(ranges[0].startsAtUtc).toISOString()
    const created = await call(customerToken, 'POST', '/bookings', { providerId: PROVIDER_ID, serviceCategoryId, customerAddressId, startsAtUtc: start, endsAtUtc: new Date(Date.parse(start) + 2 * 3_600_000).toISOString() })
    expect(created.status, JSON.stringify(created.json)).toBe(201)
    bookingId = created.json.id
    bookingNumber = created.json.bookingNumber
    const dep = await call(customerToken, 'POST', `/bookings/${bookingId}/deposit`, { method: 'Momo' }, { 'Idempotency-Key': crypto.randomUUID() })
    expect((await call(customerToken, 'POST', `/payments/sandbox/${dep.json.paymentId}/confirm`, { succeeded: true })).status).toBe(200)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/confirm`)).status).toBe(200)

    record('nghiệm thu khi đơn mới Confirmed', '409 BOOKING_INVALID_STATE', await call(customerToken, 'POST', `/bookings/${bookingId}/accept-work`))
    record('đánh giá khi đơn chưa hoàn thành (Confirmed)', '409 BOOKING_NOT_COMPLETED', await rate({ score: 5 }))
    record('xem đánh giá của đơn chưa đánh giá', '404 RATING_NOT_FOUND', await call(customerToken, 'GET', `/bookings/${bookingId}/rating`))

    // Dời giờ ca về 10 phút nữa để vào khung check-in; dọn các đơn E2E cũ đang chiếm khung giờ quanh hiện tại để khỏi trùng slot.
    sql(`update bookings set starts_at_utc = starts_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)), ends_at_utc = ends_at_utc - (interval '1 day' * (30 + extract(epoch from now())::bigint % 3000)) where customer_user_id = (select id from users where phone_number = '${CUSTOMER.phone}') and provider_id = '${PROVIDER_ID}' and status in ('PendingDeposit','PendingProviderConfirmation','Confirmed','CheckedIn','InProgress','PendingAcceptance') and ends_at_utc > now() - interval '3 hours' and starts_at_utc < now() + interval '5 hours' and id <> '${bookingId}'`)
    sql(`update bookings set starts_at_utc = now() + interval '10 minutes', ends_at_utc = now() + interval '130 minutes' where id = '${bookingId}'`)

    const qr = await call(customerToken, 'POST', `/bookings/${bookingId}/check-in-token`)
    expect(qr.status, JSON.stringify(qr.json)).toBe(200)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/check-in`, { token: qr.json.token })).status).toBe(200)
    const photo = await uploadAfter(bookingId)
    expect([200, 201], JSON.stringify(photo.json)).toContain(photo.status)
    expect((await call(freelancerToken, 'POST', `/freelancer/bookings/${bookingId}/complete`)).status).toBe(200)
    expect((await cBooking()).status).toBe('PendingAcceptance')
    before = await provider()
  })

  test('nghiệm thu: phân quyền, trạng thái và chuyển sang Completed', async ({ browser }) => {
    test.skip(Boolean(RESUME_BOOKING), 'chế độ tiếp tục: dùng đơn Completed có sẵn')
    const pending = await cBooking()
    check('allowedActions của customer khi PendingAcceptance', 'chứa AcceptWork', JSON.stringify(pending.allowedActions), (pending.allowedActions as string[]).includes('AcceptWork'))
    record('đánh giá khi đơn đang PendingAcceptance', '409 BOOKING_NOT_COMPLETED', await rate({ score: 5 }))
    record('customer khác nghiệm thu đơn', '404 BOOKING_NOT_FOUND', await call(otherToken, 'POST', `/bookings/${bookingId}/accept-work`))
    record('freelancer gọi API nghiệm thu', '403', await call(freelancerToken, 'POST', `/bookings/${bookingId}/accept-work`))
    record('nghiệm thu không có token', '401', await call(null, 'POST', `/bookings/${bookingId}/accept-work`))
    expect((await cBooking()).status, 'các lần nghiệm thu bị từ chối không được đổi trạng thái').toBe('PendingAcceptance')

    const accepted = await call(customerToken, 'POST', `/bookings/${bookingId}/accept-work`)
    record('customer nghiệm thu đơn của mình', '200', accepted)
    const done = await cBooking()
    check('trạng thái sau nghiệm thu', 'Completed', String(done.status), done.status === 'Completed')
    check('allowedActions sau nghiệm thu', 'có RateProvider, không còn AcceptWork', JSON.stringify(done.allowedActions), (done.allowedActions as string[]).includes('RateProvider') && !(done.allowedActions as string[]).includes('AcceptWork'))
    rows.push({ id: 'timeline sau nghiệm thu (thông tin)', expected: 'thông tin', actual: String(done.timeline.at(-1)?.reason), ok: true })
    record('nghiệm thu lần 2', '409 BOOKING_INVALID_STATE', await call(customerToken, 'POST', `/bookings/${bookingId}/accept-work`))

    const page = await (await browser.newContext()).newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.goto('/login')
    await page.getByPlaceholder('090 123 4567').fill(CUSTOMER.phone)
    await page.getByPlaceholder('••••••••').fill(CUSTOMER.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/discover/)
    await page.goto(`/orders/${bookingId}`)
    await expect(page.getByText('Hoàn thành', { exact: true }).first()).toBeVisible()
    const controls = await page.getByRole('button', { name: /đánh giá|nghiệm thu/i }).count() + await page.locator('main textarea').count()
    // Phát hiện về frontend, không làm fail test.
    rows.push({ id: 'UI trang đơn có form đánh giá (RateProvider đã có trong allowedActions)', expected: 'có form/nút đánh giá', actual: controls === 0 ? 'không có' : `có ${controls}`, ok: controls > 0 })
  })

  test('đánh giá: dữ liệu không hợp lệ bị từ chối và không tạo đánh giá', async () => {
    record('score = 0', '400 VALIDATION_FAILED', await rate({ score: 0 }))
    record('score = 6', '400 VALIDATION_FAILED', await rate({ score: 6 }))
    record('score = -1', '400 VALIDATION_FAILED', await rate({ score: -1 }))
    record('thiếu score', '400 VALIDATION_FAILED', await rate({ comment: 'không có điểm' }))
    record('score là chuỗi', '400 VALIDATION_FAILED', await rate({ score: 'abc' }))
    record('score không nguyên (4.5)', '400 VALIDATION_FAILED', await rate({ score: 4.5 }))
    record('bình luận 2001 ký tự', '400 VALIDATION_FAILED', await rate({ score: 5, comment: 'x'.repeat(2001) }))
    record('đánh giá không có token', '401', await rate({ score: 5 }, null))
    record('customer khác đánh giá đơn', '404 BOOKING_NOT_FOUND', await rate({ score: 5 }, otherToken))
    record('freelancer gọi API đánh giá', '403', await rate({ score: 5 }, freelancerToken))
    record('đánh giá đơn không tồn tại', '404 BOOKING_NOT_FOUND', await rate({ score: 5 }, customerToken, crypto.randomUUID()))
    record('vẫn chưa có đánh giá', '404 RATING_NOT_FOUND', await call(customerToken, 'GET', `/bookings/${bookingId}/rating`))
    check('allowedActions vẫn còn RateProvider', 'chứa RateProvider', JSON.stringify((await cBooking()).allowedActions), ((await cBooking()).allowedActions as string[]).includes('RateProvider'))
    const now = await provider()
    check('số lượt đánh giá của freelancer không đổi sau các lần gửi lỗi', String(before.ratingCount), String(now.ratingCount), now.ratingCount === before.ratingCount)
  })

  test('đánh giá hợp lệ: 201, chống trùng, xem lại đánh giá của mình', async () => {
    const created = await rate({ score: 5, comment: COMMENT })
    record('gửi đánh giá 5 sao kèm bình luận', '201', created)
    const r = created.json ?? {}
    ratingId = r.id ?? ''
    check('response có đủ trường', 'id, bookingId, bookingNumber, providerId, providerName, score, comment, createdAtUtc, publishedAtUtc',
      Object.keys(r).join(', '), ['id', 'bookingId', 'bookingNumber', 'providerId', 'providerName', 'score', 'comment', 'createdAtUtc', 'publishedAtUtc'].every((k) => k in r))
    check('score và bình luận được lưu nguyên văn (ký tự đặc biệt, emoji)', 'score=5, comment giống bản gửi', `score=${r.score}, comment=${JSON.stringify(r.comment)}`, r.score === 5 && r.comment === COMMENT)
    check('đánh giá công bố ngay (publishedAtUtc có giá trị)', 'khác null', String(r.publishedAtUtc), Boolean(r.publishedAtUtc))
    check('đánh giá gắn đúng đơn và freelancer', `${bookingNumber} / ${PROVIDER_ID}`, `${r.bookingNumber} / ${r.providerId}`, r.bookingNumber === bookingNumber && r.providerId === PROVIDER_ID)

    check('allowedActions sau khi đánh giá', 'không còn RateProvider', JSON.stringify((await cBooking()).allowedActions), !((await cBooking()).allowedActions as string[]).includes('RateProvider'))
    record('gửi đánh giá lần 2 (cùng điểm)', '409 BOOKING_ALREADY_RATED', await rate({ score: 5, comment: COMMENT }))
    record('gửi đánh giá lần 2 (đổi điểm)', '409 BOOKING_ALREADY_RATED', await rate({ score: 1, comment: 'đổi ý' }))
    const mine = await call(customerToken, 'GET', `/bookings/${bookingId}/rating`)
    record('xem đánh giá của mình', '200', mine)
    check('đánh giá không bị đổi bởi các lần gửi trùng', 'score=5, cùng id', `score=${mine.json?.score}, id=${mine.json?.id}`, mine.json?.score === 5 && mine.json?.id === ratingId)
    recordOneOf('customer khác xem đánh giá của tôi', ['404 BOOKING_NOT_FOUND', '404 RATING_NOT_FOUND'], await call(otherToken, 'GET', `/bookings/${bookingId}/rating`))
    record('xem đánh giá không có token', '401', await call(null, 'GET', `/bookings/${bookingId}/rating`))
    record('đánh giá lại đơn đã có đánh giá sẵn (fixture ABRATE-C002)', '409 BOOKING_ALREADY_RATED', await rate({ score: 3 }, otherToken, REVIEWED_FIXTURE_BOOKING))
  })

  test('đánh giá công khai và điểm trung bình của freelancer', async ({ browser }) => {
    const after = await provider()
    check('ratingCount tăng đúng 1', String(before.ratingCount + 1), String(after.ratingCount), after.ratingCount === before.ratingCount + 1)
    const expectedAvg = (before.averageRating * before.ratingCount + 5) / (before.ratingCount + 1)
    check('averageRating được tính lại', expectedAvg.toFixed(2), String(after.averageRating), Math.abs(after.averageRating - expectedAvg) <= 0.01)

    const list = await call(null, 'GET', `/freelancers/${PROVIDER_ID}/ratings?page=1&pageSize=50`)
    record('danh sách đánh giá công khai', '200', list)
    const mine = (list.json?.items ?? []).find((i: { bookingNumber: string }) => i.bookingNumber === bookingNumber)
    check('đánh giá mới có trong danh sách công khai', 'có, đúng bình luận', mine ? `score=${mine.score}` : 'không thấy', Boolean(mine) && mine.comment === COMMENT && mine.score === 5)
    const keys = Object.keys(mine ?? {})
    check('danh sách công khai không lộ danh tính người đánh giá', 'chỉ id, bookingId, bookingNumber, score, comment, publishedAtUtc', keys.join(', '), keys.length > 0 && !keys.some((k) => /reviewer|customer|user|phone|name/i.test(k)))
    const page1 = await call(null, 'GET', `/freelancers/${PROVIDER_ID}/ratings?page=1&pageSize=1`)
    check('pageSize=1 trả đúng 1 mục', '1', String(page1.json?.items?.length), page1.json?.items?.length === 1)
    const big = await call(null, 'GET', `/freelancers/${PROVIDER_ID}/ratings?page=1&pageSize=1000`)
    check('pageSize=1000 bị giới hạn về 50', '50', String(big.json?.pageSize), big.json?.pageSize === 50)
    const zero = await call(null, 'GET', `/freelancers/${PROVIDER_ID}/ratings?page=1&pageSize=0`)
    check('pageSize=0 bị giới hạn về 1', '1', String(zero.json?.pageSize), zero.json?.pageSize === 1)
    record('đánh giá của freelancer không tồn tại', '404 FREELANCER_NOT_FOUND', await call(null, 'GET', `/freelancers/${crypto.randomUUID()}/ratings`))

    const page = await (await browser.newContext()).newPage()
    page.on('pageerror', (e) => pageErrors.push(e.message))
    await page.goto('/login')
    await page.getByPlaceholder('090 123 4567').fill(CUSTOMER.phone)
    await page.getByPlaceholder('••••••••').fill(CUSTOMER.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/discover/)
    await page.goto(`/discover/${PROVIDER_ID}`)
    await expect(page.getByText(`${after.ratingCount} đánh giá`).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('<b>in đậm</b>', { exact: false })).toBeVisible()
    check('UI hiển thị bình luận có HTML như văn bản thường (không render thẻ)', '0 thẻ <b> trong danh sách', String(await page.locator('main b').filter({ hasText: 'in đậm' }).count()), await page.locator('main b').filter({ hasText: 'in đậm' }).count() === 0)
  })

  test('đánh giá không bình luận trên đơn Completed có sẵn (fixture ABUNRV-C002)', async () => {
    const fixtureCustomer = otherToken
    const detail = await call(fixtureCustomer, 'GET', `/bookings/${UNREVIEWED_FIXTURE_BOOKING}`)
    check('đơn fixture ở trạng thái Completed', 'Completed', String(detail.json?.status), detail.json?.status === 'Completed')
    const withoutComment = await rate({ score: 4 }, fixtureCustomer, UNREVIEWED_FIXTURE_BOOKING)
    // Fixture chỉ dùng được một lần; chạy lại sẽ nhận BOOKING_ALREADY_RATED.
    recordOneOf('đánh giá 4 sao không bình luận', ['201', '409 BOOKING_ALREADY_RATED'], withoutComment)
    if (withoutComment.status === 201) check('bình luận để trống được lưu là null/rỗng', 'null hoặc rỗng', JSON.stringify(withoutComment.json?.comment), !withoutComment.json?.comment)
  })
})
