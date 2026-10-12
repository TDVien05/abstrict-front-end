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
const customerKey = ['customer']
const addressesKey = [...customerKey, 'addresses']

export function formatAddress(address: CustomerAddress) {
  return [address.apartmentNumber, address.buildingName, address.streetAddress, address.ward, address.district, address.city].filter(Boolean).join(', ')
}

export function useCustomerAddresses() {
  return useQuery({ queryKey: addressesKey, queryFn: () => apiRequest<CustomerAddress[]>('/customer/addresses') })
}

export function useServiceAreas() {
  return useQuery({ queryKey: ['catalog', 'service-areas'], queryFn: () => apiRequest<CatalogServiceArea[]>('/catalog/service-areas'), staleTime: Infinity })
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
