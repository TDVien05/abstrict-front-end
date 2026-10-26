// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../features/auth/AuthProvider'
import { PartnerOrderDetailPage } from './PartnerOrderDetailPage'

// jsdom không có camera hay canvas nên thay trình quét bằng bản giả lập để kiểm tra phần nối dây.
vi.mock('../../shared/ui/QrScanner', () => ({
  QrScanner: ({ onCancel, onScan }: { onCancel: () => void; onScan: (text: string) => void }) => (
    <div><button onClick={() => onScan('SCANNED-TOKEN-1234567890')} type="button">Giả lập quét được mã</button><button onClick={onCancel} type="button">Đóng camera</button></div>
  ),
}))

const task = (id: string, status: string) => ({ id, areaName: 'Bếp', description: `Việc ${id}`, sortOrder: Number(id.slice(1)), status })
const photo = (id: string, type: string) => ({ id, type, bookingTaskId: null, caption: null, takenAtUtc: '2099-01-01T01:00:00+00:00', uploadedByUserId: 'f1', contentUrl: `/api/v1/freelancer/bookings/b1/photos/${id}/content` })

const confirmed = {
  id: 'b1', bookingNumber: 'AB261022QTQ845', status: 'Confirmed', customerName: 'Khách Hàng Thử', serviceCategoryCode: 'CLEANING', serviceCategoryName: 'Dọn dẹp nhà cửa',
  startsAtUtc: '2099-01-01T01:00:00+00:00', endsAtUtc: '2099-01-01T03:00:00+00:00', baseAmountVnd: 160000, depositAmountVnd: 24000, areaLabel: 'Quận 1, Hồ Chí Minh',
  providerConfirmationDeadlineUtc: null, allowedActions: ['CheckIn'], addressSnapshot: 'A-1205, Quận 1', customerNote: null,
  tasks: [task('t1', 'Pending'), task('t2', 'Pending')], timeline: [], photos: [] as unknown[],
}
// Như server: CompleteWork chỉ xuất hiện sau khi đã có ảnh "Sau khi làm".
const working = { ...confirmed, status: 'CheckedIn', allowedActions: ['UploadPhotos'] }
const workingWithAfter = { ...working, allowedActions: ['UploadPhotos', 'CompleteWork'], photos: [photo('p1', 'Before'), photo('p2', 'After')] }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function stubApi(initial: Record<string, unknown>, respond: Record<string, (init?: RequestInit) => Response> = {}) {
  let current = initial
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    for (const [suffix, make] of Object.entries(respond)) if (url.endsWith(suffix) && method !== 'GET') return make(init)
    if (url.includes('/auth/refresh')) return json({ status: 401, code: 'SESSION_EXPIRED' }, 401)
    if (url.includes('/photos/')) return new Response(new Uint8Array([137, 80, 78, 71]), { headers: { 'Content-Type': 'image/png' } })
    if (url.endsWith('/check-in') && method === 'POST') { current = { ...working, status: 'CheckedIn' }; return json(current) }
    if (url.includes('/tasks/') && method === 'PATCH') {
      const id = url.split('/tasks/')[1]
      current = { ...current, tasks: (current.tasks as ReturnType<typeof task>[]).map((item) => item.id === id ? { ...item, status: JSON.parse(String(init?.body)).status } : item) }
      return json(current)
    }
    if (url.endsWith('/photos') && method === 'POST') {
      const type = String((init?.body as FormData).get('type'))
      current = { ...current, photos: [...(current.photos as unknown[]), photo(`p${(current.photos as unknown[]).length + 1}`, type)], allowedActions: type === 'After' ? ['UploadPhotos', 'CompleteWork'] : current.allowedActions }
      return json(current)
    }
    if (url.endsWith('/complete') && method === 'POST') { current = { ...current, status: 'PendingAcceptance', allowedActions: [] }; return json(current) }
    if (url.includes('/freelancer/bookings/b1')) return json(current)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  const calls = (suffix: string, method = 'POST') => fetchMock.mock.calls.filter(([input, init]) => String(input).includes(suffix) && (init?.method ?? 'GET') === method)
  return { calls }
}

function renderOrder() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AuthProvider>
        <MemoryRouter initialEntries={['/partner/orders/b1']}>
          <Routes><Route element={<PartnerOrderDetailPage />} path="/partner/orders/:id" /></Routes>
        </MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>,
  )
}

const png = (name = 'sau.png', size = 1000) => new File([new Uint8Array(size)], name, { type: 'image/png' })

beforeEach(() => { URL.createObjectURL = vi.fn(() => 'blob:photo') })
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

describe('freelancer check-in', () => {
  it('explains when check-in opens instead of showing the form before the window', async () => {
    stubApi({ ...confirmed, allowedActions: [] })
    renderOrder()
    expect(await screen.findByText(/Check-in mở từ 30 phút trước giờ bắt đầu/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Check-in' })).toBeNull()
  })

  it('rejects a code of the wrong length and sends a valid one', async () => {
    const api = stubApi(confirmed)
    renderOrder()
    const input = await screen.findByLabelText('Hoặc nhập mã check-in')
    const submit = screen.getByRole('button', { name: 'Check-in' }) as HTMLButtonElement
    expect(submit.disabled).toBe(true)

    fireEvent.change(input, { target: { value: 'ngan' } })
    expect((await screen.findByRole('alert')).textContent).toBe('Mã check-in dài 8 đến 128 ký tự.')
    expect(submit.disabled).toBe(true)

    fireEvent.change(input, { target: { value: '  ABCDEFGH12345678  ' } })
    fireEvent.click(submit)
    await waitFor(() => expect(api.calls('/check-in')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/check-in')[0][1]?.body))).toEqual({ token: 'ABCDEFGH12345678' })
    expect(await screen.findByRole('heading', { name: 'Hoàn tất ca' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Check-in' })).toBeNull()
    // Vừa check-in: đã hướng dẫn cần ảnh "Sau khi làm" nhưng chưa bấm hoàn tất được.
    expect((screen.getByRole('button', { name: 'Hoàn tất ca' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('checks in straight away when the QR code is scanned', async () => {
    const api = stubApi(confirmed)
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: /Quét mã QR bằng camera/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Giả lập quét được mã' }))
    await waitFor(() => expect(api.calls('/check-in')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/check-in')[0][1]?.body))).toEqual({ token: 'SCANNED-TOKEN-1234567890' })
    expect(screen.queryByRole('button', { name: 'Giả lập quét được mã' })).toBeNull()
  })

  it('shows why the code was refused and keeps the form', async () => {
    stubApi(confirmed, { '/check-in': () => json({ status: 409, code: 'CHECK_IN_TOKEN_EXPIRED' }, 409) })
    renderOrder()
    fireEvent.change(await screen.findByLabelText('Hoặc nhập mã check-in'), { target: { value: 'ABCDEFGH12345678' } })
    fireEvent.click(screen.getByRole('button', { name: 'Check-in' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Mã QR đã hết hạn')
    expect(screen.getByRole('button', { name: 'Check-in' })).toBeTruthy()
  })
})

describe('freelancer working the shift', () => {
  it('does not offer confirm or reject once the shift is under way', async () => {
    stubApi(working)
    renderOrder()
    await screen.findByRole('heading', { name: 'Công việc trong ca' })
    expect(screen.queryByRole('button', { name: 'Xác nhận nhận ca' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Từ chối' })).toBeNull()
  })

  it('updates a checklist item and shows the progress', async () => {
    const api = stubApi(working)
    renderOrder()
    expect(await screen.findByText(/Đã xong 0\/2 mục/)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Trạng thái: Bếp - Việc t1'), { target: { value: 'Completed' } })
    await waitFor(() => expect(api.calls('/tasks/t1', 'PATCH')).toHaveLength(1))
    expect(JSON.parse(String(api.calls('/tasks/t1', 'PATCH')[0][1]?.body))).toEqual({ status: 'Completed' })
    expect(await screen.findByText(/Đã xong 1\/2 mục/)).toBeTruthy()
  })

  it('keeps the checklist read-only when no work actions remain', async () => {
    stubApi({ ...working, status: 'PendingAcceptance', allowedActions: [], tasks: [task('t1', 'Completed'), task('t2', 'Pending')] })
    renderOrder()
    await screen.findByRole('heading', { name: 'Công việc trong ca' })
    expect(screen.queryByLabelText('Trạng thái: Bếp - Việc t1')).toBeNull()
    expect(screen.getByText('Đã xong')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Hoàn tất ca' })).toBeNull()
  })

  it('uploads a photo with its type, task and caption', async () => {
    const api = stubApi(working)
    renderOrder()
    await screen.findByText('Tải ảnh tiến độ')
    fireEvent.change(screen.getByLabelText('Loại ảnh'), { target: { value: 'After' } })
    fireEvent.change(screen.getByLabelText(/Gắn với mục công việc/), { target: { value: 't2' } })
    fireEvent.change(screen.getByLabelText(/Chú thích/), { target: { value: '  Bếp đã sạch  ' } })
    fireEvent.change(screen.getByLabelText(/Ảnh \(JPG hoặc PNG/), { target: { files: [png()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh lên' }))

    await waitFor(() => expect(api.calls('/photos')).toHaveLength(1))
    const body = api.calls('/photos')[0][1]?.body as FormData
    expect(body.get('type')).toBe('After')
    expect(body.get('bookingTaskId')).toBe('t2')
    expect(body.get('caption')).toBe('Bếp đã sạch')
    expect(body.get('file')).toBeInstanceOf(File)
    expect(await screen.findByAltText('Sau khi làm')).toBeTruthy()
    // Sau khi có ảnh "Sau khi làm" thì mới hoàn tất được.
    await waitFor(() => expect((screen.getByRole('button', { name: 'Hoàn tất ca' }) as HTMLButtonElement).disabled).toBe(false))
  })

  it('blocks a missing, non-image or oversized file before calling the server', async () => {
    const api = stubApi(working)
    renderOrder()
    await screen.findByText('Tải ảnh tiến độ')
    fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh lên' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Vui lòng chọn một ảnh.')

    fireEvent.change(screen.getByLabelText(/Ảnh \(JPG hoặc PNG/), { target: { files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] } })
    expect((await screen.findByRole('alert')).textContent).toBe('Chỉ nhận ảnh JPG hoặc PNG.')
    fireEvent.change(screen.getByLabelText(/Ảnh \(JPG hoặc PNG/), { target: { files: [png('to.png', 5 * 1024 * 1024 + 1)] } })
    expect((await screen.findByRole('alert')).textContent).toBe('Ảnh lớn hơn 5 MB. Vui lòng chọn ảnh nhỏ hơn.')
    expect((screen.getByRole('button', { name: 'Tải ảnh lên' }) as HTMLButtonElement).disabled).toBe(true)
    expect(api.calls('/photos')).toHaveLength(0)
  })

  it('shows the server message when a photo upload is refused', async () => {
    stubApi(working, { '/photos': () => json({ status: 415, code: 'UNSUPPORTED_IMAGE' }, 415) })
    renderOrder()
    await screen.findByText('Tải ảnh tiến độ')
    fireEvent.change(screen.getByLabelText(/Ảnh \(JPG hoặc PNG/), { target: { files: [png()] } })
    fireEvent.click(screen.getByRole('button', { name: 'Tải ảnh lên' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Chỉ nhận ảnh JPG hoặc PNG.')
  })
})

describe('finishing the shift', () => {
  it('needs an "after" photo before the shift can be completed', async () => {
    const api = stubApi({ ...working, photos: [photo('p1', 'Before')] })
    renderOrder()
    expect(await screen.findByRole('heading', { name: 'Hoàn tất ca' })).toBeTruthy()
    const complete = await screen.findByRole('button', { name: 'Hoàn tất ca' }) as HTMLButtonElement
    expect(screen.getByText(/Cần tải ít nhất một ảnh "Sau khi làm" trước khi hoàn tất ca/)).toBeTruthy()
    expect(complete.disabled).toBe(true)
    expect(api.calls('/complete')).toHaveLength(0)
  })

  it('asks for confirmation, completes the shift and removes the work controls', async () => {
    const api = stubApi(workingWithAfter)
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tất ca' }))
    expect(api.calls('/complete')).toHaveLength(0)
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tất ca' }))
    await waitFor(() => expect(api.calls('/complete')).toHaveLength(1))
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Hoàn tất ca' })).toBeNull())
    expect(screen.queryByText('Tải ảnh tiến độ')).toBeNull()
    expect(screen.getByText('Chờ nghiệm thu')).toBeTruthy()
  })

  it('reports why completion was refused', async () => {
    stubApi(workingWithAfter, { '/complete': () => json({ status: 409, code: 'AFTER_PHOTO_REQUIRED' }, 409) })
    renderOrder()
    fireEvent.click(await screen.findByRole('button', { name: 'Hoàn tất ca' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận hoàn tất ca' }))
    expect((await screen.findByRole('alert')).textContent).toContain('Cần tải ít nhất một ảnh "Sau khi làm"')
  })
})
