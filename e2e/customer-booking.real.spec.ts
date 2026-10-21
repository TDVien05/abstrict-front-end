import { test, expect, type Page } from '@playwright/test'

// Tài khoản dev từ backend/scripts/seed-fake-freelancers.ps1 và seed-booking-fixtures.ps1
const CUSTOMER = { phone: process.env.E2E_CUSTOMER_PHONE ?? '0920000001', password: process.env.E2E_CUSTOMER_PASSWORD ?? 'Customer-dev-2026' }
const FREELANCER = { phone: process.env.E2E_FREELANCER_PHONE ?? '0910000001', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const PROVIDER_ID = 'dddddddd-0000-0000-0000-000000000001'

const apiCalls: string[] = []
const pageErrors: string[] = []
let orderId = ''

function track(page: Page) {
  page.on('pageerror', (e) => pageErrors.push(e.message))
  page.on('response', (r) => {
    const url = new URL(r.url())
    if (url.pathname.startsWith('/api/v1/') && r.request().method() !== 'GET' || (url.pathname.startsWith('/api/v1/') && r.status() >= 400)) {
      apiCalls.push(`${r.status()} ${r.request().method()} ${url.pathname}`)
    }
  })
}

async function login(page: Page, path: string, who: { phone: string; password: string }) {
  await page.goto(path)
  await page.getByPlaceholder('090 123 4567').fill(who.phone)
  await page.getByPlaceholder('••••••••').fill(who.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
}

test.describe.configure({ mode: 'serial' })

test.describe('Booking Customer → Freelancer xác nhận (backend thật)', () => {
  test.afterAll(() => {
    console.log('API_CALLS:\n' + [...new Set(apiCalls)].join('\n'))
    console.log('PAGE_ERRORS:', JSON.stringify([...new Set(pageErrors)]))
    console.log('ORDER_ID:', orderId)
  })

  test('customer đăng nhập và đặt lịch', async ({ page }) => {
    track(page)
    await login(page, '/login', CUSTOMER)
    await expect(page).toHaveURL(/\/discover/)

    await page.goto(`/book/${PROVIDER_ID}`)
    await expect(page.getByRole('heading', { name: 'Chọn dịch vụ & thời gian' })).toBeVisible()
    await page.getByRole('button', { name: /Dọn dẹp nhà cửa/ }).first().click()

    // Chọn ngày cuối trong lịch rảnh để tránh START_TOO_SOON và đụng đơn của lần chạy trước.
    const days = page.getByRole('group', { name: 'Ngày làm' }).getByRole('button')
    await expect(days.first()).toBeVisible()
    await days.last().click()
    await expect(page.getByRole('group', { name: 'Giờ bắt đầu' }).getByRole('button').first()).toBeVisible()
    await expect(page.getByText('Tạm tính')).toBeVisible()

    await page.getByRole('button', { name: /Tiếp tục/ }).click()
    await expect(page.getByRole('heading', { name: 'Xác nhận & đặt cọc' })).toBeVisible()
    await expect(page.getByText('Vinhomes Golden River')).toBeVisible()
    await expect(page.getByText(/Đặt cọc ngay \(\d+%\)/)).toBeVisible({ timeout: 15_000 })

    await page.getByPlaceholder('Thú cưng, lưu ý khi đến...').fill('E2E test booking')
    await page.getByRole('button', { name: 'Đặt lịch & giữ chỗ' }).click()
    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]{36}$/, { timeout: 15_000 })
    orderId = page.url().split('/').pop()!
    await expect(page.getByText('Chờ đặt cọc', { exact: true })).toBeVisible()
  })

  test('customer đặt cọc → chờ đối tác xác nhận', async ({ page }) => {
    track(page)
    await login(page, '/login', CUSTOMER)
    await expect(page).toHaveURL(/\/discover/)
    await page.goto(`/orders/${orderId}`)

    await page.getByRole('button', { name: 'Thanh toán cọc' }).click()
    await expect(page.getByText('Cổng thanh toán giả lập')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Giả lập thành công' }).click()
    await expect(page.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Đã nhận cọc\. Đối tác cần xác nhận trước/)).toBeVisible()
  })

  test('freelancer xác nhận nhận ca', async ({ page }) => {
    track(page)
    await login(page, '/partners/login', FREELANCER)
    await expect(page).not.toHaveURL(/\/partners\/login/)

    await page.goto(`/partner/orders/${orderId}`)
    await expect(page.getByRole('heading', { name: 'Xử lý đơn hàng' })).toBeVisible()
    await expect(page.getByText('Chờ đối tác xác nhận', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Xác nhận nhận ca' }).click()
    await page.getByRole('button', { name: 'Đồng ý nhận ca' }).click()
    await expect(page.getByText('Đã xác nhận', { exact: true })).toBeVisible({ timeout: 15_000 })
  })

  test('customer thấy đơn đã được xác nhận', async ({ page }) => {
    track(page)
    await login(page, '/login', CUSTOMER)
    await expect(page).toHaveURL(/\/discover/)
    await page.goto(`/orders/${orderId}`)
    await expect(page.getByText('Đã xác nhận', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Đối tác xác nhận', { exact: true })).toBeVisible()
  })
})
