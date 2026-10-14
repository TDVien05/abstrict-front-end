import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'

export interface SaveCustomerAddressRequest {
  label: string
  apartmentNumber: string
  floor: string | null
  buildingName: string
  streetAddress: string
  ward: string
  district: string
  city: string
  accessInstructions: string | null
  isDefault: boolean
}

export interface CustomerAddress extends SaveCustomerAddressRequest {
  id: string
}

export interface CatalogServiceArea {
  id: string
  city: string
  district: string
  wardOrComplex: string | null
  isActive: boolean
}

// Hồ sơ khách hàng cũng chứa sổ địa chỉ, nên mọi thay đổi làm mới cả nhóm khóa 'customer'.
export interface AdministrativeDivision {
  code: number
  name: string
  /** `isServed` = nền tảng đang có dịch vụ ở quận/huyện đó; nơi chưa phục vụ vẫn lưu được địa chỉ nhưng chưa đặt lịch được. */
  districts: { code: number; name: string; isServed: boolean }[]
}

export interface AdministrativeWard {
  code: string
  name: string
}

const customerKey = ['customer']
const addressesKey = [...customerKey, 'addresses']

export function formatAddress(address: CustomerAddress) {
  return [address.apartmentNumber, address.buildingName, address.streetAddress, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

export function useCustomerAddresses() {
  return useQuery({ queryKey: addressesKey, queryFn: () => apiRequest<CustomerAddress[]>('/customer/addresses') })
}

export function useServiceAreas(enabled = true) {
  return useQuery({ queryKey: ['catalog', 'service-areas'], queryFn: () => apiRequest<CatalogServiceArea[]>('/catalog/service-areas'), enabled, staleTime: Infinity })
}

// Toàn bộ tỉnh/thành và quận/huyện cho form địa chỉ; `name` được gửi nguyên làm city/district.
export function useAdministrativeDivisions() {
  return useQuery({ queryKey: ['catalog', 'administrative-divisions'], queryFn: () => apiRequest<AdministrativeDivision[]>('/catalog/administrative-divisions'), retry: false, staleTime: Infinity })
}

// Phường/xã của một quận/huyện. Mã quận/huyện chỉ duy nhất trong một tỉnh nên luôn truyền cả hai mã.
// Server trả [] khi chưa tải được dữ liệu; khi đó (hoặc khi lỗi) form cho nhập tay.
export function useAdministrativeWards(provinceCode?: number, districtCode?: number) {
  return useQuery({
    queryKey: ['catalog', 'wards', provinceCode, districtCode],
    queryFn: () => apiRequest<AdministrativeWard[]>(`/catalog/administrative-divisions/provinces/${provinceCode}/districts/${districtCode}/wards`),
    enabled: provinceCode !== undefined && districtCode !== undefined,
    retry: false,
    staleTime: Infinity,
  })
}

export function useSaveCustomerAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...request }: SaveCustomerAddressRequest & { id?: string }) =>
      id
        ? apiRequest<CustomerAddress>(`/customer/addresses/${encodeURIComponent(id)}`, { method: 'PUT', body: request })
        : apiRequest<CustomerAddress>('/customer/addresses', { method: 'POST', body: request }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKey }),
  })
}

export function useDeleteCustomerAddress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/customer/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKey }),
  })
}
