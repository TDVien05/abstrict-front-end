import { execFileSync } from 'node:child_process'
import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Luồng mua gói tăng hiển thị (backend/docs/PROMOTION_PLANS_API.md) trên backend thật, dùng freelancer 0910000004 (Approved)
// và 0910000006 (Submitted). Dữ liệu tạo ra (gói, lượt mua, giao dịch) được xóa ở cuối.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8080/api/v1'
const PASSWORD = process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026'
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
const CUSTOMER = { phone: '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const DB = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const RUN = Date.now().toString(36).toUpperCase()
const PROVIDER = 'dddddddd-0000-0000-0000-000000000004'

let ctx: APIRequestContext
const planIds: string[] = []

const sql = (query: string) => execFileSync('docker', ['exec', DB, 'psql', '-U', 'abstrict', '-d', 'abstrict', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()

async function call(auth: string | null, method: string, path: string, data?: unknown, headers: Record<string, string> = {}) {
  const res = await ctx.fetch(API + path, { method, headers: { ...(auth ? { Authorization: `Bearer ${auth}` } : {}), ...headers }, data: data as never, timeout: 30_000 })
  let json: any
  try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
  return { status: res.status(), json, code: json?.code as string | undefined }
}

async function login(phone: string, password: string) {
  const r = await call(null, 'POST', '/auth/login', { phoneNumber: phone, password })
  expect(r.status, `đăng nhập ${phone}`).toBe(200)
  return r.json.accessToken as string
}

test.beforeAll(async () => { ctx = await pwRequest.newContext() })
test.afterAll(async () => {
  if (planIds.length) {
    const ids = planIds.map((id) => `'${id}'`).join(',')
    sql(`delete from money_movements where payment_id in (select payment_id from promotion_purchases where promotion_plan_id in (${ids}))`)
    const payments = sql(`select payment_id from promotion_purchases where promotion_plan_id in (${ids}) and payment_id is not null`).split('\n').filter(Boolean)
    sql(`delete from promotion_purchases where promotion_plan_id in (${ids})`)
    if (payments.length) sql(`delete from payments where id in (${payments.map((id) => `'${id}'`).join(',')})`)
    const admin = await login(ADMIN.phone, ADMIN.password)
    for (const id of planIds) await call(admin, 'DELETE', `/admin/promotion-plans/${id}`)
  }
  await ctx.dispose()
})

test('mua gói có phí: chờ thanh toán → sandbox thành công → nối tiếp; gói miễn phí, thất bại, lỗi và phân quyền', async () => {
  test.setTimeout(120_000)
  const admin = await login(ADMIN.phone, ADMIN.password)
  const freelancer = await login('0910000004', PASSWORD)
  const submitted = await login('0910000006', PASSWORD)
  const customer = await login(CUSTOMER.phone, CUSTOMER.password)

  const mk = async (suffix: string, over: Record<string, unknown>) => {
    const r = await call(admin, 'POST', '/admin/promotion-plans', { code: `E2EP_${RUN}_${suffix}`, audience: 'Freelancer', name: `Gói ${suffix}`, durationDays: 7, priceVnd: 50_000, benefits: [], isActive: true, ...over })
    expect(r.status).toBe(201)
    planIds.push(r.json.id)
    return r.json.id as string
  }
  const paid7 = await mk('P7', {})
  const paid30 = await mk('P30', { durationDays: 30, priceVnd: 120_000 })
  const free = await mk('FREE', { durationDays: 3, priceVnd: 0 })
  const company = await mk('CO', { audience: 'Company', workerLimit: 3 })
  const off = await mk('OFF', { isActive: false })

  const buy = (token: string, planId: string, key: string) => call(token, 'POST', '/partner/promotion-purchases', { planId, method: 'Momo' }, { 'Idempotency-Key': key })

  // Yêu cầu hợp lệ
  expect((await call(freelancer, 'POST', '/partner/promotion-purchases', { planId: paid7 })).code).toBe('IDEMPOTENCY_KEY_REQUIRED')
  expect((await buy(freelancer, company, `${RUN}-co`)).code).toBe('PLAN_NOT_AVAILABLE')
  expect((await buy(freelancer, off, `${RUN}-off`)).code).toBe('PLAN_NOT_AVAILABLE')
  expect((await buy(freelancer, '00000000-0000-0000-0000-000000000000', `${RUN}-nf`)).code).toBe('PLAN_NOT_FOUND')
  expect((await buy(submitted, paid7, `${RUN}-sub`)).code).toBe('PROVIDER_NOT_APPROVED')
  expect((await buy(customer, paid7, `${RUN}-cus`)).status).toBe(403)

  // Mua gói có phí → chờ thanh toán; gọi lại cùng khóa / cùng gói → cùng lượt
  const p1 = await buy(freelancer, paid7, `${RUN}-a`)
  expect(p1.status).toBe(200)
  expect(p1.json).toMatchObject({ status: 'PendingPayment', priceVnd: 50_000, isCurrent: false, startsAtUtc: null })
  expect(p1.json.paymentId).toBeTruthy()
  expect((await buy(freelancer, paid7, `${RUN}-a`)).json.id).toBe(p1.json.id)
  expect((await buy(freelancer, paid7, `${RUN}-b`)).json.id).toBe(p1.json.id)
  expect((await buy(freelancer, paid30, `${RUN}-a`)).code).toBe('IDEMPOTENCY_KEY_REUSED')

  // Thất bại → PaymentFailed, rồi mua lại được
  const failed = await call(freelancer, 'POST', `/partner/promotion-purchases/${p1.json.id}/sandbox-confirm`, { succeeded: false })
  expect(failed.json.status).toBe('PaymentFailed')
  const again = await call(freelancer, 'POST', `/partner/promotion-purchases/${p1.json.id}/sandbox-confirm`, { succeeded: true })
  expect(again.json.status, 'đã chốt thì không đổi').toBe('PaymentFailed')

  const p2 = await buy(freelancer, paid7, `${RUN}-c`)
  expect(p2.json.id).not.toBe(p1.json.id)
  expect((await call(customer, 'POST', `/partner/promotion-purchases/${p2.json.id}/sandbox-confirm`, { succeeded: true })).status).toBe(403)
  expect((await call(submitted, 'POST', `/partner/promotion-purchases/${p2.json.id}/sandbox-confirm`, { succeeded: true })).code).toBe('PURCHASE_NOT_FOUND')

  // Thành công → Active 7 ngày bắt đầu ngay, có bút toán PromotionCharge
  const ok = await call(freelancer, 'POST', `/partner/promotion-purchases/${p2.json.id}/sandbox-confirm`, { succeeded: true })
  expect(ok.json).toMatchObject({ status: 'Active', isCurrent: true })
  const days = (Date.parse(ok.json.endsAtUtc) - Date.parse(ok.json.startsAtUtc)) / 86_400_000
  expect(days).toBe(7)
  expect(sql(`select count(*) from money_movements where reference = 'promotion:${p2.json.id}:charge' and amount_vnd = 50000 and type = 'PromotionCharge'`)).toBe('1')
  expect((await call(freelancer, 'POST', `/partner/promotion-purchases/${p2.json.id}/sandbox-confirm`, { succeeded: true })).json.endsAtUtc).toBe(ok.json.endsAtUtc)
  expect(sql(`select count(*) from money_movements where reference = 'promotion:${p2.json.id}:charge'`)).toBe('1')

  // Gói 30 ngày mua tiếp → nối sau gói 7 ngày (chưa current)
  const q = await buy(freelancer, paid30, `${RUN}-d`)
  const queued = await call(freelancer, 'POST', `/partner/promotion-purchases/${q.json.id}/sandbox-confirm`, { succeeded: true })
  expect(queued.json).toMatchObject({ status: 'Active', isCurrent: false, startsAtUtc: ok.json.endsAtUtc })
  expect((Date.parse(queued.json.endsAtUtc) - Date.parse(queued.json.startsAtUtc)) / 86_400_000).toBe(30)

  // Gói miễn phí: kích hoạt ngay, không có giao dịch, nối tiếp sau gói 30 ngày
  const f = await buy(freelancer, free, `${RUN}-e`)
  expect(f.json).toMatchObject({ status: 'Active', paymentId: null, startsAtUtc: queued.json.endsAtUtc })

  // Lịch sử, mới nhất trước
  const list = await call(freelancer, 'GET', '/partner/promotion-purchases')
  expect(list.status).toBe(200)
  const mine = (list.json as any[]).filter((x) => x.planCode.startsWith(`E2EP_${RUN}`))
  expect(mine.map((x) => x.status)).toEqual(['Active', 'Active', 'Active', 'PaymentFailed'])
  expect((await call(customer, 'GET', '/partner/promotion-purchases')).status).toBe(403)

  // Báo cáo admin khớp với các lượt vừa mua (7.000 + 120.000 có phí, 3 ngày miễn phí; lượt thất bại không tính doanh thu)
  const report = (await call(admin, 'GET', '/admin/promotion-plans/report')).json
  const row = (id: string) => report.plans.find((p: any) => p.planId === id)
  expect(row(paid7)).toMatchObject({ purchases: 1, activeNow: 1, revenueVnd: 50_000 })
  expect(row(paid30)).toMatchObject({ purchases: 1, activeNow: 0, revenueVnd: 120_000 })
  expect(row(free)).toMatchObject({ purchases: 1, revenueVnd: 0 })
  expect(report.daily).toHaveLength(7)
  expect(report.daily.at(-1).revenueVnd).toBeGreaterThanOrEqual(170_000)
  expect(report.totalRevenueVnd).toBeGreaterThanOrEqual(170_000)
  expect(report.paymentFailed).toBeGreaterThanOrEqual(1)
  expect((await call(freelancer, 'GET', '/admin/promotion-plans/report')).status).toBe(403)

  // Gói đã có lượt mua không xóa được
  expect((await call(admin, 'DELETE', `/admin/promotion-plans/${paid7}`)).code).toBe('PLAN_IN_USE')
  expect((await call(admin, 'GET', `/admin/promotion-plans/${paid7}`)).json.purchaseCount).toBe(2)

  // Lượt quá hạn được báo Expired (đẩy mốc kết thúc về quá khứ qua DB)
  sql(`update promotion_purchases set starts_at_utc = now() - interval '10 days', ends_at_utc = now() - interval '1 day' where id = '${p2.json.id}'`)
  const expired = ((await call(freelancer, 'GET', '/partner/promotion-purchases')).json as any[]).find((x) => x.id === p2.json.id)
  expect(expired).toMatchObject({ status: 'Expired', isCurrent: false })
  expect(PROVIDER).toBeTruthy()
})
