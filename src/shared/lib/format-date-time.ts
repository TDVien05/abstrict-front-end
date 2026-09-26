const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: VIETNAM_TIME_ZONE,
})

export function formatDateTime(value: string | Date): string {
  return dateTimeFormatter.format(typeof value === 'string' ? new Date(value) : value)
}
