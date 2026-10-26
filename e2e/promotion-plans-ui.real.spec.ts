import { execFileSync } from 'node:child_process'
import { test, expect, request as pwRequest, type Browser, type Page } from '@playwright/test'

// Giao diện gói hiển thị trên backend thật: admin tạo gói bằng trình nhập quyền lợi mới → freelancer thấy thẻ gói,
// mua gói có phí, thanh toán thử, thấy gói đang hiệu lực; mua gói miễn phí nối tiếp. Dữ liệu tạo ra được xóa ở cuối.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8080/api/v1'
const FREELANCER = { phone: '0910000004', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const ADMIN = { phone: process.env.E2E_ADMIN_PHONE ?? '0900000001', password: process.env.E2E_ADMIN_PASSWORD ?? '' }
const DB = process.env.E2E_DB_CONTAINER ?? 'abstrict-postgres'
const RUN = Date.now().toString(36).toUpperCase()
const CODE = `E2EUI_${RUN}`
const NAME = `Gói giao diện ${RUN}`
const pageErrors: string[] = []

const sql = (query: string) => execFileSync('docker', ['exec', DB, 'psql', '-U', 'abstrict', '-d', 'abstrict', '-v', 'ON_ERROR_STOP=1', '-At', '-c', query], { encoding: 'utf8' }).trim()

async function openAs(browser: Browser, who: { phone: string; password: string }, loginPath: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage()
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.goto(loginPath)
  await page.getByPlaceholder('090 123 4567').fill(who.phone)
  await page.getByPlaceholder('••••••••').fill(who.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/\/(partners\/)?login/)
  return page
}

test.afterAll(() => {
  const ids = sql(`select id from promotion_plans where code like '${CODE}%'`).split('\n').filter(Boolean).map((id) => `'${id}'`).join(',')
  if (!ids) return
  sql(`delete from money_movements where payment_id in (select payment_id from promotion_purchases where promotion_plan_id in (${ids}) and payment_id is not null)`)
  const payments = sql(`select payment_id from promotion_purchases where promotion_plan_id in (${ids}) and payment_id is not null`).split('\n').filter(Boolean)
  sql(`delete from promotion_purchases where promotion_plan_id in (${ids})`)
  if (payments.length) sql(`delete from payments where id in (${payments.map((id) => `'${id}'`).join(',')})`)
  sql(`delete from audit_logs where entity_type = 'PromotionPlan' and entity_id in (${ids})`)
  sql(`delete from promotion_plans where id in (${ids})`)
})

test('admin tạo gói → freelancer mua, thanh toán thử, thấy gói hiệu lực', async ({ browser }) => {
  test.setTimeout(180_000)
  await pwRequest.newContext() // đảm bảo fixture request sẵn sàng; API không dùng trực tiếp ở đây

  // Admin tạo hai gói bằng giao diện
  const admin = await openAs(browser, ADMIN, '/login')
  await admin.goto('/admin/plans')
  await admin.getByRole('button', { name: 'Tạo gói mới' }).click()
  await admin.getByLabel('Mã gói').fill(CODE)
  await admin.getByLabel('Tên gói').fill(NAME)
  await admin.getByLabel('Giá (VND)').fill('59000')
  await admin.getByLabel('Bán kính ưu tiên (km)').fill('8')
  await admin.getByLabel('Quyền lợi 1', { exact: true }).fill('Nhãn Được tài trợ')
  await admin.getByLabel('Quyền lợi 1', { exact: true }).press('Enter')
  await admin.getByLabel('Quyền lợi 2', { exact: true }).fill('Báo cáo lượt xem')
  await admin.getByRole('button', { name: 'Thêm quyền lợi' }).click()
  await admin.getByLabel('Quyền lợi 3', { exact: true }).fill('Sẽ bị xóa')
  await admin.getByRole('button', { name: 'Xóa quyền lợi 3' }).click()
  await admin.screenshot({ path: 'test-results/plans-admin-form.png' })
  await admin.getByRole('button', { name: 'Tạo gói', exact: true }).click()
  await expect(admin.getByText(NAME)).toBeVisible()
  await expect(admin.getByText('Nhãn Được tài trợ')).toBeVisible()

  await admin.getByRole('button', { name: 'Tạo gói mới' }).click()
  await admin.getByLabel('Mã gói').fill(`${CODE}_FREE`)
  await admin.getByLabel('Tên gói').fill(`${NAME} miễn phí`)
  await admin.getByLabel('Thời hạn (ngày)').fill('3')
  await admin.getByLabel('Giá (VND)').fill('0')
  await admin.getByRole('button', { name: 'Tạo gói', exact: true }).click()
  await expect(admin.getByText(`${NAME} miễn phí`)).toBeVisible()

  // Freelancer xem và mua
  const page = await openAs(browser, FREELANCER, '/partners/login')
  await page.goto('/partner/plans')
  const card = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: NAME, exact: true }) })
  await expect(card).toBeVisible()
  await expect(card.getByText('59.000')).toBeVisible()
  await expect(card.getByText('Báo cáo lượt xem')).toBeVisible()
  await expect(card.getByText('bán kính 8 km')).toBeVisible()
  await page.screenshot({ path: 'test-results/plans-partner-list.png', fullPage: true })

  await card.getByRole('button', { name: 'Mua gói' }).click()
  await card.getByRole('button', { name: 'Xác nhận mua' }).click()
  await expect(card.getByRole('group', { name: 'Thanh toán thử' })).toBeVisible()
  await page.reload() // trạng thái chờ thanh toán phải sống sót sau khi tải lại trang
  await expect(card.getByRole('group', { name: 'Thanh toán thử' })).toBeVisible()
  await card.getByRole('button', { name: 'Thanh toán thất bại' }).click()
  await expect(card.getByRole('button', { name: 'Mua gói' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Thanh toán thất bại' })).toBeVisible()

  await card.getByRole('button', { name: 'Mua gói' }).click()
  await card.getByRole('button', { name: 'Xác nhận mua' }).click()
  await card.getByRole('button', { name: 'Thanh toán thành công' }).click()
  const summary = page.getByRole('region', { name: 'Gói đang dùng' })
  await expect(summary).toContainText(`${NAME} đang hiệu lực`)

  // Gói miễn phí nối tiếp
  const free = page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: `${NAME} miễn phí`, exact: true }) })
  await free.getByRole('button', { name: 'Mua gói' }).click()
  await free.getByRole('button', { name: 'Xác nhận mua' }).click()
  await expect(free.getByRole('status')).toContainText('Đã kích hoạt')
  await expect(summary).toContainText('Tiếp theo')
  await page.screenshot({ path: 'test-results/plans-partner-bought.png', fullPage: true })

  // Admin thấy số lượt mua nên không còn nút Xóa ở gói đã bán
  await admin.reload()
  const row = admin.getByRole('row').filter({ hasText: CODE }).first()
  await expect(row.getByRole('button', { name: 'Xóa' })).toHaveCount(0)
  // Tổng quan admin có báo cáo gói với số liệu của gói vừa bán
  await admin.goto('/admin')
  const report = admin.getByRole('region', { name: 'Báo cáo gói hiển thị' })
  await expect(report.getByText('Tổng doanh thu gói')).toBeVisible()
  const planRow = report.getByRole('row').filter({ hasText: CODE }).first()
  await expect(planRow).toContainText('59.000')
  await expect(planRow.getByRole('cell').nth(2)).toHaveText('1')
  await report.scrollIntoViewIfNeeded()
  await admin.screenshot({ path: 'test-results/plans-admin-report.png', fullPage: true })
  expect(pageErrors).toEqual([])
})
