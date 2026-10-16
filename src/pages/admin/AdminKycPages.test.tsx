// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminKycDetailPage, AdminKycPage } from './AdminKycPages'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const providerId = 'dddddddd-0000-0000-0000-000000000001'

const detail = {
  providerId, status: 'Submitted', phoneNumber: '0910000001', legalFullName: 'Nguyễn Văn A', dateOfBirth: '1995-05-01', gender: 'Male',
  citizenIdNumber: '079195001234', permanentAddress: '12 Lê Lợi, Quận 1', currentAddress: '34 Nguyễn Huệ, Quận 1', experienceYears: 3,
  submittedAtUtc: '2026-10-12T09:00:00+00:00', feedback: null,
  documents: [{ id: 'd1', type: 'CitizenIdFront', status: 'Pending', originalFileName: 'front.jpg', uploadedAtUtc: '2026-10-12T09:00:00+00:00', rejectionReason: null }],
}

function stubAdminKyc() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes(`/admin/kyc/${providerId}/decision`) && init?.method === 'POST') return new Response(JSON.stringify({ ...detail, status: 'Draft' }))
    if (url.includes(`/admin/kyc/${providerId}`)) return new Response(JSON.stringify(detail))
    return new Response(JSON.stringify({ items: [{ providerId, legalFullName: 'Nguyễn Văn A', phoneNumber: '0910000001', status: 'Submitted', submittedAtUtc: '2026-10-12T09:00:00+00:00' }], page: 1, pageSize: 20, totalItems: 1, totalPages: 1 }))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAdmin(page: React.ReactNode, path = '/admin/kyc', routePath = '/admin/kyc') {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[path]}><Routes><Route element={page} path={routePath} /></Routes></MemoryRouter></QueryClientProvider>)
}

describe('Admin KYC review', () => {
  it('lists pending KYC dossiers with a link to the detail', async () => {
    stubAdminKyc()
    renderAdmin(<AdminKycPage />)
    expect(await screen.findByRole('link', { name: 'Nguyễn Văn A' })).toBeTruthy()
  })

  it('records a changes-requested decision with a reason', async () => {
    const fetchMock = stubAdminKyc()
    renderAdmin(<AdminKycDetailPage />, `/admin/kyc/${providerId}`, '/admin/kyc/:providerId')
    expect(await screen.findByText('079195001234')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Yêu cầu chỉnh sửa'))
    fireEvent.change(screen.getByLabelText(/Lý do/), { target: { value: 'Ảnh mặt trước bị mờ.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Ghi nhận quyết định' }))
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).includes(`/admin/kyc/${providerId}/decision`) && init?.method === 'POST')
      expect(call).toBeTruthy()
      expect(JSON.parse(String(call?.[1]?.body))).toMatchObject({ decision: 'ChangesRequested', reason: 'Ảnh mặt trước bị mờ.' })
    })
  })
})
