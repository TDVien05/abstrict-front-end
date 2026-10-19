import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../../shared/api/http-client'

export interface FreelancerSummary {
  providerId: string
  displayName: string
  bio: string | null
  averageRating: number
  ratingCount: number
  completedBookingCount: number
  experienceYears: number
  isAcceptingBookings: boolean
  minHourlyRateVnd: number | null
  serviceCodes: string[]
}

export interface FreelancerListResponse {
  items: FreelancerSummary[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

export interface FreelancerService {
  serviceCategoryId: string
  code: string
  name: string
  hourlyRateVnd: number
  description: string | null
}

export interface FreelancerServiceArea {
  id: string
  city: string
  district: string
  wardOrComplex: string | null
  travelRadiusKm: number
}

export interface FreelancerDetail {
  providerId: string
  displayName: string
  bio: string | null
  gender: string | null
  averageRating: number
  ratingCount: number
  completedBookingCount: number
  experienceYears: number
  isAcceptingBookings: boolean
  services: FreelancerService[]
  serviceAreas: FreelancerServiceArea[]
}

export interface FreelancerFilters {
  service?: string
  serviceCode?: string
  city?: string
  district?: string
  minRating?: number
  acceptingBookings?: boolean
  page?: number
  pageSize?: number
}

export const serviceLabels: Record<string, string> = {
  CLEANING: 'Dọn dẹp nhà cửa',
  DEEP_CLEANING: 'Tổng vệ sinh',
  COOKING: 'Nấu ăn gia đình',
  LAUNDRY: 'Giặt ủi',
  CHILDCARE: 'Trông trẻ',
  ELDERLY_CARE: 'Chăm sóc người cao tuổi',
  AC_SERVICE: 'Vệ sinh điều hòa',
  ELECTRICAL: 'Sửa điện',
  PLUMBING: 'Sửa ống nước',
  MOVING: 'Chuyển nhà',
  GARDENING: 'Làm vườn',
  PEST_CONTROL: 'Diệt côn trùng',
}

export function serviceLabel(code: string) {
  return serviceLabels[code] ?? code
}

export function initialsOf(name: string) {
  return name.split(' ').filter(Boolean).slice(-2).map((word) => word[0]).join('').toUpperCase()
}

export function listFreelancers(filters: FreelancerFilters = {}) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '') params.set(key, String(value))
  }
  const query = params.toString()
  return apiRequest<FreelancerListResponse>(`/freelancers${query ? `?${query}` : ''}`)
}

export function getFreelancer(providerId: string) {
  return apiRequest<FreelancerDetail>(`/freelancers/${encodeURIComponent(providerId)}`)
}

export function useFreelancers(filters: FreelancerFilters) {
  return useQuery({ queryKey: ['freelancers', filters], queryFn: () => listFreelancers(filters), placeholderData: keepPreviousData })
}

export function useFreelancer(providerId: string | undefined) {
  return useQuery({
    queryKey: ['freelancer', providerId],
    queryFn: () => getFreelancer(providerId as string),
    enabled: Boolean(providerId),
    retry: false,
  })
}

export interface FreelancerRating {
  id: string
  bookingId: string
  bookingNumber: string
  score: number
  comment: string | null
  publishedAtUtc: string
}

export function useFreelancerRatings(providerId: string | undefined, pageSize = 10) {
  return useQuery({
    queryKey: ['freelancer', providerId, 'ratings'],
    queryFn: () => apiRequest<{ items: FreelancerRating[]; page: number; totalItems: number; totalPages: number }>(
      `/freelancers/${encodeURIComponent(providerId as string)}/ratings?page=1&pageSize=${pageSize}`,
    ),
    enabled: Boolean(providerId),
  })
}
