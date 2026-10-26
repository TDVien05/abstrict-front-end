import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'

export type ApprovalStatus = 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Suspended'

export const approvalStatusLabels: Record<ApprovalStatus, string> = {
  Draft: 'Chưa nộp hồ sơ',
  Submitted: 'Đã nộp, chờ duyệt',
  UnderReview: 'Đang được xem xét',
  Approved: 'Đã được duyệt',
  Rejected: 'Bị từ chối',
  Suspended: 'Tạm ngưng',
}

// Điều kiện còn thiếu để nhận đơn, theo mã backend trả về.
export const missingForBookingsLabels: Record<string, string> = {
  NOT_APPROVED: 'Hồ sơ cần được duyệt',
  NO_ACTIVE_SERVICE: 'Cần ít nhất một kỹ năng đang bật',
  NO_SERVICE_AREA: 'Cần chọn ít nhất một khu vực nhận ca',
}

export const MIN_HOURLY_RATE_VND = 10_000
export const MAX_HOURLY_RATE_VND = 1_000_000
export const MAX_BIO_LENGTH = 1000
export const MAX_SERVICE_DESCRIPTION_LENGTH = 500
export const MAX_SERVICE_AREAS = 20

export interface MyService {
  serviceCategoryId: string
  code: string
  name: string
  hourlyRateVnd: number
  description: string | null
  isActive: boolean
  isListed: boolean
}

export interface MyServiceArea {
  serviceAreaId: string
  city: string
  district: string
  wardOrComplex: string | null
  travelRadiusKm: number | null
  isActive: boolean
}

export interface MyFreelancerProfile {
  providerId: string
  displayName: string
  approvalStatus: ApprovalStatus
  bio: string | null
  experienceYears: number
  isAcceptingBookings: boolean
  autoAcceptBookings: boolean
  canAcceptBookings: boolean
  missingForBookings: string[]
  acceptingBookingsPaused: boolean
  services: MyService[]
  serviceAreas: MyServiceArea[]
}

export interface SaveServiceInput {
  hourlyRateVnd: number
  description: string
  isActive: boolean
}

const profileKey = ['freelancer', 'profile']
const profilePath = '/freelancer/profile'

export function useMyProfile() {
  return useQuery({ queryKey: profileKey, queryFn: () => apiRequest<MyFreelancerProfile>(profilePath), retry: false })
}

// Mọi thao tác ghi trả về hồ sơ mới nhất nên đặt thẳng vào cache.
function useProfileMutation<TVariables>(request: (variables: TVariables) => Promise<MyFreelancerProfile>) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: request, onSuccess: (profile) => queryClient.setQueryData(profileKey, profile) })
}

export function useUpdateProfile() {
  return useProfileMutation((body: { bio?: string; isAcceptingBookings?: boolean; autoAcceptBookings?: boolean }) =>
    apiRequest<MyFreelancerProfile>(profilePath, { method: 'PATCH', body }))
}

export function useSaveService() {
  return useProfileMutation(({ categoryId, ...body }: SaveServiceInput & { categoryId: string }) =>
    apiRequest<MyFreelancerProfile>(`${profilePath}/services/${encodeURIComponent(categoryId)}`, { method: 'PUT', body }))
}

export function useRemoveService() {
  return useProfileMutation((categoryId: string) =>
    apiRequest<MyFreelancerProfile>(`${profilePath}/services/${encodeURIComponent(categoryId)}`, { method: 'DELETE' }))
}

export function useReplaceServiceAreas() {
  return useProfileMutation((serviceAreas: { serviceAreaId: string; travelRadiusKm: number }[]) =>
    apiRequest<MyFreelancerProfile>(`${profilePath}/service-areas`, { method: 'PUT', body: { serviceAreas } }))
}
