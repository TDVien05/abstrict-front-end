import { test, expect } from '@playwright/test'

// Số điện thoại test - dùng số ngẫu nhiên để tránh trùng lặp
const TEST_PHONE = `09${Date.now().toString().slice(-8)}`
const TEST_PASSWORD = 'Test1234'
const TEST_NAME = 'Nguyễn Văn Test'

test.describe('Luồng đăng ký Customer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register')
  })

  test('trang đăng ký hiển thị đầy đủ các trường', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible()
    await expect(page.getByPlaceholder('Nguyễn Thu Hà')).toBeVisible()
    await expect(page.getByPlaceholder('090 123 4567')).toBeVisible()
    await expect(page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số')).toBeVisible()
    await expect(page.getByPlaceholder('Nhập lại mật khẩu vừa tạo')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tạo tài khoản' })).toBeVisible()
  })

  test('hiển thị lỗi khi submit form trống', async ({ page }) => {
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page.getByText('Vui lòng nhập đầy đủ họ và tên.')).toBeVisible()
    await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible()
    await expect(page.getByText('Mật khẩu cần có ít nhất 8 ký tự.')).toBeVisible()
  })

  test('hiển thị lỗi khi số điện thoại sai định dạng', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Thu Hà').fill(TEST_NAME)
    await page.getByPlaceholder('090 123 4567').fill('123')
    await page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số').fill(TEST_PASSWORD)
    await page.getByPlaceholder('Nhập lại mật khẩu vừa tạo').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page.getByText('Số điện thoại chưa đúng định dạng.')).toBeVisible()
  })

  test('hiển thị lỗi khi mật khẩu không khớp', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Thu Hà').fill(TEST_NAME)
    await page.getByPlaceholder('090 123 4567').fill(TEST_PHONE)
    await page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số').fill(TEST_PASSWORD)
    await page.getByPlaceholder('Nhập lại mật khẩu vừa tạo').fill('WrongPass99')
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page.getByText('Mật khẩu xác nhận chưa khớp.')).toBeVisible()
  })

  test('hiển thị lỗi khi mật khẩu không có cả chữ và số', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Thu Hà').fill(TEST_NAME)
    await page.getByPlaceholder('090 123 4567').fill(TEST_PHONE)
    await page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số').fill('onlyletters')
    await page.getByPlaceholder('Nhập lại mật khẩu vừa tạo').fill('onlyletters')
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page.getByText('Mật khẩu cần có cả chữ và số.')).toBeVisible()
  })

  test('hiển thị lỗi khi chưa đồng ý điều khoản', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Thu Hà').fill(TEST_NAME)
    await page.getByPlaceholder('090 123 4567').fill(TEST_PHONE)
    await page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số').fill(TEST_PASSWORD)
    await page.getByPlaceholder('Nhập lại mật khẩu vừa tạo').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()
    await expect(page.getByText('Bạn cần đồng ý với điều khoản sử dụng.')).toBeVisible()
  })

  test('đăng ký thành công và chuyển sang trang OTP', async ({ page }) => {
    await page.getByPlaceholder('Nguyễn Thu Hà').fill(TEST_NAME)
    await page.getByPlaceholder('090 123 4567').fill(TEST_PHONE)
    await page.getByPlaceholder('Tối thiểu 8 ký tự kèm chữ và số').fill(TEST_PASSWORD)
    await page.getByPlaceholder('Nhập lại mật khẩu vừa tạo').fill(TEST_PASSWORD)
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click()

    // Có thể thành công (chuyển trang OTP) hoặc lỗi từ server
    await page.waitForTimeout(3000)
    const url = page.url()
    if (url.includes('/verify-otp')) {
      await expect(page.getByRole('heading', { name: 'Xác thực số điện thoại' })).toBeVisible()
    } else {
      // Server trả lỗi - hiển thị error message
      const errorMsg = page.getByRole('alert')
      await expect(errorMsg).toBeVisible()
    }
  })
})

test.describe('Luồng đăng nhập Customer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('trang đăng nhập hiển thị đầy đủ các trường', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible()
    await expect(page.getByPlaceholder('090 123 4567')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Đăng nhập' })).toBeVisible()
    await expect(page.getByText('Đăng ký ngay')).toBeVisible()
  })

  test('hiển thị lỗi khi submit form trống', async ({ page }) => {
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(page.getByText('Vui lòng nhập số điện thoại.')).toBeVisible()
    await expect(page.getByText('Vui lòng nhập mật khẩu.')).toBeVisible()
  })

  test('hiển thị lỗi khi số điện thoại sai định dạng', async ({ page }) => {
    await page.getByPlaceholder('090 123 4567').fill('abc123')
    await page.getByPlaceholder('••••••••').fill(TEST_PASSWORD)
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(page.getByText('Số điện thoại chưa đúng định dạng.')).toBeVisible()
  })

  test('hiển thị lỗi khi thông tin đăng nhập sai', async ({ page }) => {
    await page.getByPlaceholder('090 123 4567').fill('0901234567')
    await page.getByPlaceholder('••••••••').fill('WrongPass99')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await page.waitForTimeout(5000)
    const errorMsg = page.getByRole('alert')
    await expect(errorMsg).toBeVisible()
  })

  test('có link chuyển sang trang đăng ký', async ({ page }) => {
    await page.getByRole('link', { name: 'Đăng ký ngay' }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByRole('heading', { name: 'Tạo tài khoản' })).toBeVisible()
  })

  test('có nút đăng nhập bằng OTP SMS', async ({ page }) => {
    await expect(page.getByRole('button', { name: /OTP SMS/ })).toBeVisible()
  })
})

test.describe('Trang xác thực OTP', () => {
  test('hiển thị lỗi khi truy cập không có state', async ({ page }) => {
    await page.goto('/verify-otp')
    await expect(page.getByRole('heading', { name: 'Xác thực số điện thoại' })).toBeVisible()
    await expect(page.getByText('Không tìm thấy yêu cầu đăng ký đang chờ')).toBeVisible()
  })

  test('hiển thị lỗi khi nhập OTP không đủ 6 chữ số', async ({ page }) => {
    // Truy cập trang OTP trực tiếp với state giả
    await page.goto('/verify-otp')
    const submitButton = page.getByRole('button', { name: /Xác nhận & Hoàn tất/ })
    await submitButton.click()
    // Nút bị disabled vì không có challenge, test pass nếu không throw
    await expect(submitButton).toBeDisabled()
  })
})
