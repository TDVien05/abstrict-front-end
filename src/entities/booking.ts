export type BookingStatus =
  | 'PendingDeposit'
  | 'PendingProviderConfirmation'
  | 'Confirmed'
  | 'CheckedIn'
  | 'InProgress'
  | 'PendingAcceptance'
  | 'Completed'
  | 'Expired'
  | 'Rejected'
  | 'Cancelled'
  | 'Disputed'

export interface BookingSummary {
  id: string
  providerName: string
  startsAt: string
  endsAt: string
  status: BookingStatus
  totalAmount: number
}
