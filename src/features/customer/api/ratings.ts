import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'
import { ApiError } from '../../../shared/api/problem-details'

export interface BookingRating {
  id: string
  bookingId: string
  bookingNumber: string
  providerId: string
  providerName: string
  score: number
  comment: string | null
  createdAtUtc: string
  publishedAtUtc: string | null
}

export const ratingCommentMaxLength = 2000

const ratingKey = (bookingId: string | undefined) => ['bookings', 'detail', bookingId, 'rating']

// 404 RATING_NOT_FOUND nghĩa là chưa đánh giá, không phải lỗi: trả về null để giao diện chọn hiển thị form.
export function useMyRating(bookingId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ratingKey(bookingId),
    queryFn: async () => {
      try {
        return await apiRequest<BookingRating>(`/bookings/${encodeURIComponent(bookingId as string)}/rating`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null
        throw error
      }
    },
    enabled: Boolean(bookingId) && enabled,
    retry: false,
  })
}

export function useCreateRating(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: { score: number; comment?: string }) =>
      apiRequest<BookingRating>(`/bookings/${encodeURIComponent(bookingId)}/rating`, { method: 'POST', body: request }),
    onSuccess: (rating) => {
      queryClient.setQueryData(ratingKey(bookingId), rating)
      // `RateProvider` biến mất khỏi allowedActions và điểm trung bình của freelancer đổi.
      void queryClient.invalidateQueries({ queryKey: ['bookings', 'detail', bookingId], exact: true })
      void queryClient.invalidateQueries({ queryKey: ['freelancer', rating.providerId] })
    },
  })
}
