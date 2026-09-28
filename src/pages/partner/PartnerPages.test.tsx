// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { PartnerOrdersPage } from './PartnerOrdersPage'
import { PartnerDashboardPage } from './PartnerDashboardPage'
import { PartnerRegistrationPage } from './PartnerRegistrationPage'
import { partnerRegistrationSchema } from '../../features/partner/registration-schema'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function renderPartner(page: React.ReactNode) {
  return render(<AuthProvider><MemoryRouter>{page}</MemoryRouter></AuthProvider>)
}

describe('Partner screens', () => {
  it('filters orders by date and status, and restores the list', () => {
    renderPartner(<PartnerOrdersPage />)
    fireEvent.change(screen.getByLabelText('Ngày làm việc'), { target: { value: '2026-10-29' } })
    expect(screen.queryByText('Chị Hoàng Yến')).toBeNull()
    expect(screen.getByText('Anh Minh Trí')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Đã hoàn thành (0)' }))
    expect(screen.getByText('Không có đơn phù hợp')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }))
    expect(screen.getByText('Chị Hoàng Yến')).toBeTruthy()
    expect(screen.getByText('Anh Minh Trí')).toBeTruthy()
  })

  it('does not falsely confirm a booking when the service is unavailable', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPartner(<PartnerOrdersPage />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Xác nhận nhận ca' })[0])
    fireEvent.click(screen.getByRole('button', { name: 'Đồng ý nhận ca' }))
    expect(screen.getByRole('status').textContent).toContain('Trạng thái đơn không thay đổi')
    expect(screen.getByRole('button', { name: 'Chờ bạn xác nhận (2)' })).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('collects a rejection reason and lets the user cancel', () => {
    renderPartner(<PartnerOrdersPage />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Từ chối' })[0])
    fireEvent.change(screen.getByLabelText('Lý do từ chối'), { target: { value: 'Bận việc đột xuất' } })
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }))
    expect(screen.queryByLabelText('Lý do từ chối')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('shows the selected plan without claiming a completed payment', () => {
    renderPartner(<PartnerDashboardPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Nâng cấp gói 30 ngày' }))
    expect(within(screen.getByRole('status')).getByText(/bạn chưa bị tính phí/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng lựa chọn' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('validates empty KYC fields before attempting submission', async () => {
    renderPartner(<PartnerRegistrationPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi hồ sơ thẩm định KYC' }))
    await waitFor(() => expect(screen.getByText('Số điện thoại không hợp lệ.')).toBeTruthy())
    expect(screen.getByText('Chọn ít nhất một kỹ năng.')).toBeTruthy()
    expect(screen.getByText('Bạn cần xác nhận thông tin trước khi gửi.')).toBeTruthy()
  })
})

describe('KYC document validation', () => {
  it('rejects unsupported or oversized documents and PDFs as identity photos', () => {
    const pdf = new File(['document'], 'cccd.pdf', { type: 'application/pdf' })
    const exe = new File(['document'], 'file.exe', { type: 'application/octet-stream' })
    const huge = new File([new Uint8Array(15 * 1024 * 1024 + 1)], 'large.jpg', { type: 'image/jpeg' })
    const photo = new File(['photo'], 'photo.jpg', { type: 'image/jpeg' })
    expect(partnerRegistrationSchema.shape.front.safeParse([pdf]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.health.safeParse([exe]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.back.safeParse([huge]).success).toBe(false)
    expect(partnerRegistrationSchema.shape.front.safeParse([photo]).success).toBe(true)
    expect(partnerRegistrationSchema.shape.health.safeParse([pdf]).success).toBe(true)
  })
})
