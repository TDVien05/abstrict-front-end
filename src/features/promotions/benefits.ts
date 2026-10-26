export const MAX_BENEFITS = 10
export const MAX_BENEFIT_LENGTH = 200

// Bỏ khoảng trắng thừa và dòng trống trước khi gửi lên server.
export function cleanBenefits(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean)
}
