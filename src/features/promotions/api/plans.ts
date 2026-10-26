import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'

export type PlanAudience = 'Freelancer' | 'Company'

export const planAudienceLabels: Record<PlanAudience, string> = {
  Freelancer: 'Freelancer',
  Company: 'Doanh nghiệp',
}

export interface PartnerPlan {
  id: string
  code: string
  name: string
  audience: PlanAudience
  durationDays: number
  priceVnd: number
  priorityRadiusKm: number | null
  workerLimit: number | null
  benefits: string[]
}

export interface AdminPlan extends PartnerPlan {
  isActive: boolean
  purchaseCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export interface PlanInput {
  name: string
  durationDays: number
  priceVnd: number
  priorityRadiusKm: number | null
  workerLimit: number | null
  benefits: string[]
  isActive: boolean
}

export interface CreatePlanInput extends PlanInput {
  code: string
  audience: PlanAudience
}

const adminKey = ['admin', 'promotion-plans']
const partnerKey = ['partner', 'promotion-plans']
const adminPath = (planId: string) => `/admin/promotion-plans/${encodeURIComponent(planId)}`

export function useAdminPlans(audience?: PlanAudience) {
  return useQuery({
    queryKey: [...adminKey, audience ?? 'all'],
    queryFn: () => apiRequest<AdminPlan[]>(`/admin/promotion-plans${audience ? `?audience=${audience}` : ''}`),
  })
}

export function useCreatePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePlanInput) => apiRequest<AdminPlan>('/admin/promotion-plans', { method: 'POST', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKey })
      void queryClient.invalidateQueries({ queryKey: partnerKey })
    },
  })
}

export function useUpdatePlan(planId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: PlanInput) => apiRequest<AdminPlan>(adminPath(planId), { method: 'PUT', body: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKey })
      void queryClient.invalidateQueries({ queryKey: partnerKey })
    },
  })
}

export function useDeletePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (planId: string) => apiRequest<void>(adminPath(planId), { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKey })
      void queryClient.invalidateQueries({ queryKey: partnerKey })
    },
  })
}

// Gói đang bán cho đúng đối tượng của đối tác đang đăng nhập (server tự suy ra từ vai trò).
export function usePartnerPlans() {
  return useQuery({
    queryKey: partnerKey,
    queryFn: () => apiRequest<PartnerPlan[]>('/partner/promotion-plans'),
  })
}

export type PurchaseStatus = 'PendingPayment' | 'Active' | 'Expired' | 'Cancelled' | 'PaymentFailed'
export type PlanPaymentMethod = 'Momo' | 'VietQr' | 'ZaloPay' | 'Card'

export const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  PendingPayment: 'Chờ thanh toán',
  Active: 'Đang hiệu lực',
  Expired: 'Đã hết hạn',
  Cancelled: 'Đã hủy',
  PaymentFailed: 'Thanh toán thất bại',
}

export const planPaymentMethodLabels: Record<PlanPaymentMethod, string> = {
  Momo: 'MoMo',
  VietQr: 'VietQR',
  ZaloPay: 'ZaloPay',
  Card: 'Thẻ ngân hàng',
}

export interface PlanPurchase {
  id: string
  planId: string
  planCode: string
  planName: string
  durationDays: number
  priceVnd: number
  status: PurchaseStatus
  isCurrent: boolean
  startsAtUtc: string | null
  endsAtUtc: string | null
  paymentId: string | null
  paymentMethod: string | null
  createdAtUtc: string
}

const purchasesKey = ['partner', 'promotion-purchases']

export function usePlanPurchases() {
  return useQuery({
    queryKey: purchasesKey,
    queryFn: () => apiRequest<PlanPurchase[]>('/partner/promotion-purchases'),
  })
}

// Mỗi lần mở form mua dùng một Idempotency-Key; bấm lặp lại trong cùng lần mở trả về cùng lượt mua.
export function usePurchasePlan() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ planId, method, idempotencyKey }: { planId: string; method: PlanPaymentMethod; idempotencyKey: string }) =>
      apiRequest<PlanPurchase>('/partner/promotion-purchases', { method: 'POST', body: { planId, method }, headers: { 'Idempotency-Key': idempotencyKey } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: purchasesKey }),
  })
}

export function useConfirmSandboxPurchase() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ purchaseId, succeeded }: { purchaseId: string; succeeded: boolean }) =>
      apiRequest<PlanPurchase>(`/partner/promotion-purchases/${encodeURIComponent(purchaseId)}/sandbox-confirm`, { method: 'POST', body: { succeeded } }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: purchasesKey }),
  })
}

export interface PlanReport {
  generatedAtUtc: string
  activePlanCount: number
  inactivePlanCount: number
  paidPurchases: number
  activeNow: number
  pendingPayment: number
  paymentFailed: number
  totalRevenueVnd: number
  last7DaysRevenueVnd: number
  daily: { date: string; purchases: number; revenueVnd: number }[]
  audiences: { audience: PlanAudience; purchases: number; revenueVnd: number }[]
  plans: { planId: string; code: string; name: string; audience: PlanAudience; isActive: boolean; purchases: number; activeNow: number; revenueVnd: number }[]
}

export function useAdminPlanReport() {
  return useQuery({ queryKey: [...adminKey, 'report'], queryFn: () => apiRequest<PlanReport>('/admin/promotion-plans/report'), retry: false })
}
