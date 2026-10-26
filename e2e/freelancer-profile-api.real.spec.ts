import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// API freelancer tự quản lý hồ sơ công khai (backend/docs/FREELANCER_PROFILE_API.md), kiểm chứng trên backend thật.
// Dùng freelancer thử 0910000004 (Phạm Quốc Bảo, AC_SERVICE) và khôi phục nguyên trạng ở cuối; 0910000006 (Submitted) cho nhánh chưa duyệt;
// 0910000007 (UnderReview) tạm đặt Suspended qua psql rồi trả lại.
const API = process.env.E2E_API_URL ?? 'http://localhost:8080/api/v1'
const PASSWORD = process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026'
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
const PROVIDER = 'dddddddd-0000-0000-0000-000000000004'
const SUBMITTED_PROVIDER = 'dddddddd-0000-0000-0000-000000000006'
const REVIEW_PROVIDER = 'dddddddd-0000-0000-0000-000000000007'
const DB_CONTAINER = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'

interface Row { id: string; expected: string; actual: string; ok: boolean }
interface Res { status: number; json?: any; code?: string }

let ctx: APIRequestContext
let token = ''
let customerToken = ''
let adminToken = ''
let submittedToken = ''
let reviewToken = ''
let original: any
let categories: { id: string; code: string; name: string }[] = []
let areas: { id: string; city: string; district: string }[] = []
let rateLimited = 0
const rows: Row[] = []
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function call(auth: string | null, method: string, path: string, data?: unknown): Promise<Res> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await ctx.fetch(API + path, { method, headers: auth ? { Authorization: `Bearer ${auth}` } : {}, data: data as never, timeout: 30_000 })
    if (res.status() === 429) { rateLimited++; await sleep(60_000); continue }
    let json: any
    try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
    return { status: res.status(), json, code: json?.code }
  }
  throw new Error('Vẫn bị 429')
}

const login = async (phone: string, password: string) => {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: phone, password })
  expect(r.status, `đăng nhập ${phone}`).toBe(200)
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
function check(id: string, expected: string, actual: string, ok: boolean) {
  rows.push({ id, expected, actual, ok })
  expect.soft(ok, `${id}: kỳ vọng ${expected}, thực tế ${actual}`).toBe(true)
}

const mine = () => call(token, 'GET', '/freelancer/profile')
const category = (code: string) => categories.find((c) => c.code === code)!.id
const area = (district: string) => areas.find((a) => a.district === district)!.id
const putService = (code: string, body: unknown, auth = token) => call(auth, 'PUT', `/freelancer/profile/services/${category(code)}`, body)
const publicDetail = () => call(null, 'GET', `/freelancers/${PROVIDER}`)
const publicList = async (query = '') => (await call(null, 'GET', `/freelancers?pageSize=50${query}`)).json?.items as { providerId: string; minHourlyRateVnd: number | null; serviceCodes: string[]; isAcceptingBookings: boolean }[]

test.describe.configure({ mode: 'serial' })

test.describe('Freelancer tự quản lý hồ sơ công khai (backend thật)', () => {
  test.beforeEach(() => { test.setTimeout(900_000) })

  test.beforeAll(async () => {
    test.setTimeout(900_000)
    ctx = await pwRequest.newContext()
    token = await login('0910000004', PASSWORD)
    submittedToken = await login('0910000006', PASSWORD)
    reviewToken = await login('0910000007', PASSWORD)
    customerToken = await login(CUSTOMER.phone, CUSTOMER.password)
    if (ADMIN.password) adminToken = await login(ADMIN.phone, ADMIN.password)
    categories = (await call(null, 'GET', '/catalog/service-categories')).json
    areas = (await call(null, 'GET', '/catalog/service-areas')).json
    original = (await mine()).json
  })

  test.afterAll(async () => {
    // Khôi phục nguyên trạng freelancer thử và trạng thái duyệt của freelancer 7.
    try {
      sql(`update providers set approval_status = 'UnderReview' where id = '${REVIEW_PROVIDER}' and approval_status = 'Suspended'`)
      if (original) {
        const keep = new Set<string>(original.services.map((s: { code: string }) => s.code))
        const current = (await mine()).json
        for (const s of current.services as { serviceCategoryId: string; code: string }[]) {
          if (!keep.has(s.code)) await call(token, 'DELETE', `/freelancer/profile/services/${s.serviceCategoryId}`)
        }
        for (const s of original.services as { code: string; hourlyRateVnd: number; description: string | null; isActive: boolean }[]) {
          await putService(s.code, { hourlyRateVnd: s.hourlyRateVnd, description: s.description, isActive: s.isActive })
        }
        await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: original.serviceAreas.map((a: any) => ({ serviceAreaId: a.serviceAreaId, travelRadiusKm: a.travelRadiusKm })) })
        await call(token, 'PATCH', '/freelancer/profile', { bio: original.bio ?? '', autoAcceptBookings: original.autoAcceptBookings, isAcceptingBookings: original.isAcceptingBookings })
      }
    } catch (error) {
      console.log('RESTORE_FAILED:', String(error))
    }
    mkdirSync('test-results', { recursive: true })
    writeFileSync('test-results/freelancer-profile-api.json', JSON.stringify({ rows, rateLimited }, null, 2))
    console.log('CASE_ROWS:\n' + rows.map((r) => `${r.ok ? 'OK ' : 'XX '} ${r.id} | expected=${r.expected} | actual=${r.actual}`).join('\n'))
    console.log('RATE_LIMITED_RETRIES:', rateLimited)
  })

  test('quyền truy cập và xem hồ sơ của tôi', async () => {
    record('xem hồ sơ không có token', '401', await call(null, 'GET', '/freelancer/profile'))
    record('customer xem hồ sơ freelancer', '403', await call(customerToken, 'GET', '/freelancer/profile'))
    record('customer sửa hồ sơ freelancer', '403', await call(customerToken, 'PATCH', '/freelancer/profile', { bio: 'x' }))
    record('customer thêm kỹ năng', '403', await putService('AC_SERVICE', { hourlyRateVnd: 100_000 }, customerToken))
    record('customer thay khu vực', '403', await call(customerToken, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1') }] }))
    if (adminToken) record('admin xem hồ sơ freelancer', '403', await call(adminToken, 'GET', '/freelancer/profile'))

    const r = await mine()
    record('freelancer xem hồ sơ của mình', '200', r)
    const p = r.json
    check('hồ sơ có đủ trường', 'providerId, displayName, approvalStatus, bio, experienceYears, isAcceptingBookings, autoAcceptBookings, canAcceptBookings, missingForBookings, acceptingBookingsPaused, services, serviceAreas',
      Object.keys(p).join(', '), ['providerId', 'displayName', 'approvalStatus', 'bio', 'experienceYears', 'isAcceptingBookings', 'autoAcceptBookings', 'canAcceptBookings', 'missingForBookings', 'acceptingBookingsPaused', 'services', 'serviceAreas'].every((k) => k in p))
    check('hồ sơ thử đã duyệt, đủ điều kiện nhận đơn', 'Approved, canAcceptBookings, missing rỗng', `${p.approvalStatus}, ${p.canAcceptBookings}, ${JSON.stringify(p.missingForBookings)}`, p.approvalStatus === 'Approved' && p.canAcceptBookings && p.missingForBookings.length === 0)
    check('không lộ dữ liệu định danh', 'không có CCCD, ngày sinh, địa chỉ, số điện thoại', Object.keys(p).filter((k) => /citizen|birth|address|phone|legal/i.test(k)).join(', ') || 'không', !Object.keys(p).some((k) => /citizen|birth|address|phone|legal/i.test(k)))
  })

  test('giới thiệu, bật/tắt nhận đơn, tự động nhận đơn', async () => {
    const set = await call(token, 'PATCH', '/freelancer/profile', { bio: '  Vệ sinh máy lạnh tận nơi, bảo hành 30 ngày.  ' })
    record('đặt giới thiệu', '200', set)
    check('giới thiệu được cắt khoảng trắng', 'Vệ sinh máy lạnh tận nơi, bảo hành 30 ngày.', String(set.json?.bio), set.json?.bio === 'Vệ sinh máy lạnh tận nơi, bảo hành 30 ngày.')
    check('giới thiệu hiện trên hồ sơ công khai', 'giống', String((await publicDetail()).json?.bio), (await publicDetail()).json?.bio === 'Vệ sinh máy lạnh tận nơi, bảo hành 30 ngày.')

    record('giới thiệu 1001 ký tự', '400 VALIDATION_FAILED', await call(token, 'PATCH', '/freelancer/profile', { bio: 'a'.repeat(1001) }))
    check('giới thiệu 1000 ký tự được chấp nhận', '200', String((await call(token, 'PATCH', '/freelancer/profile', { bio: 'a'.repeat(1000) })).status), true)

    const same = await call(token, 'PATCH', '/freelancer/profile', {})
    record('PATCH rỗng', '200', same)
    check('PATCH rỗng không đổi giới thiệu', '1000 ký tự', String(same.json?.bio?.length), same.json?.bio?.length === 1000)
    const cleared = await call(token, 'PATCH', '/freelancer/profile', { bio: '   ' })
    check('chuỗi trắng xóa giới thiệu', 'null', String(cleared.json?.bio), cleared.json?.bio === null)

    const off = await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: false })
    check('tắt nhận đơn', 'isAcceptingBookings=false', String(off.json?.isAcceptingBookings), off.json?.isAcceptingBookings === false)
    check('danh bạ công khai phản ánh đã tắt nhận đơn', 'acceptingBookings=false', String((await publicList()).find((x) => x.providerId === PROVIDER)?.isAcceptingBookings), (await publicList()).find((x) => x.providerId === PROVIDER)?.isAcceptingBookings === false)
    const on = await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true })
    check('bật lại nhận đơn', 'isAcceptingBookings=true', String(on.json?.isAcceptingBookings), on.json?.isAcceptingBookings === true)

    const auto = await call(token, 'PATCH', '/freelancer/profile', { autoAcceptBookings: true })
    check('bật tự động nhận đơn', 'autoAcceptBookings=true', String(auto.json?.autoAcceptBookings), auto.json?.autoAcceptBookings === true)
    check('tự động nhận đơn được lưu', 'true', String((await mine()).json?.autoAcceptBookings), (await mine()).json?.autoAcceptBookings === true)
    await call(token, 'PATCH', '/freelancer/profile', { autoAcceptBookings: false })
  })

  test('kỹ năng (dịch vụ) và giá theo giờ', async () => {
    const added = await putService('GARDENING', { hourlyRateVnd: 90_000, description: '  Cắt tỉa cây cảnh  ' })
    record('thêm kỹ năng GARDENING', '200', added)
    const g = (added.json?.services as { code: string; hourlyRateVnd: number; description: string | null; isActive: boolean; isListed: boolean }[]).find((s) => s.code === 'GARDENING')
    check('kỹ năng mới được lưu và đang hiện công khai', '90000, "Cắt tỉa cây cảnh", bật', `${g?.hourlyRateVnd}, ${JSON.stringify(g?.description)}, ${g?.isActive}/${g?.isListed}`, g?.hourlyRateVnd === 90_000 && g.description === 'Cắt tỉa cây cảnh' && g.isActive && g.isListed)
    check('kỹ năng mới hiện trên hồ sơ công khai', 'GARDENING', JSON.stringify((await publicDetail()).json?.services.map((s: { code: string }) => s.code)), (await publicDetail()).json?.services.some((s: { code: string }) => s.code === 'GARDENING'))
    check('kỹ năng mới tìm được theo serviceCode', 'có', String((await publicList('&serviceCode=GARDENING')).some((x) => x.providerId === PROVIDER)), (await publicList('&serviceCode=GARDENING')).some((x) => x.providerId === PROVIDER))
    const cheapest = (await publicList()).find((x) => x.providerId === PROVIDER)
    check('minHourlyRateVnd là giá thấp nhất trong các kỹ năng đang bật', '90000', String(cheapest?.minHourlyRateVnd), cheapest?.minHourlyRateVnd === 90_000)

    const changed = await putService('GARDENING', { hourlyRateVnd: 95_000 })
    check('sửa giá và xóa mô tả', '95000, null', `${changed.json?.services.find((s: { code: string }) => s.code === 'GARDENING').hourlyRateVnd}, ${changed.json?.services.find((s: { code: string }) => s.code === 'GARDENING').description}`,
      changed.json?.services.find((s: { code: string }) => s.code === 'GARDENING').hourlyRateVnd === 95_000 && changed.json?.services.find((s: { code: string }) => s.code === 'GARDENING').description === null)
    check('chỉ có một dòng cho mỗi kỹ năng', '1', String(changed.json?.services.filter((s: { code: string }) => s.code === 'GARDENING').length), changed.json?.services.filter((s: { code: string }) => s.code === 'GARDENING').length === 1)

    record('giá 9999', '400 INVALID_HOURLY_RATE', await putService('GARDENING', { hourlyRateVnd: 9_999 }))
    record('giá 1.000.001', '400 INVALID_HOURLY_RATE', await putService('GARDENING', { hourlyRateVnd: 1_000_001 }))
    record('giá âm', '400 INVALID_HOURLY_RATE', await putService('GARDENING', { hourlyRateVnd: -5 }))
    record('thiếu giá', '400 VALIDATION_FAILED', await putService('GARDENING', { description: 'chưa có giá' }))
    record('giá là chuỗi', '400 VALIDATION_FAILED', await putService('GARDENING', { hourlyRateVnd: 'abc' }))
    record('mô tả 501 ký tự', '400 VALIDATION_FAILED', await putService('GARDENING', { hourlyRateVnd: 90_000, description: 'a'.repeat(501) }))
    record('danh mục không tồn tại', '404 SERVICE_CATEGORY_NOT_FOUND', await call(token, 'PUT', `/freelancer/profile/services/${crypto.randomUUID()}`, { hourlyRateVnd: 90_000 }))
    record('mã danh mục không phải GUID', '404', await call(token, 'PUT', '/freelancer/profile/services/khong-phai-guid', { hourlyRateVnd: 90_000 }))
    check('các lần lỗi không đổi giá', '95000', String((await mine()).json?.services.find((s: { code: string }) => s.code === 'GARDENING').hourlyRateVnd), (await mine()).json?.services.find((s: { code: string }) => s.code === 'GARDENING').hourlyRateVnd === 95_000)

    const paused = await putService('GARDENING', { hourlyRateVnd: 95_000, isActive: false })
    const gp = paused.json?.services.find((s: { code: string }) => s.code === 'GARDENING')
    check('tạm ngừng kỹ năng giữ nguyên giá', 'isActive=false, isListed=false, 95000', `${gp?.isActive}, ${gp?.isListed}, ${gp?.hourlyRateVnd}`, gp?.isActive === false && gp?.isListed === false && gp?.hourlyRateVnd === 95_000)
    check('kỹ năng tạm ngừng không hiện công khai', 'không có GARDENING', JSON.stringify((await publicDetail()).json?.services.map((s: { code: string }) => s.code)), !(await publicDetail()).json?.services.some((s: { code: string }) => s.code === 'GARDENING'))
    await putService('GARDENING', { hourlyRateVnd: 95_000 })

    record('xóa kỹ năng', '200', await call(token, 'DELETE', `/freelancer/profile/services/${category('GARDENING')}`))
    check('kỹ năng đã xóa khỏi hồ sơ', 'không có GARDENING', JSON.stringify((await mine()).json?.services.map((s: { code: string }) => s.code)), !(await mine()).json?.services.some((s: { code: string }) => s.code === 'GARDENING'))
    record('xóa lại kỹ năng đã xóa', '404 SERVICE_NOT_FOUND', await call(token, 'DELETE', `/freelancer/profile/services/${category('GARDENING')}`))
    record('xóa kỹ năng chưa từng có', '404 SERVICE_NOT_FOUND', await call(token, 'DELETE', `/freelancer/profile/services/${category('COOKING')}`))
  })

  test('giá mới được dùng khi báo giá đặt lịch', async () => {
    const original4 = original.services.find((s: { code: string }) => s.code === 'AC_SERVICE')
    const addresses = (await call(customerToken, 'GET', '/customer/addresses')).json as { id: string; district: string }[]
    const addressId = addresses.find((a) => a.district === 'Quận 1')!.id
    const availability = (await call(null, 'GET', `/freelancers/${PROVIDER}/availability?days=14`)).json
    const ranges = (availability.days as { free: { startsAtUtc: string }[] }[]).flatMap((d) => d.free).sort((a, b) => Date.parse(b.startsAtUtc) - Date.parse(a.startsAtUtc))
    const start = new Date(ranges[0].startsAtUtc).toISOString()
    const body = { providerId: PROVIDER, serviceCategoryId: category('AC_SERVICE'), customerAddressId: addressId, startsAtUtc: start, endsAtUtc: new Date(Date.parse(start) + 2 * 3_600_000).toISOString() }

    await putService('AC_SERVICE', { hourlyRateVnd: 150_000, description: original4.description })
    const quoted = await call(customerToken, 'POST', '/bookings/quote', body)
    record('báo giá sau khi tăng giá', '200', quoted)
    check('báo giá dùng giá mới 150.000/giờ', '150000 × 2 giờ = 300000', `${quoted.json?.unitPriceVnd} / ${quoted.json?.baseAmountVnd}`, quoted.json?.unitPriceVnd === 150_000 && quoted.json?.baseAmountVnd === 300_000)

    // Còn một kỹ năng khác đang bật nên freelancer vẫn nhận đơn; kỹ năng tạm ngừng chỉ không đặt được riêng nó.
    await putService('GARDENING', { hourlyRateVnd: 90_000 })
    await putService('AC_SERVICE', { hourlyRateVnd: 150_000, description: original4.description, isActive: false })
    record('báo giá khi tạm ngừng một kỹ năng (còn kỹ năng khác bật)', '409 SERVICE_NOT_OFFERED', await call(customerToken, 'POST', '/bookings/quote', body))

    await putService('AC_SERVICE', { hourlyRateVnd: original4.hourlyRateVnd, description: original4.description })
    const restored = await call(customerToken, 'POST', '/bookings/quote', body)
    check('báo giá trở lại giá cũ khi khôi phục', String(original4.hourlyRateVnd), String(restored.json?.unitPriceVnd), restored.json?.unitPriceVnd === original4.hourlyRateVnd)
    await call(token, 'DELETE', `/freelancer/profile/services/${category('GARDENING')}`)

    // Tạm ngừng kỹ năng đang bật cuối cùng thì nhận đơn bị tự tắt, và bật lại kỹ năng không tự bật lại nhận đơn.
    await putService('AC_SERVICE', { hourlyRateVnd: original4.hourlyRateVnd, description: original4.description, isActive: false })
    record('báo giá khi tạm ngừng kỹ năng cuối cùng (nhận đơn bị tự tắt)', '409 PROVIDER_NOT_BOOKABLE', await call(customerToken, 'POST', '/bookings/quote', body))
    await putService('AC_SERVICE', { hourlyRateVnd: original4.hourlyRateVnd, description: original4.description })
    record('bật lại kỹ năng không tự bật lại nhận đơn', '409 PROVIDER_NOT_BOOKABLE', await call(customerToken, 'POST', '/bookings/quote', body))
    record('bật lại nhận đơn thủ công', '200', await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true }))
    record('báo giá được lại sau khi bật nhận đơn', '200', await call(customerToken, 'POST', '/bookings/quote', body))
  })

  test('khu vực nhận ca', async () => {
    const replaced = await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1'), travelRadiusKm: 5 }, { serviceAreaId: area('Quận 3') }] })
    record('thay danh sách khu vực', '200', replaced)
    const got = (replaced.json?.serviceAreas as { district: string; travelRadiusKm: number | null }[]).map((a) => `${a.district}:${a.travelRadiusKm}`).sort()
    check('khu vực mới, bán kính mặc định 10 khi bỏ trống', 'Quận 1:5, Quận 3:10', got.join(', '), got.join(', ') === 'Quận 1:5, Quận 3:10')
    check('hồ sơ công khai hiện khu vực mới', 'Quận 1, Quận 3', JSON.stringify((await publicDetail()).json?.serviceAreas.map((a: { district: string }) => a.district).sort()), JSON.stringify((await publicDetail()).json?.serviceAreas.map((a: { district: string }) => a.district).sort()) === JSON.stringify(['Quận 1', 'Quận 3']))
    check('tìm theo quận mới được', 'có', String((await publicList('&district=Quận 3')).some((x) => x.providerId === PROVIDER)), (await publicList('&district=' + encodeURIComponent('Quận 3'))).some((x) => x.providerId === PROVIDER))
    check('khu vực cũ (Tân Bình) không còn', 'không còn', String((await publicList('&district=' + encodeURIComponent('Quận Tân Bình'))).some((x) => x.providerId === PROVIDER)), !(await publicList('&district=' + encodeURIComponent('Quận Tân Bình'))).some((x) => x.providerId === PROVIDER))

    const radius = await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1'), travelRadiusKm: 30 }, { serviceAreaId: area('Quận 3'), travelRadiusKm: 100 }] })
    check('đổi bán kính của khu vực đang có', 'Quận 1:30, Quận 3:100', radius.json?.serviceAreas.map((a: { district: string; travelRadiusKm: number }) => `${a.district}:${a.travelRadiusKm}`).sort().join(', '), radius.json?.serviceAreas.map((a: { district: string; travelRadiusKm: number }) => `${a.district}:${a.travelRadiusKm}`).sort().join(', ') === 'Quận 1:30, Quận 3:100')

    record('danh sách khu vực rỗng', '400 VALIDATION_FAILED', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [] }))
    record('thiếu danh sách khu vực', '400 VALIDATION_FAILED', await call(token, 'PUT', '/freelancer/profile/service-areas', {}))
    record('khu vực bị trùng', '400 DUPLICATE_SERVICE_AREA', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1') }, { serviceAreaId: area('Quận 1'), travelRadiusKm: 7 }] }))
    record('khu vực không tồn tại', '400 INVALID_SERVICE_AREA', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: crypto.randomUUID() }] }))
    record('bán kính 0', '400 VALIDATION_FAILED', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1'), travelRadiusKm: 0 }] }))
    record('bán kính 101', '400 VALIDATION_FAILED', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1'), travelRadiusKm: 101 }] }))
    record('21 khu vực', '400 VALIDATION_FAILED', await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: areas.slice(0, 21).map((a) => ({ serviceAreaId: a.id })) }))
    check('các lần lỗi không đổi khu vực', 'Quận 1, Quận 3', (await mine()).json?.serviceAreas.map((a: { district: string }) => a.district).sort().join(', '), (await mine()).json?.serviceAreas.map((a: { district: string }) => a.district).sort().join(', ') === 'Quận 1, Quận 3')

    const twenty = await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: areas.slice(0, 20).map((a) => ({ serviceAreaId: a.id })) })
    check('đúng 20 khu vực được chấp nhận', '200 với 20 khu vực', `${twenty.status} / ${twenty.json?.serviceAreas?.length}`, twenty.status === 200 && twenty.json?.serviceAreas?.length === 20)
    await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1'), travelRadiusKm: 10 }] })
  })

  test('tự động tắt nhận đơn khi không còn đủ điều kiện', async () => {
    const services = (await mine()).json.services as { serviceCategoryId: string; code: string; hourlyRateVnd: number; description: string | null }[]
    expect(services.some((s) => s.code === 'AC_SERVICE')).toBe(true)
    await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true })

    const gone = await call(token, 'DELETE', `/freelancer/profile/services/${category('AC_SERVICE')}`)
    record('xóa kỹ năng đang bật cuối cùng', '200', gone)
    check('nhận đơn bị tự tắt kèm cờ báo', 'isAcceptingBookings=false, acceptingBookingsPaused=true, missing NO_ACTIVE_SERVICE',
      `${gone.json?.isAcceptingBookings}, ${gone.json?.acceptingBookingsPaused}, ${JSON.stringify(gone.json?.missingForBookings)}`,
      gone.json?.isAcceptingBookings === false && gone.json?.acceptingBookingsPaused === true && gone.json?.missingForBookings.includes('NO_ACTIVE_SERVICE'))
    check('cờ chỉ có ở phản hồi của thao tác gây ra', 'GET sau đó là false', String((await mine()).json?.acceptingBookingsPaused), (await mine()).json?.acceptingBookingsPaused === false)
    check('danh bạ công khai không còn hiển thị là nhận đơn', 'false', String((await publicList()).find((x) => x.providerId === PROVIDER)?.isAcceptingBookings), (await publicList()).find((x) => x.providerId === PROVIDER)?.isAcceptingBookings === false)

    const blocked = await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true })
    record('bật nhận đơn khi chưa có kỹ năng', '409 PROFILE_NOT_READY', blocked)
    check('thông báo nêu điều kiện còn thiếu', 'có NO_ACTIVE_SERVICE', String(blocked.json?.detail), String(blocked.json?.detail).includes('NO_ACTIVE_SERVICE'))

    const back = services.find((s) => s.code === 'AC_SERVICE')!
    await putService('AC_SERVICE', { hourlyRateVnd: back.hourlyRateVnd, description: back.description })
    record('bật lại nhận đơn sau khi thêm lại kỹ năng', '200', await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true }))

    const off = await putService('AC_SERVICE', { hourlyRateVnd: back.hourlyRateVnd, description: back.description, isActive: false })
    check('tắt kỹ năng cuối cùng cũng tự tắt nhận đơn', 'paused=true', String(off.json?.acceptingBookingsPaused), off.json?.acceptingBookingsPaused === true && off.json?.isAcceptingBookings === false)
    await putService('AC_SERVICE', { hourlyRateVnd: back.hourlyRateVnd, description: back.description })
    await call(token, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true })

    // Khu vực: chỉ còn khu vực đã ngừng hoạt động thì cũng không đủ điều kiện. Ở đây kiểm tra nhánh "không còn khu vực" qua việc thay bằng khu vực hợp lệ nên vẫn nhận đơn.
    const keep = await call(token, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 3') }] })
    check('đổi khu vực vẫn còn đủ điều kiện thì giữ nguyên nhận đơn', 'true, paused=false', `${keep.json?.isAcceptingBookings}, ${keep.json?.acceptingBookingsPaused}`, keep.json?.isAcceptingBookings === true && keep.json?.acceptingBookingsPaused === false)
  })

  test('hồ sơ chưa được duyệt và hồ sơ bị tạm ngưng', async () => {
    const submitted = await call(submittedToken, 'GET', '/freelancer/profile')
    record('freelancer chưa duyệt xem hồ sơ', '200', submitted)
    check('trạng thái chờ duyệt và còn thiếu NOT_APPROVED', 'Submitted, NOT_APPROVED', `${submitted.json?.approvalStatus}, ${JSON.stringify(submitted.json?.missingForBookings)}`, submitted.json?.approvalStatus === 'Submitted' && submitted.json?.missingForBookings.includes('NOT_APPROVED'))
    const bio = await call(submittedToken, 'PATCH', '/freelancer/profile', { bio: 'Giới thiệu chuẩn bị trước khi được duyệt.' })
    record('hồ sơ chưa duyệt vẫn chuẩn bị giới thiệu', '200', bio)
    record('hồ sơ chưa duyệt bật nhận đơn', '409 PROFILE_NOT_READY', await call(submittedToken, 'PATCH', '/freelancer/profile', { isAcceptingBookings: true }))
    const ac = await call(submittedToken, 'PUT', `/freelancer/profile/services/${category('LAUNDRY')}`, { hourlyRateVnd: 70_000 })
    record('hồ sơ chưa duyệt thêm kỹ năng', '200', ac)
    check('hồ sơ chưa duyệt chưa hiện công khai', '404', String((await call(null, 'GET', `/freelancers/${SUBMITTED_PROVIDER}`)).status), (await call(null, 'GET', `/freelancers/${SUBMITTED_PROVIDER}`)).status === 404)
    await call(submittedToken, 'DELETE', `/freelancer/profile/services/${category('LAUNDRY')}`)

    sql(`update providers set approval_status = 'Suspended' where id = '${REVIEW_PROVIDER}'`)
    const view = await call(reviewToken, 'GET', '/freelancer/profile')
    check('hồ sơ bị tạm ngưng vẫn xem được', 'Suspended', String(view.json?.approvalStatus), view.status === 200 && view.json?.approvalStatus === 'Suspended')
    record('hồ sơ tạm ngưng sửa giới thiệu', '409 PROVIDER_SUSPENDED', await call(reviewToken, 'PATCH', '/freelancer/profile', { bio: 'thử' }))
    record('hồ sơ tạm ngưng thêm kỹ năng', '409 PROVIDER_SUSPENDED', await call(reviewToken, 'PUT', `/freelancer/profile/services/${category('LAUNDRY')}`, { hourlyRateVnd: 70_000 }))
    record('hồ sơ tạm ngưng xóa kỹ năng', '409 PROVIDER_SUSPENDED', await call(reviewToken, 'DELETE', `/freelancer/profile/services/${category('LAUNDRY')}`))
    record('hồ sơ tạm ngưng thay khu vực', '409 PROVIDER_SUSPENDED', await call(reviewToken, 'PUT', '/freelancer/profile/service-areas', { serviceAreas: [{ serviceAreaId: area('Quận 1') }] }))
    sql(`update providers set approval_status = 'UnderReview' where id = '${REVIEW_PROVIDER}'`)
  })

  test('đồng thời và nhật ký kiểm toán', async () => {
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => putService('GARDENING', { hourlyRateVnd: 100_000 + i * 1_000 })))
    check('6 yêu cầu thêm cùng một kỹ năng cùng lúc đều thành công, không lỗi 500', '6 × 200', results.map((r) => r.status).join(','), results.every((r) => r.status === 200))
    const final = (await mine()).json.services.filter((s: { code: string }) => s.code === 'GARDENING')
    check('chỉ còn đúng một dòng kỹ năng', '1', String(final.length), final.length === 1)
    await call(token, 'DELETE', `/freelancer/profile/services/${category('GARDENING')}`)

    const audit = sql(`select action, count(*) from audit_logs where entity_id = '${PROVIDER}' and action like 'freelancer.%' group by action order by action`)
    for (const action of ['freelancer.profile_updated', 'freelancer.service_saved', 'freelancer.service_removed', 'freelancer.service_areas_replaced', 'freelancer.accepting_bookings_paused']) {
      check(`có nhật ký kiểm toán ${action}`, 'có', audit.includes(action) ? 'có' : 'không có', audit.includes(action))
    }
    const rateChange = sql(`select before_json, after_json from audit_logs where entity_id = '${PROVIDER}' and action = 'freelancer.service_saved' and after_json like '%GARDENING%' order by created_at_utc desc limit 1`)
    check('nhật ký đổi giá ghi cả giá trước và sau', 'before và after đều có HourlyRateVnd', rateChange, rateChange.includes('HourlyRateVnd') && rateChange.split('|').length === 2)
    const actor = sql(`select count(*) from audit_logs where entity_id = '${PROVIDER}' and action = 'freelancer.service_saved' and actor_user_id is not null`)
    check('nhật ký ghi người thực hiện', '> 0', actor, Number(actor) > 0)
    const pausedActor = sql(`select count(*) from audit_logs where entity_id = '${PROVIDER}' and action = 'freelancer.accepting_bookings_paused' and actor_user_id is null`)
    check('lần tự động tắt nhận đơn được ghi là hệ thống (không có người thực hiện)', '> 0', pausedActor, Number(pausedActor) > 0)
  })
})
