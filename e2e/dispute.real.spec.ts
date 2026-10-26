import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Khiếu nại của customer và quyết định của admin, chạy với backend thật. Frontend chưa có UI khiếu nại cho customer
// và trang admin khiếu nại mới là placeholder, nên các thao tác gọi thẳng API.
// Các bước admin chỉ chạy khi đặt E2E_ADMIN_PASSWORD (và E2E_ADMIN_PHONE nếu khác 0900000001).
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const ORIGIN = new URL(API).origin
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const OTHER_CUSTOMER = { phone: '0920000002', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
// Đơn đã Completed của customer test (mặc định là đơn do bộ test đánh giá tạo). Mở khiếu nại sẽ chuyển đơn sang Disputed nên chỉ dùng được một lần.
let DISPUTE_BOOKING = process.env.E2E_DISPUTE_BOOKING ?? '5416c278-ba78-4cc4-9fee-5b56fe388997'
// Chế độ tiếp tục: dùng khiếu nại đã mở ở lần chạy trước (chỉ chạy các bước còn lại, ví dụ phía admin).
const RESUME_DISPUTE = process.env.E2E_DISPUTE_ID
const SAMPLE_CASE_BOOKING_NUMBER = 'ABDEMO-C001'
const OTHER_CUSTOMER_BOOKING = 'b00b0000-0000-0000-0000-000000000012' // ABRATE-C002 của 0920000002
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')
const DESCRIPTION = 'Khu vực bếp chưa được vệ sinh kỹ như checklist. <b>Có ảnh</b> & "dấu kép" 😀'

interface Row { id: string; expected: string; actual: string; ok: boolean }
interface Res { status: number; json?: any; code?: string; body?: Buffer }

let ctx: APIRequestContext
let customerToken = ''
let otherToken = ''
let freelancerToken = ''
let adminToken = ''
let disputeId = ''
let bookingNumber = ''
let adminLoginResult = 'chưa thử'
let rateLimited = 0
const rows: Row[] = []
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function send(make: () => Promise<Awaited<ReturnType<APIRequestContext['fetch']>>>): Promise<Res> {
  for (let attempt = 0; attempt < 15; attempt++) {
    let res: Awaited<ReturnType<typeof make>>
    try { res = await make() } catch { return { status: 0, code: 'CLIENT_ERROR_OR_TIMEOUT' } }
    if (res.status() === 429) { rateLimited++; await sleep(Math.min(Number(res.headers()['retry-after'] ?? 60), 120) * 1000); continue }
    const body = await res.body()
    let json: any
    try { json = JSON.parse(body.toString('utf8')) } catch { json = undefined }
    return { status: res.status(), json, code: json?.code, body }
  }
  throw new Error('Vẫn bị 429 sau nhiều lần thử')
}

const auth = (token: string | null) => (token ? { Authorization: `Bearer ${token}` } : {})
const call = (token: string | null, method: string, path: string, data?: unknown) =>
  send(() => ctx.fetch(API + path, { method, headers: auth(token), data: data as never, timeout: 30_000 }))
const getUrl = (token: string | null, path: string) => send(() => ctx.fetch(ORIGIN + path, { headers: auth(token), timeout: 30_000 }))
const uploadEvidence = (token: string, id: string, file: { name: string; mimeType: string; buffer: Buffer }, fields: Record<string, string> = {}) =>
  send(() => ctx.fetch(`${API}/disputes/${id}/evidence`, { method: 'POST', headers: auth(token), multipart: { file, ...fields }, timeout: 30_000 }))

const login = async (who: { phone: string; password: string }) => {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: who.phone, password: who.password })
  expect(r.status, `đăng nhập ${who.phone}`).toBe(200)
  return r.json.accessToken as string
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
function info(id: string, actual: string) { rows.push({ id, expected: 'thông tin', actual, ok: true }) }

const myDispute = async () => (await call(customerToken, 'GET', `/disputes/${disputeId}`)).json
const adminDispute = async () => (await call(adminToken, 'GET', `/admin/disputes/${disputeId}`)).json
const open = (body: unknown, token: string | null = customerToken, bookingId = DISPUTE_BOOKING) => call(token, 'POST', `/disputes/bookings/${bookingId}`, body)
const message = (body: unknown, token: string | null = customerToken, id = disputeId) => call(token, 'POST', `/disputes/${id}/messages`, body)
const adminMessage = (body: unknown, internal = false, id = disputeId) => call(adminToken, 'POST', `/admin/disputes/${id}/messages${internal ? '?internalNote=true' : ''}`, body)
const decide = (body: unknown, token: string | null = adminToken, id = disputeId) => call(token, 'POST', `/admin/disputes/${id}/decision`, body)

test.describe.configure({ mode: 'serial' })

test.describe('Khiếu nại của customer và quyết định của admin (backend thật)', () => {
  test.beforeEach(() => { test.setTimeout(1_800_000) })

  test.beforeAll(async () => {
    test.setTimeout(1_800_000)
    ctx = await pwRequest.newContext()
    customerToken = await login(CUSTOMER)
    otherToken = await login(OTHER_CUSTOMER)
    freelancerToken = await login(FREELANCER)
    if (ADMIN.password) {
      const r = await call(null, 'POST', '/auth/login', { phoneNumber: ADMIN.phone, password: ADMIN.password })
      adminLoginResult = `${r.status}${r.code ? ' ' + r.code : ''}`
      if (r.status === 200) adminToken = r.json.accessToken
    } else {
      adminLoginResult = 'bỏ qua: chưa đặt E2E_ADMIN_PASSWORD'
    }
    if (RESUME_DISPUTE) {
      disputeId = RESUME_DISPUTE
      const existing = (await call(customerToken, 'GET', `/disputes/${disputeId}`)).json
      expect(existing?.id, 'khiếu nại để tiếp tục phải tồn tại và thuộc customer test').toBe(disputeId)
      DISPUTE_BOOKING = existing.bookingId
      bookingNumber = existing.bookingNumber
    }
  })

  test.afterAll(() => {
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/dispute.json', JSON.stringify({ disputeId, bookingNumber, adminLoginResult, rows, rateLimited }, null, 2))
    console.log('ADMIN_LOGIN:', adminLoginResult)
    console.log('DISPUTE_ID:', disputeId, bookingNumber)
    console.log('CASE_ROWS:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
  })

  test('danh mục khiếu nại, danh sách của customer và kiểm tra quyền truy cập', async () => {
    const categories = await call(customerToken, 'GET', '/disputes/categories')
    record('lấy danh mục khiếu nại', '200', categories)
    const codes = ((categories.json ?? []) as { code?: string; category?: string | number }[]).map((c) => String(c.code ?? c.category))
    check('có đủ 6 loại khiếu nại', 'ServiceQuality, Payment, Safety, Damage, Loss, Other', codes.join(', '), codes.length === 6)

    record('danh mục khiếu nại không có token', '401', await call(null, 'GET', '/disputes/categories'))
    record('freelancer xem danh sách khiếu nại của customer', '403', await call(freelancerToken, 'GET', '/disputes'))
    record('customer gọi API danh sách khiếu nại của admin', '403', await call(customerToken, 'GET', '/admin/disputes'))
    record('freelancer gọi API danh sách khiếu nại của admin', '403', await call(freelancerToken, 'GET', '/admin/disputes'))
    record('danh sách khiếu nại của admin không có token', '401', await call(null, 'GET', '/admin/disputes'))
    record('customer ra quyết định khiếu nại', '403', await decide({ outcomeCode: 'Refund', reason: 'thử quyền' }, customerToken, crypto.randomUUID()))

    const mine = await call(customerToken, 'GET', '/disputes')
    record('danh sách khiếu nại của customer', '200', mine)
    const sample = ((mine.json?.items ?? []) as { bookingNumber: string; status: string }[]).find((d) => d.bookingNumber === SAMPLE_CASE_BOOKING_NUMBER)
    check('khiếu nại mẫu (fixture ABDEMO-C001) nằm trong danh sách của customer test', 'có, trạng thái Open', sample ? sample.status : 'không thấy', Boolean(sample))
    record('xem khiếu nại không tồn tại', '404 DISPUTE_NOT_FOUND', await call(customerToken, 'GET', `/disputes/${crypto.randomUUID()}`))
  })

  test('mở khiếu nại: dữ liệu không hợp lệ và đơn không đủ điều kiện', async () => {
    test.skip(Boolean(RESUME_DISPUTE), 'chế độ tiếp tục')
    const booking = (await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json
    expect(['PendingAcceptance', 'Completed'], `đơn ${DISPUTE_BOOKING} phải ở PendingAcceptance/Completed, hiện là ${booking?.status}`).toContain(booking?.status)
    bookingNumber = booking.bookingNumber
    check('allowedActions của đơn có OpenDispute', 'chứa OpenDispute', JSON.stringify(booking.allowedActions), (booking.allowedActions as string[]).includes('OpenDispute'))

    recordOneOf('loại khiếu nại không tồn tại (99)', ['400 VALIDATION_FAILED', '400 INVALID_DISPUTE_CATEGORY'], await open({ category: 99, description: DESCRIPTION }))
    record('loại khiếu nại là chuỗi lạ', '400 VALIDATION_FAILED', await open({ category: 'NoSuchCategory', description: DESCRIPTION }))
    record('mô tả 9 ký tự (tối thiểu 10)', '400 VALIDATION_FAILED', await open({ category: 'ServiceQuality', description: 'ngắn quá!' }))
    record('thiếu mô tả', '400 VALIDATION_FAILED', await open({ category: 'ServiceQuality' }))
    record('mô tả 4001 ký tự', '400 VALIDATION_FAILED', await open({ category: 'ServiceQuality', description: 'x'.repeat(4001) }))
    record('mở khiếu nại không có token', '401', await open({ category: 'ServiceQuality', description: DESCRIPTION }, null))
    record('freelancer mở khiếu nại', '403', await open({ category: 'ServiceQuality', description: DESCRIPTION }, freelancerToken))
    record('mở khiếu nại cho đơn không tồn tại', '404 BOOKING_NOT_FOUND', await open({ category: 'ServiceQuality', description: DESCRIPTION }, customerToken, crypto.randomUUID()))
    record('mở khiếu nại cho đơn của customer khác', '404 BOOKING_NOT_FOUND', await open({ category: 'ServiceQuality', description: DESCRIPTION }, customerToken, OTHER_CUSTOMER_BOOKING))

    const cancelled = (await call(customerToken, 'GET', '/bookings?status=Cancelled&pageSize=1')).json?.items?.[0]
    if (cancelled) record('mở khiếu nại cho đơn đã hủy', '409 BOOKING_NOT_DISPUTABLE', await open({ category: 'ServiceQuality', description: DESCRIPTION }, customerToken, cancelled.id))
    else info('mở khiếu nại cho đơn đã hủy', 'bỏ qua: customer test không có đơn Cancelled')
    check('các lần mở lỗi không đổi trạng thái đơn', String(booking.status), String((await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json?.status), (await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json?.status === booking.status)
  })

  test('mở khiếu nại hợp lệ, chống mở trùng và khóa đơn sang Disputed', async () => {
    test.skip(Boolean(RESUME_DISPUTE), 'chế độ tiếp tục')
    const created = await open({ category: 'ServiceQuality', description: `  ${DESCRIPTION}  ` })
    recordOneOf('mở khiếu nại hợp lệ', ['200', '201'], created)
    const d = created.json ?? {}
    disputeId = d.id ?? ''
    expect(disputeId, JSON.stringify(created.json)).toMatch(/^[0-9a-f-]{36}$/)
    check('khiếu nại mới ở trạng thái Open, đúng loại', 'Open / ServiceQuality', `${d.status} / ${d.category}`, d.status === 'Open' && d.category === 'ServiceQuality')
    check('mô tả được cắt khoảng trắng và giữ nguyên ký tự đặc biệt', DESCRIPTION, String(d.description), d.description === DESCRIPTION)
    const hours = (Date.parse(d.responseDeadlineUtc) - Date.now()) / 3_600_000
    check('hạn phản hồi khoảng 48 giờ', '47 đến 48,1 giờ', `${hours.toFixed(2)} giờ`, hours > 47 && hours < 48.1)
    check('đơn chuyển sang Disputed', 'Disputed', String(d.bookingStatus), d.bookingStatus === 'Disputed')
    check('đơn của customer cũng là Disputed', 'Disputed', String((await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json?.status), (await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json?.status === 'Disputed')

    // DISPUTE_ALREADY_OPEN trong tài liệu/code không thể xảy ra vì kiểm tra trạng thái đơn chạy trước.
    record('mở khiếu nại lần 2 trên cùng đơn', '409 BOOKING_NOT_DISPUTABLE', await open({ category: 'Payment', description: 'Khiếu nại thứ hai cho cùng một đơn.' }))
    const list = await call(customerToken, 'GET', '/disputes?pageSize=100')
    check('khiếu nại mới có trong danh sách của customer', 'có', String(list.json?.items?.some((i: { id: string }) => i.id === disputeId)), Boolean(list.json?.items?.some((i: { id: string }) => i.id === disputeId)))
    record('customer khác xem khiếu nại', '404 DISPUTE_NOT_FOUND', await call(otherToken, 'GET', `/disputes/${disputeId}`))
    record('freelancer xem khiếu nại qua API customer', '403', await call(freelancerToken, 'GET', `/disputes/${disputeId}`))
  })

  test('bằng chứng và tin nhắn của customer', async () => {
    test.skip(Boolean(RESUME_DISPUTE), 'chế độ tiếp tục')
    const up = await uploadEvidence(customerToken, disputeId, { name: 'bep.png', mimeType: 'image/png', buffer: PNG }, { description: 'Ảnh bếp chưa sạch' })
    recordOneOf('tải ảnh bằng chứng hợp lệ', ['200', '201'], up)
    const evidence = ((await myDispute()).evidence ?? []) as { id: string; description: string | null; contentUrl: string }[]
    check('ảnh bằng chứng có trong khiếu nại kèm mô tả', 'Ảnh bếp chưa sạch', String(evidence.at(-1)?.description), evidence.at(-1)?.description === 'Ảnh bếp chưa sạch')
    const content = await getUrl(customerToken, evidence.at(-1)!.contentUrl)
    record('customer xem nội dung ảnh bằng chứng', '200', content)
    check('nội dung ảnh trả về đúng byte đã tải', 'giống tệp gốc', content.body?.equals(PNG) ? 'giống' : 'khác', Boolean(content.body?.equals(PNG)))
    record('xem ảnh bằng chứng không có token', '401', await getUrl(null, evidence.at(-1)!.contentUrl))
    // Backend trả 404 trần cho trường hợp này; middleware gắn mã chung UNEXPECTED_ERROR vào body.
    record('customer khác xem ảnh bằng chứng', '404 UNEXPECTED_ERROR', await getUrl(otherToken, evidence.at(-1)!.contentUrl))

    record('tệp ảnh rỗng', '400 EMPTY_FILE', await uploadEvidence(customerToken, disputeId, { name: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(0) }))
    record('tệp văn bản đặt tên .png', '415 UNSUPPORTED_IMAGE', await uploadEvidence(customerToken, disputeId, { name: 'a.png', mimeType: 'image/png', buffer: Buffer.from('không phải ảnh') }))
    record('ảnh vừa vượt 5 MB', '413 FILE_TOO_LARGE', await uploadEvidence(customerToken, disputeId, { name: 'big.png', mimeType: 'image/png', buffer: Buffer.concat([PNG, Buffer.alloc(5_452_000)]) }))
    recordOneOf('mô tả ảnh dài hơn 300 ký tự', ['400 VALIDATION_FAILED'], await uploadEvidence(customerToken, disputeId, { name: 'a.png', mimeType: 'image/png', buffer: PNG }, { description: 'x'.repeat(301) }))
    record('customer khác tải ảnh vào khiếu nại', '404 DISPUTE_NOT_FOUND', await uploadEvidence(otherToken, disputeId, { name: 'a.png', mimeType: 'image/png', buffer: PNG }))
    record('tải ảnh vào khiếu nại không tồn tại', '404 DISPUTE_NOT_FOUND', await uploadEvidence(customerToken, crypto.randomUUID(), { name: 'a.png', mimeType: 'image/png', buffer: PNG }))

    const sent = await message({ body: '  Tôi đã chụp ảnh lúc nhận lại nhà.  ' })
    record('customer gửi tin nhắn', '200', sent)
    const msgs = ((sent.json?.messages ?? []) as { body: string; isInternalAdminNote: boolean }[])
    check('tin nhắn được cắt khoảng trắng', 'Tôi đã chụp ảnh lúc nhận lại nhà.', String(msgs.at(-1)?.body), msgs.at(-1)?.body === 'Tôi đã chụp ảnh lúc nhận lại nhà.')
    record('tin nhắn rỗng', '400 VALIDATION_FAILED', await message({ body: '' }))
    record('tin nhắn 4001 ký tự', '400 VALIDATION_FAILED', await message({ body: 'x'.repeat(4001) }))
    record('customer khác nhắn vào khiếu nại', '404 DISPUTE_NOT_FOUND', await message({ body: 'xin chào' }, otherToken))
    record('nhắn không có token', '401', await message({ body: 'xin chào' }, null))
  })

  test('admin: danh sách, chi tiết, bằng chứng, nhắn tin và ghi chú nội bộ', async ({ browser }) => {
    test.skip(!adminToken, `chưa có tài khoản admin (${adminLoginResult})`)
    const queue = await call(adminToken, 'GET', '/admin/disputes?status=Open&pageSize=100')
    record('admin lọc hàng chờ theo status=Open', '200', queue)
    check('khiếu nại mới nằm trong hàng chờ Open', 'có', String(queue.json?.items?.some((i: { id: string }) => i.id === disputeId)), Boolean(queue.json?.items?.some((i: { id: string }) => i.id === disputeId)))
    check('hàng chờ Open còn khiếu nại mẫu ABDEMO-C001', 'có', String(queue.json?.items?.some((i: { bookingNumber: string }) => i.bookingNumber === SAMPLE_CASE_BOOKING_NUMBER)), Boolean(queue.json?.items?.some((i: { bookingNumber: string }) => i.bookingNumber === SAMPLE_CASE_BOOKING_NUMBER)))
    record('lọc theo status không hợp lệ', '400 VALIDATION_FAILED', await call(adminToken, 'GET', '/admin/disputes?status=NotAStatus'))
    const big = await call(adminToken, 'GET', '/admin/disputes?pageSize=1000')
    check('pageSize=1000 bị giới hạn về 100', '100', String(big.json?.pageSize), big.json?.pageSize === 100)

    const detail = await adminDispute()
    check('admin thấy tên customer, tên freelancer, mã đơn', `${bookingNumber}`, `${detail.bookingNumber} / ${detail.customerName} / ${detail.providerName}`, detail.bookingNumber === bookingNumber && Boolean(detail.customerName) && Boolean(detail.providerName))
    const evidence = (detail.evidence ?? []) as { contentUrl: string }[]
    check('đường dẫn ảnh bằng chứng của admin nằm dưới /admin/disputes', '/admin/disputes/', String(evidence[0]?.contentUrl), String(evidence[0]?.contentUrl).includes('/admin/disputes/'))
    const content = await getUrl(adminToken, evidence[0].contentUrl)
    record('admin xem nội dung ảnh bằng chứng', '200', content)
    record('customer dùng đường dẫn ảnh của admin', '403', await getUrl(customerToken, evidence[0].contentUrl))
    record('admin xem khiếu nại không tồn tại', '404 DISPUTE_NOT_FOUND', await call(adminToken, 'GET', `/admin/disputes/${crypto.randomUUID()}`))

    record('admin nhắn tin công khai', '200', await adminMessage({ body: 'Admin đã tiếp nhận, đang liên hệ người làm.' }))
    record('admin ghi chú nội bộ', '200', await adminMessage({ body: 'NỘI BỘ: ảnh khớp với phản ánh.' }, true))
    record('tin nhắn của admin rỗng', '400 VALIDATION_FAILED', await adminMessage({ body: '' }))
    const asAdmin = await adminDispute()
    const asCustomer = await myDispute()
    const adminSees = (asAdmin.messages as { body: string; isInternalAdminNote: boolean }[]).some((m) => m.isInternalAdminNote && m.body.startsWith('NỘI BỘ'))
    const customerSeesInternal = (asCustomer.messages as { body: string }[]).some((m) => m.body.startsWith('NỘI BỘ'))
    const customerSeesPublic = (asCustomer.messages as { body: string }[]).some((m) => m.body.startsWith('Admin đã tiếp nhận'))
    check('admin thấy ghi chú nội bộ', 'có', String(adminSees), adminSees)
    check('customer KHÔNG thấy ghi chú nội bộ', 'không thấy', customerSeesInternal ? 'LỘ ghi chú nội bộ' : 'không thấy', !customerSeesInternal)
    check('customer thấy tin nhắn công khai của admin', 'có', String(customerSeesPublic), customerSeesPublic)

    const page = await (await browser.newContext()).newPage()
    await page.goto('/login')
    await page.getByPlaceholder('090 123 4567').fill(ADMIN.phone)
    await page.getByPlaceholder('••••••••').fill(ADMIN.password)
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
    await expect(page).toHaveURL(/\/admin/)
    await page.goto('/admin/disputes')
    await expect(page.getByRole('heading', { name: 'Quản lý khiếu nại' })).toBeVisible()
    const listed = await page.getByText(bookingNumber).count()
    info('UI /admin/disputes có hiển thị khiếu nại thật không', listed > 0 ? `có (${listed} phần tử khớp ${bookingNumber})` : `không: trang hiện là placeholder, không liệt kê khiếu nại (không thấy ${bookingNumber})`)
  })

  test('admin ra quyết định: kiểm tra dữ liệu, kết quả và trạng thái sau quyết định', async () => {
    test.skip(!adminToken, `chưa có tài khoản admin (${adminLoginResult})`)
    const base = (await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json
    const orderValue = base.baseAmountVnd + base.surchargeAmountVnd
    record('mã kết quả 1 ký tự (tối thiểu 2)', '400 VALIDATION_FAILED', await decide({ outcomeCode: 'R', reason: 'Lý do hợp lệ' }))
    record('lý do 4 ký tự (tối thiểu 5)', '400 VALIDATION_FAILED', await decide({ outcomeCode: 'Refund', reason: 'ngắn' }))
    record('thiếu lý do', '400 VALIDATION_FAILED', await decide({ outcomeCode: 'Refund' }))
    record('tổng hoàn tiền và trả người làm vượt giá trị đơn', '400 INVALID_DISPUTE_AMOUNT', await decide({ outcomeCode: 'Split', reason: 'Quá số tiền', refundAmountVnd: orderValue, providerAmountVnd: 1 }))
    record('quyết định cho khiếu nại không tồn tại', '404 DISPUTE_NOT_FOUND', await decide({ outcomeCode: 'Refund', reason: 'Không có khiếu nại' }, adminToken, crypto.randomUUID()))
    recordOneOf('số tiền hoàn âm', ['400 VALIDATION_FAILED', '400 INVALID_DISPUTE_AMOUNT', '200'], await decide({ outcomeCode: 'Neg', reason: 'Số tiền âm', refundAmountVnd: -1 }, adminToken, crypto.randomUUID()))
    check('các lần quyết định lỗi không đổi trạng thái khiếu nại', 'Open', String((await adminDispute()).status), (await adminDispute()).status === 'Open')

    const refund = Math.floor(orderValue * 0.25)
    const provider = Math.floor(orderValue * 0.5)
    const decided = await decide({ outcomeCode: '  PartialRefund  ', reason: '  Hoàn một phần do bếp chưa sạch.  ', refundAmountVnd: refund, providerAmountVnd: provider })
    record('admin ra quyết định hợp lệ', '200', decided)
    const d = decided.json ?? {}
    check('khiếu nại thành Decided', 'Decided', String(d.status), d.status === 'Decided')
    const decision = (d.decisions ?? [])[0] ?? {}
    check('quyết định được lưu đúng (cắt khoảng trắng, đúng số tiền, loại Initial)', `PartialRefund / ${refund} / ${provider} / Initial`, `${decision.outcomeCode} / ${decision.refundAmountVnd} / ${decision.providerAmountVnd} / ${decision.type}`,
      decision.outcomeCode === 'PartialRefund' && decision.refundAmountVnd === refund && decision.providerAmountVnd === provider && decision.type === 'Initial' && decision.reason === 'Hoàn một phần do bếp chưa sạch.')
    const mine = await myDispute()
    check('customer thấy quyết định của admin', 'Decided, 1 quyết định', `${mine.status}, ${mine.decisions?.length}`, mine.status === 'Decided' && mine.decisions?.length === 1)
    const after = (await call(customerToken, 'GET', `/bookings/${DISPUTE_BOOKING}`)).json
    info('trạng thái đơn sau quyết định', `${after.status} (allowedActions ${JSON.stringify(after.allowedActions)})`)
    info('giao dịch cọc sau quyết định', String(after.depositPayment?.status))

    record('ra quyết định lần 2', '409 DISPUTE_ALREADY_DECIDED', await decide({ outcomeCode: 'Again', reason: 'Quyết định lần hai' }))
    record('customer bổ sung ảnh sau khi có quyết định', '409 DISPUTE_CLOSED', await uploadEvidence(customerToken, disputeId, { name: 'late.png', mimeType: 'image/png', buffer: PNG }))
    const lateMessage = await message({ body: 'Tôi muốn nhắn thêm sau quyết định.' })
    info('customer nhắn tin sau khi đã có quyết định', `${lateMessage.status}${lateMessage.code ? ' ' + lateMessage.code : ''}`)
    const reopen = await open({ category: 'Payment', description: 'Mở lại khiếu nại sau quyết định.' })
    info('mở khiếu nại mới trên đơn đã có quyết định', `${reopen.status}${reopen.code ? ' ' + reopen.code : ''}`)
    const appeal = await call(customerToken, 'POST', `/disputes/${disputeId}/appeal`, { reason: 'Không đồng ý với quyết định.' })
    info('API xem xét lại (appeal) cho customer', `POST /disputes/{id}/appeal → ${appeal.status}`)
  })

  test('giới hạn 10 ảnh bằng chứng mỗi bên (chạy sau cùng vì tốn nhiều request ghi)', async () => {
    // Dùng đơn khác của customer để không phụ thuộc quyết định ở trên: chỉ chạy khi E2E_LIMIT_BOOKING là một đơn Completed chưa khiếu nại.
    const limitBooking = process.env.E2E_LIMIT_BOOKING
    test.skip(!limitBooking, 'đặt E2E_LIMIT_BOOKING=<bookingId Completed chưa khiếu nại> để chạy; test tốn khoảng 15 request ghi')
    const created = await open({ category: 'Other', description: 'Khiếu nại để kiểm tra giới hạn ảnh bằng chứng.' }, customerToken, limitBooking!)
    recordOneOf('mở khiếu nại để thử giới hạn ảnh', ['200', '201'], created)
    const id = created.json.id as string
    for (let i = 1; i <= 10; i++) {
      const r = await uploadEvidence(customerToken, id, { name: `e${i}.png`, mimeType: 'image/png', buffer: PNG })
      expect.soft([200, 201], `ảnh thứ ${i}`).toContain(r.status)
    }
    record('ảnh bằng chứng thứ 11', '409 EVIDENCE_LIMIT_REACHED', await uploadEvidence(customerToken, id, { name: 'e11.png', mimeType: 'image/png', buffer: PNG }))
  })
})
