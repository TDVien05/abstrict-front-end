import { z } from 'zod'

const requiredText = z.string().trim().min(1, 'Vui lòng điền thông tin này.')

// Ảnh định danh (nếu chọn) chỉ nhận JPG/PNG và tối đa 5 MB, khớp giới hạn của backend.
// Không bắt buộc ở schema vì hồ sơ đã gửi có thể đã có ảnh trên server; sự hiện diện do API kiểm tra.
const photo = z
  .custom<FileList>()
  .refine((files) => !files?.length || files[0].size <= 5 * 1024 * 1024, 'Ảnh không được lớn hơn 5 MB.')
  .refine((files) => !files?.length || ['image/jpeg', 'image/png'].includes(files[0].type), 'Chỉ nhận ảnh JPG hoặc PNG.')
  .optional()

function isAdult(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const birth = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(birth.getTime())) return false
  const eighteenth = new Date()
  eighteenth.setFullYear(eighteenth.getFullYear() - 18)
  return birth <= eighteenth
}

export const partnerRegistrationSchema = z.object({
  fullName: requiredText,
  birthDate: requiredText.refine(isAdult, 'Bạn phải từ 18 tuổi trở lên.'),
  gender: z.enum(['Female', 'Male']),
  citizenIdNumber: z.string().trim().regex(/^\d{12}$/, 'Số CCCD gồm đúng 12 chữ số.'),
  permanentAddress: requiredText,
  currentAddress: requiredText,
  experienceYears: z.string().trim().regex(/^\d+$/, 'Số năm kinh nghiệm phải là số không âm.').refine((value) => Number(value) <= 60, 'Không vượt quá 60 năm.'),
  front: photo,
  back: photo,
  portrait: photo,
  consent: z.boolean().refine(Boolean, 'Bạn cần xác nhận thông tin trước khi gửi.'),
})

export type PartnerRegistrationValues = z.infer<typeof partnerRegistrationSchema>
