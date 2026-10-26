import { test, expect, request as pwRequest, type APIRequestContext } from '@playwright/test'

// Trang hồ sơ công khai của freelancer (/partner/profile) trên backend thật: sửa giới thiệu, thêm/tắt/xóa kỹ năng, đổi khu vực,
// và kiểm tra khách tìm theo kỹ năng có thấy freelancer hay không. Dùng freelancer 0910000004 và khôi phục nguyên trạng ở cuối.
const API = process.env.E2E_API_URL ?? 'http://127.0.0.1:8080/api/v1'
const FREELANCER = { phone: '0910000004', password: process.env.E2E_FREELANCER_PASSWORD ?? 'Freelancer-dev-2026' }
const PROVIDER = 'dddddddd-0000-0000-0000-000000000004'
const GARDENING = { id: 'aaaaaaaa-0000-0000-0000-000000000011', code: 'GARDENING', name: 'Chăm sóc cây cảnh' }
const BIO = `Hồ sơ thử giao diện ${Date.now().toString(36)}`

let ctx: APIRequestContext
let token = ''
let original: any

async function call(method: string, path: string, data?: unknown) {
  const res = await ctx.fetch(API + path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {}, data: data as never, timeout: 30_000 })
  let json: any
  try { json = JSON.parse((await res.body()).toString('utf8')) } catch { json = undefined }
  return { status: res.status(), json }
}

const publicIds = async () => ((await call('GET', `/freelancers?serviceCode=${GARDENING.code}&pageSize=50`)).json.items as { providerId: string }[]).map((x) => x.providerId)

test.beforeAll(async () => {
  ctx = await pwRequest.newContext()
  const login = await call('POST', '/auth/login', { phoneNumber: FREELANCER.phone, password: FREELANCER.password })
  expect(login.status).toBe(200)
  token = login.json.accessToken
  original = (await call('GET', '/freelancer/profile')).json
})

test.afterAll(async () => {
  await call('DELETE', `/freelancer/profile/services/${GARDENING.id}`).catch(() => undefined)
  await call('PATCH', '/freelancer/profile', { bio: original.bio ?? '' })
  await call('PUT', '/freelancer/profile/service-areas', { serviceAreas: original.serviceAreas.map((a: any) => ({ serviceAreaId: a.serviceAreaId, travelRadiusKm: a.travelRadiusKm })) })
  await ctx.dispose()
})

test('freelancer cập nhật hồ sơ và kỹ năng bằng giao diện; khách tìm theo kỹ năng', async ({ page }) => {
  test.setTimeout(120_000)
  test.skip(original.services.some((s: any) => s.code === GARDENING.code), 'freelancer thử đã có kỹ năng GARDENING, không chạy để không làm mất dữ liệu')
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('/partners/login')
  await page.getByPlaceholder('090 123 4567').fill(FREELANCER.phone)
  await page.getByPlaceholder('••••••••').fill(FREELANCER.password)
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click()
  await expect(page).not.toHaveURL(/login/)
  await page.getByRole('link', { name: 'Hồ sơ công khai' }).first().click()
  await expect(page).toHaveURL(/\/partner\/profile$/)
  await expect(page.getByRole('heading', { name: 'Hồ sơ công khai' })).toBeVisible()

  // Giới thiệu
  await page.getByLabel('Giới thiệu bản thân').fill(BIO)
  await page.getByRole('button', { name: 'Lưu giới thiệu' }).click()
  await expect(page.getByRole('button', { name: 'Lưu giới thiệu' })).toBeDisabled()
  await page.reload()
  await expect(page.getByLabel('Giới thiệu bản thân')).toHaveValue(BIO)

  // Thêm kỹ năng
  expect(await publicIds()).not.toContain(PROVIDER)
  await page.getByRole('button', { name: 'Thêm kỹ năng' }).click()
  const form = page.getByRole('form', { name: 'Thêm kỹ năng' })
  await form.locator('select').selectOption({ label: GARDENING.name })
  await form.getByLabel(/Giá theo giờ/).fill('77000')
  await form.getByLabel('Mô tả kỹ năng').fill('Cắt tỉa và chăm sóc sân vườn')
  await page.screenshot({ path: 'test-results/profile-add-skill.png', fullPage: true })
  await form.getByRole('button', { name: 'Thêm kỹ năng' }).click()
  const card = page.getByRole('listitem').filter({ hasText: GARDENING.name })
  await expect(card).toContainText('77.000')
  await expect(card).toContainText('Đang hiện công khai')
  expect(await publicIds()).toContain(PROVIDER)

  // Sửa giá
  await card.getByRole('button', { name: 'Sửa' }).click()
  await page.getByRole('form', { name: 'Sửa kỹ năng' }).getByLabel(/Giá theo giờ/).fill('88000')
  await page.getByRole('button', { name: 'Lưu kỹ năng' }).click()
  await expect(card).toContainText('88.000')

  // Tắt kỹ năng → khách không còn tìm thấy theo kỹ năng này
  await card.getByRole('button', { name: 'Tắt' }).click()
  await expect(card).toContainText('Đã tắt')
  expect(await publicIds()).not.toContain(PROVIDER)

  // Xóa kỹ năng
  page.once('dialog', (dialog) => void dialog.accept())
  await card.getByRole('button', { name: `Xóa kỹ năng ${GARDENING.name}` }).click()
  await expect(page.getByRole('listitem').filter({ hasText: GARDENING.name })).toHaveCount(0)

  // Khu vực: đổi bán kính khu vực đầu tiên
  const first = original.serviceAreas[0]
  const label = [first.district, first.wardOrComplex].filter(Boolean).join(' – ')
  const radius = page.getByLabel(`Bán kính di chuyển ${label}`)
  await radius.fill('37')
  await page.getByRole('button', { name: 'Lưu khu vực' }).click()
  await expect(page.getByRole('button', { name: 'Lưu khu vực' })).toBeDisabled()
  const saved = (await call('GET', '/freelancer/profile')).json
  expect(saved.serviceAreas.find((a: any) => a.serviceAreaId === first.serviceAreaId).travelRadiusKm).toBe(37)
  await page.screenshot({ path: 'test-results/profile-final.png', fullPage: true })
  expect(errors).toEqual([])
})
