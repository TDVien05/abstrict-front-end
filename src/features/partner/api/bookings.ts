import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { BookingStatus, BookingTask, BookingTimelineEntry, PagedResponse } from '../../../entities/booking'
import { apiRequest } from '../../../shared/api/http-client'

export interface AvailabilityWindow {
  id: string
  startsAtUtc: string
  endsAtUtc: string
}

export type FreelancerBookingAction = 'Confirm' | 'Reject'

export interface FreelancerBookingSummary {
  id: string
  bookingNumber: string
  status: BookingStatus
  customerName: string
  serviceCategoryCode: string
  serviceCategoryName: string
  startsAtUtc: string
  endsAtUtc: string
  baseAmountVnd: number
  depositAmountVnd: number
  areaLabel: string
  providerConfirmationDeadlineUtc: string | null
  allowedActions: FreelancerBookingAction[]
}

export interface FreelancerBookingDetail extends FreelancerBookingSummary {
  addressSnapshot: string | null
  customerNote: string | null
  tasks: BookingTask[]
  timeline: BookingTimelineEntry[]
}

export interface FreelancerBookingCounts {
  counts: Partial<Record<BookingStatus, number>>
  total: number
}

export interface FreelancerBookingFilters {
  status?: BookingStatus
  page?: number
  pageSize?: number
}

const availabilityKey = ['freelancer-self', 'availability']
const bookingsKey = ['freelancer-self', 'bookings']
const bookingPath = (bookingId: string) => `/freelancer/bookings/${encodeURIComponent(bookingId)}`

export function useMyAvailability(from: string, days: number) {
  return useQuery({
    queryKey: [...availabilityKey, from, days],
    queryFn: () => apiRequest<AvailabilityWindow[]>(`/freelancer/availability?from=${from}&days=${days}`),
  })
}

export function useCreateAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (window: { startsAtUtc: string; endsAtUtc: string }) => apiRequest<AvailabilityWindow>('/freelancer/availability', { method: 'POST', body: window }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKey }),
  })
}

export function useDeleteAvailability() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (windowId: string) => apiRequest<void>(`/freelancer/availability/${encodeURIComponent(windowId)}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: availabilityKey }),
  })
}

export function useFreelancerBookings(filters: FreelancerBookingFilters) {
  return useQuery({
    queryKey: [...bookingsKey, 'list', filters],
    queryFn: () => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined) params.set(key, String(value))
      }
      return apiRequest<PagedResponse<FreelancerBookingSummary>>(`/freelancer/bookings?${params}`)
    },
    placeholderData: keepPreviousData,
  })
}

export function useFreelancerBookingCounts() {
  return useQuery({ queryKey: [...bookingsKey, 'counts'], queryFn: () => apiRequest<FreelancerBookingCounts>('/freelancer/bookings/counts') })
}

export function useFreelancerBooking(bookingId: string | undefined) {
  return useQuery({
    queryKey: [...bookingsKey, 'detail', bookingId],
    queryFn: () => apiRequest<FreelancerBookingDetail>(bookingPath(bookingId as string)),
    enabled: Boolean(bookingId),
    retry: false,
  })
}

export function useRespondToBooking(bookingId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (response: { accept: true } | { accept: false; reason: string }) =>
      response.accept
        ? apiRequest<FreelancerBookingDetail>(`${bookingPath(bookingId)}/confirm`, { method: 'POST' })
        : apiRequest<FreelancerBookingDetail>(`${bookingPath(bookingId)}/reject`, { method: 'POST', body: response.reason ? { reason: response.reason } : {} }),
    onSuccess: (booking) => {
      queryClient.setQueryData([...bookingsKey, 'detail', bookingId], booking)
      void queryClient.invalidateQueries({ queryKey: [...bookingsKey, 'list'] })
      void queryClient.invalidateQueries({ queryKey: [...bookingsKey, 'counts'] })
    },
  })
}
