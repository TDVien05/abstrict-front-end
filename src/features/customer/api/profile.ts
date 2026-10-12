import { useQuery } from '@tanstack/react-query'
import { apiFetch, apiRequest } from '../../../shared/api/http-client'
import { ApiError } from '../../../shared/api/problem-details'
import type { CustomerAddress } from './addresses'

export interface CustomerAvatar {
  avatarUrl: string
  updatedAtUtc: string
}

export const avatarMaxBytes = 5 * 1024 * 1024
export const avatarAccept = 'image/jpeg,image/png'

const avatarErrorMessages: Record<string, string> = {
  VALIDATION_FAILED: 'Chưa chọn ảnh hoặc ảnh vượt quá dung lượng cho phép.',
  EMPTY_FILE: 'File ảnh rỗng. Vui lòng chọn ảnh khác.',
  AVATAR_NOT_FOUND: 'Bạn chưa có ảnh đại diện.',
  FILE_TOO_LARGE: 'Ảnh lớn hơn 5 MB. Vui lòng chọn ảnh nhỏ hơn.',
  UNSUPPORTED_IMAGE: 'Chỉ nhận ảnh JPG hoặc PNG.',
}

// Server xác định định dạng từ nội dung file; kiểm tra ở đây chỉ để báo sớm, không thay cho kiểm tra của server.
export function avatarFileProblem(file: File) {
  if (file.size === 0) return avatarErrorMessages.EMPTY_FILE
  if (file.size > avatarMaxBytes) return avatarErrorMessages.FILE_TOO_LARGE
  if (file.type && !avatarAccept.split(',').includes(file.type)) return avatarErrorMessages.UNSUPPORTED_IMAGE
  return null
}

// Ảnh đại diện cần access token nên không gắn thẳng vào <img src> được.
export function useAvatarImage(avatarUrl: string | null | undefined) {
  const { data } = useQuery({
    queryKey: ['avatar', avatarUrl],
    queryFn: async () => URL.createObjectURL(await (await apiFetch(avatarUrl as string, { headers: { Accept: 'image/*' } })).blob()),
    enabled: Boolean(avatarUrl),
    retry: false,
    staleTime: Infinity,
    gcTime: Infinity,
  })
  return avatarUrl ? data : undefined
}

export interface CustomerProfile {
  userId: string
  fullName: string
  phoneNumber: string
  avatarUrl: string | null
  createdAtUtc: string
  /** Sổ địa chỉ, mặc định đứng đầu. Thêm/sửa/xóa qua /customer/addresses. */
  addresses: CustomerAddress[]
}

// Hồ sơ mới nhất; được tải lại sau khi đổi ảnh đại diện hoặc sổ địa chỉ (cùng tiền tố khóa 'customer').
export function useCustomerProfile() {
  return useQuery({ queryKey: ['customer', 'profile'], queryFn: () => apiRequest<CustomerProfile>('/customer/profile'), retry: false })
}

export function uploadAvatar(file: File) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest<CustomerAvatar>('/customer/profile/avatar', { method: 'PUT', body })
}

export function deleteAvatar() {
  return apiRequest<void>('/customer/profile/avatar', { method: 'DELETE' })
}

export function avatarErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem.code
    if (code && code in avatarErrorMessages) return avatarErrorMessages[code]
    if (error.status === 413) return avatarErrorMessages.FILE_TOO_LARGE
    if (error.status === 429) return 'Bạn đổi ảnh quá nhiều lần. Vui lòng thử lại sau ít phút.'
    return error.message
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}
