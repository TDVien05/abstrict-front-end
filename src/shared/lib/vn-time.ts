// Lịch đặt ca tính theo Asia/Ho_Chi_Minh (UTC+7 cố định, không có giờ mùa hè).
const timeZone = 'Asia/Ho_Chi_Minh'

const dateFormatter = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone })
const timeFormatter = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone })
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone })
const isoDateFormatter = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone })

export function vnDateLabel(iso: string) {
  return dateFormatter.format(new Date(iso))
}

export function vnTime(iso: string | number) {
  return timeFormatter.format(new Date(iso))
}

export function vnDateTime(iso: string) {
  return dateTimeFormatter.format(new Date(iso))
}

export function vnTimeRange(startsAtUtc: string, endsAtUtc: string) {
  return `${vnTime(startsAtUtc)} – ${vnTime(endsAtUtc)}`
}

export function vnIsoDate(value: string | number | Date = new Date()) {
  return isoDateFormatter.format(new Date(value))
}

export function vnToUtcIso(date: string, time: string) {
  return new Date(`${date}T${time}:00+07:00`).toISOString()
}

export function durationHours(startsAtUtc: string, endsAtUtc: string) {
  return (Date.parse(endsAtUtc) - Date.parse(startsAtUtc)) / 3_600_000
}
