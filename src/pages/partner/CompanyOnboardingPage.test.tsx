// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CompanyOnboardingPage } from './CompanyOnboardingPage'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const notStarted = {
  status: 'NotStarted', currentStep: 'Company', canEdit: true, providerId: null, company: null, representative: null, serviceAreas: [],
  requiredDocumentTypes: ['BusinessRegistration', 'CitizenIdFront', 'CitizenIdBack'], documents: [], feedback: null, submittedAtUtc: null,
}

const company = { legalName: 'Công ty TNHH Sạch Nhà', displayName: 'Sạch Nhà', taxCode: '0312345678', hotline: '1900 1234', headquartersAddress: '12 Lê Lợi, Quận 1', workforceSize: 'UnderTen', liabilityCoverageVnd: null }

function renderPage(onboarding: unknown, saveResponse?: Response) {
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) =>
    init?.method === 'PUT' && saveResponse ? saveResponse : new Response(JSON.stringify(onboarding)))
  vi.stubGlobal('fetch', fetchMock)
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><CompanyOnboardingPage /></MemoryRouter></QueryClientProvider>)
  return fetchMock
}

describe('Company onboarding', () => {
  it('saves the legal entity and follows the step the server returns', async () => {
    const fetchMock = renderPage(notStarted, new Response(JSON.stringify({ ...notStarted, status: 'Draft', currentStep: 'Representative', providerId: 'p1', company })))
    fireEvent.change(await screen.findByLabelText('Tên pháp nhân theo ĐKKD'), { target: { value: company.legalName } })
    fireEvent.change(screen.getByLabelText('Tên hiển thị với khách'), { target: { value: company.displayName } })
    fireEvent.change(screen.getByLabelText('Mã số thuế'), { target: { value: company.taxCode } })
    fireEvent.change(screen.getByLabelText('Hotline'), { target: { value: company.hotline } })
    fireEvent.change(screen.getByLabelText('Địa chỉ trụ sở'), { target: { value: company.headquartersAddress } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu và tiếp tục' }))

    expect(await screen.findByLabelText(/Số CCCD \(12 chữ số\)/)).toBeTruthy()
    const [url, init] = fetchMock.mock.calls.find(([, request]) => request?.method === 'PUT') ?? []
    expect(String(url)).toContain('/company/onboarding/company')
    expect(JSON.parse(String(init?.body))).toEqual(company)
  })

  it('shows admin feedback and the rejected document, and blocks submitting until it is replaced', async () => {
    renderPage({
      ...notStarted, status: 'Draft', currentStep: 'Documents', providerId: 'p1', company,
      representative: { fullName: 'Trần Văn An', jobTitle: 'Giám đốc', workEmail: 'an@sachnha.vn', phoneNumber: '0901234567', identityNumberLast4: '1234' },
      serviceAreas: [{ id: 'a1', city: 'Hồ Chí Minh', district: 'Quận 1', wardOrComplex: null }],
      documents: [{ id: 'd1', type: 'BusinessRegistration', status: 'Rejected', originalFileName: 'dkkd.pdf', contentType: 'application/pdf', uploadedAtUtc: '2026-10-12T09:00:00+00:00', rejectionReason: 'Bản ĐKKD bị mờ.' }],
      feedback: { decision: 'ChangesRequested', reason: 'Bản ĐKKD bị mờ.', decidedAtUtc: '2026-10-12T09:05:00+00:00' },
    })
    expect(await screen.findByText(/ABSTRICT yêu cầu chỉnh sửa hồ sơ/)).toBeTruthy()
    expect(screen.getByText('Lý do từ chối: Bản ĐKKD bị mờ.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Gửi duyệt/ }))
    expect((screen.getByRole('button', { name: 'Gửi hồ sơ để duyệt' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('locks the forms while the dossier is awaiting review', async () => {
    renderPage({ ...notStarted, status: 'Submitted', currentStep: 'AwaitingReview', canEdit: false, providerId: 'p1', company, submittedAtUtc: '2026-10-12T09:00:00+00:00' })
    expect(await screen.findByText(/đang chờ ABSTRICT xét duyệt/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gửi hồ sơ để duyệt' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Thông tin pháp nhân/ }))
    expect(screen.queryByRole('button', { name: 'Lưu và tiếp tục' })).toBeNull()
    expect(screen.getByLabelText('Mã số thuế').closest('fieldset')?.disabled).toBe(true)
  })
})
