import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PagedResponse } from '../../../entities/booking'
import { apiRequest } from '../../../shared/api/http-client'
import type { Dispute, DisputeStatus } from '../../customer/api/disputes'

const disputesKey = ['admin', 'disputes']
const disputePath = (disputeId: string) => `/admin/disputes/${encodeURIComponent(disputeId)}`

// Bỏ trống status = tất cả, mới nhất trước.
export function useAdminDisputes(filters: { status?: DisputeStatus; page: number; pageSize: number }) {
  return useQuery({
    queryKey: [...disputesKey, 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value))
      }
      return apiRequest<PagedResponse<Dispute>>(`/admin/disputes?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useAdminDispute(disputeId: string | undefined) {
  return useQuery({
    queryKey: [...disputesKey, 'detail', disputeId],
    queryFn: () => apiRequest<Dispute>(disputePath(disputeId as string)),
    enabled: Boolean(disputeId),
    retry: false,
  })
}

export function useSendAdminDisputeMessage(disputeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ body, internalNote }: { body: string; internalNote: boolean }) =>
      apiRequest<Dispute>(`${disputePath(disputeId)}/messages${internalNote ? '?internalNote=true' : ''}`, { method: 'POST', body: { body } }),
    onSuccess: (dispute) => queryClient.setQueryData([...disputesKey, 'detail', disputeId], dispute),
  })
}

export interface DisputeDecisionRequest {
  outcomeCode: string
  reason: string
  refundAmountVnd?: number
  providerAmountVnd?: number
}

export function useDecideDispute(disputeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: DisputeDecisionRequest) => apiRequest<Dispute>(`${disputePath(disputeId)}/decision`, { method: 'POST', body: request }),
    onSuccess: (dispute) => {
      queryClient.setQueryData([...disputesKey, 'detail', disputeId], dispute)
      void queryClient.invalidateQueries({ queryKey: [...disputesKey, 'list'] })
    },
  })
}
