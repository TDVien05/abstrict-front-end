import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Admin tạo gói → freelancer/doanh nghiệp thấy gói đúng đối tượng (backend/docs/PROMOTION_PLANS_API.md), kiểm chứng trên backend thật.
// Tài khoản doanh nghiệp dev chưa có mật khẩu đã biết nên nhánh Company chỉ kiểm chứng qua quyền admin + việc freelancer không thấy gói Company.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8080/api/v1'
const PASSWORD = process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026'
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const RUN = Date.now().toString(36).toUpperCase()

let ctx: APIRequestContext
const created: string[] = []

async function call(auth: string | null, method: string, path: string, data?: unknown) {
  const res = await ctx.fetch(API + path, { method, headers: auth ? { Authorization: `Bearer ${auth}` } : {}, data: data as never, timeout: 30_000 })
  let json: any
  try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
  return { status: res.status(), json, code: json?.code as string | undefined }
}

async function login(phone: string, password: string) {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: phone, password })
  expect(r.status, `đăng nhập ${phone}`).toBe(200)
  return r.json.accessToken as string
}

const body = (over: Record<string, unknown> = {}) => ({
  code: `E2E_${RUN}_F7`, audience: 'Freelancer', name: `Gói E2E ${RUN}`, durationDays: 7, priceVnd: 55_000, priorityRadiusKm: 12,
  benefits: ['  Quyền lợi A ', '', 'Quyền lợi B'], isActive: true, ...over,
})

test.beforeAll(async () => { ctx = await pwRequest.newContext() })
test.afterAll(async () => {
  const admin = await login(ADMIN.phone, ADMIN.password)
  for (const id of created) await call(admin, 'DELETE', `/admin/promotion-plans/${id}`)
  await ctx.dispose()
})

test('admin tạo gói, freelancer thấy, gói Company/đã tắt bị ẩn, quyền & lỗi đúng mã', async () => {
  test.setTimeout(120_000)
  const admin = await login(ADMIN.phone, ADMIN.password)
  const freelancer = await login('0910000004', PASSWORD)
  const customer = await login(CUSTOMER.phone, CUSTOMER.password)

  // Tạo gói Freelancer
  const c1 = await call(admin, 'POST', '/admin/promotion-plans', body())
  expect(c1.status).toBe(201)
  created.push(c1.json.id)
  expect(c1.json).toMatchObject({ code: `E2E_${RUN}_F7`, audience: 'Freelancer', priceVnd: 55_000, benefits: ['Quyền lợi A', 'Quyền lợi B'], isActive: true, purchaseCount: 0 })

  // Mã trùng, mã sai, giá sai, giới hạn người làm sai đối tượng
  expect((await call(admin, 'POST', '/admin/promotion-plans', body({ code: `e2e_${RUN}_f7`.toLowerCase() }))).code).toBe('PLAN_CODE_TAKEN')
  expect((await call(admin, 'POST', '/admin/promotion-plans', body({ code: 'bad code!' }))).code).toBe('INVALID_PLAN_CODE')
  expect((await call(admin, 'POST', '/admin/promotion-plans', body({ code: `E2E_${RUN}_X`, priceVnd: -1 }))).code).toBe('INVALID_PLAN_PRICE')
  expect((await call(admin, 'POST', '/admin/promotion-plans', body({ code: `E2E_${RUN}_Y`, workerLimit: 5 }))).code).toBe('WORKER_LIMIT_NOT_ALLOWED')

  // Gói Company
  const c2 = await call(admin, 'POST', '/admin/promotion-plans', body({ code: `E2E_${RUN}_C30`, audience: 'Company', durationDays: 30, priceVnd: 399_000, workerLimit: 10 }))
  expect(c2.status).toBe(201)
  created.push(c2.json.id)
  expect(c2.json.workerLimit).toBe(10)

  // Freelancer thấy gói Freelancer, không thấy gói Company
  const seen = await call(freelancer, 'GET', '/partner/promotion-plans')
  expect(seen.status).toBe(200)
  const codes = (seen.json as any[]).map((p) => p.code)
  expect(codes).toContain(`E2E_${RUN}_F7`)
  expect(codes).not.toContain(`E2E_${RUN}_C30`)
  expect((seen.json as any[]).every((p) => p.audience === 'Freelancer')).toBe(true)
  expect(seen.json[0]).not.toHaveProperty('purchaseCount')

  // Tắt gói → freelancer không thấy nữa, admin vẫn thấy
  const off = await call(admin, 'PUT', `/admin/promotion-plans/${c1.json.id}`, { name: c1.json.name, durationDays: 7, priceVnd: 55_000, benefits: [], isActive: false })
  expect(off.status).toBe(200)
  expect(off.json.isActive).toBe(false)
  expect(((await call(freelancer, 'GET', '/partner/promotion-plans')).json as any[]).map((p) => p.code)).not.toContain(`E2E_${RUN}_F7`)
  const adminList = await call(admin, 'GET', `/admin/promotion-plans?audience=Company&isActive=true`)
  expect((adminList.json as any[]).map((p) => p.code)).toContain(`E2E_${RUN}_C30`)

  // Quyền truy cập
  expect((await call(freelancer, 'GET', '/admin/promotion-plans')).status).toBe(403)
  expect((await call(freelancer, 'POST', '/admin/promotion-plans', body())).status).toBe(403)
  expect((await call(customer, 'GET', '/partner/promotion-plans')).status).toBe(403)
  expect((await call(null, 'GET', '/partner/promotion-plans')).status).toBe(401)

  // Xóa gói chưa có lượt mua; xóa lại → 404
  expect((await call(admin, 'DELETE', `/admin/promotion-plans/${c2.json.id}`)).status).toBe(204)
  expect((await call(admin, 'GET', `/admin/promotion-plans/${c2.json.id}`)).code).toBe('PLAN_NOT_FOUND')
})
