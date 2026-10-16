import { useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'

export interface CatalogServiceCategory {
  id: string
  code: string
  name: string
  description: string | null
  isActive: boolean
}

export interface CatalogBank {
  code: string
  name: string
}

// Danh mục dùng chung cho form đăng ký/onboarding; ít thay đổi nên cache lâu.
export function useServiceCategories() {
  return useQuery({ queryKey: ['catalog', 'service-categories'], queryFn: () => apiRequest<CatalogServiceCategory[]>('/catalog/service-categories'), staleTime: Infinity })
}

// Danh sách ngân hàng cho tính năng tài khoản nhận tiền (chưa có UI dùng ở giai đoạn này).
export function useBanks() {
  return useQuery({ queryKey: ['catalog', 'banks'], queryFn: () => apiRequest<CatalogBank[]>('/catalog/banks'), staleTime: Infinity })
}
