// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { BookingCreatePage } from './BookingCreatePage'
import { CustomerDiscoveryPage } from './CustomerDiscoveryPage'
import { CustomerProviderPage } from './CustomerProviderPage'
import { OrderDetailPage } from './OrderDetailPage'

afterEach(cleanup)

describe('customer booking screens', () => {
  it('moves from discovery to provider scheduling and booking confirmation', async () => {
    render(
      <MemoryRouter initialEntries={['/kham-pha']}>
        <Routes>
          <Route element={<CustomerDiscoveryPage />} path="/kham-pha" />
          <Route element={<CustomerProviderPage />} path="/kham-pha/:providerId" />
          <Route element={<BookingCreatePage />} path="/dat-lich/:providerId" />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getAllByRole('link', { name: 'Xem hồ sơ' })[0])
    expect(await screen.findByText('Giới thiệu & kỹ năng nghiệp vụ')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục chọn checklist/ }))
    expect(await screen.findByRole('heading', { name: 'Xác nhận đặt dịch vụ & ký quỹ' })).toBeTruthy()
    expect(screen.getByText('Checklist đã thống nhất')).toBeTruthy()
  })

  it('shows live order evidence, QR check-in and extension controls', () => {
    render(
      <MemoryRouter initialEntries={['/don-hang/HC-241028-09']}>
        <Routes><Route element={<OrderDetailPage />} path="/don-hang/:id" /></Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('img', { name: 'Mã QR check-in của ca làm' })).toBeTruthy()
    expect(screen.getByText('Nhật ký Before / After')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /\+60 phút/ }))
    fireEvent.change(screen.getByPlaceholderText('Ví dụ: Phát sinh ủi đồ...'), { target: { value: 'Phát sinh ủi đồ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu gia hạn' }))
    expect(screen.getByText('Yêu cầu gia hạn 60 phút đã sẵn sàng gửi đến API.')).toBeTruthy()
  })
})
