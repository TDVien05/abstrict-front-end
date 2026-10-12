import { ApiError, type ApiProblemDetails } from './problem-details'
import { getAccessToken } from './access-token'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
}

// Access token sống ngắn; khi gặp 401, handler này dùng cookie refresh để lấy token mới rồi request được gửi lại một lần.
let renewSession: (() => Promise<boolean>) | null = null

export function setSessionRenewer(renewer: (() => Promise<boolean>) | null) {
  renewSession = renewer
}

function send(url: string, options: RequestOptions) {
  const headers = new Headers(options.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  const accessToken = getAccessToken()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const body = options.body as BodyInit | undefined
  const isFormData = body instanceof FormData
  if (body !== undefined && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  return fetch(url, {
    ...options,
    credentials: 'include',
    headers,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  })
}

export async function apiFetch(url: string, options: RequestOptions = {}): Promise<Response> {
  let response = await send(url, options)
  if (response.status === 401 && renewSession && !url.includes('/auth/') && (await renewSession())) {
    response = await send(url, options)
  }

  if (!response.ok) {
    const problem = await readProblemDetails(response)
    throw new ApiError(response.status, problem)
  }

  return response
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await apiFetch(`${API_BASE_URL}${path}`, options)

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export async function apiBlob(path: string): Promise<Blob> {
  return (await apiFetch(`${API_BASE_URL}${path}`, { headers: { Accept: '*/*' } })).blob()
}

async function readProblemDetails(response: Response): Promise<ApiProblemDetails> {
  try {
    return (await response.json()) as ApiProblemDetails
  } catch {
    return { status: response.status, title: response.statusText }
  }
}
