import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './http-client'

export const imageMaxBytes = 5 * 1024 * 1024
export const imageAccept = 'image/jpeg,image/png'

// Server xác định định dạng từ nội dung tệp; kiểm tra ở đây chỉ để báo sớm, không thay cho kiểm tra của server.
export function imageFileProblem(file: File) {
  if (file.size === 0) return 'Tệp ảnh đang trống. Vui lòng chọn ảnh khác.'
  if (file.size > imageMaxBytes) return 'Ảnh lớn hơn 5 MB. Vui lòng chọn ảnh nhỏ hơn.'
  if (file.type && !imageAccept.split(',').includes(file.type)) return 'Chỉ nhận ảnh JPG hoặc PNG.'
  return null
}

// Ảnh tiến độ và bằng chứng chỉ phát qua endpoint có phân quyền nên không gắn thẳng vào <img src> được.
// `contentUrl` là đường dẫn tuyệt đối do server trả (đã gồm /api/v1).
export function useProtectedImageUrl(contentUrl: string | null | undefined) {
  return useQuery({
    queryKey: ['protected-image', contentUrl],
    queryFn: async () => URL.createObjectURL(await (await apiFetch(contentUrl as string, { headers: { Accept: 'image/*' } })).blob()),
    enabled: Boolean(contentUrl),
    retry: false,
    staleTime: Infinity,
  })
}
