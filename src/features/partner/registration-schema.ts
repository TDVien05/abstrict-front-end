import { z } from 'zod'

const requiredText = z.string().trim().min(1, 'Vui lòng điền thông tin này.')
const upload = z.custom<FileList>().refine((files) => files?.length === 1, 'Vui lòng chọn một tệp.').refine((files) => !files?.length || files[0].size <= 15 * 1024 * 1024, 'Tệp không được lớn hơn 15 MB.').refine((files) => !files?.length || ['image/jpeg', 'image/png', 'application/pdf'].includes(files[0].type), 'Chỉ nhận tệp JPG, PNG hoặc PDF.')
const photo = upload.refine((files) => !files?.length || ['image/jpeg', 'image/png'].includes(files[0].type), 'Vui lòng chọn ảnh JPG hoặc PNG.')

export const partnerRegistrationSchema = z.object({
  fullName: requiredText,
  phone: z.string().trim().regex(/^(0[35789]\d{8}|\+84[35789]\d{8})$/, 'Số điện thoại không hợp lệ.'),
  birthDate: requiredText.refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && value < new Date().toISOString().slice(0, 10), 'Ngày sinh phải trước ngày hiện tại.'),
  gender: z.string(), permanentAddress: requiredText, currentAddress: requiredText,
  areas: z.array(z.string()).min(1, 'Chọn ít nhất một khu vực nhận ca.'),
  front: photo, back: photo, portrait: photo, health: upload, judicial: upload,
  skills: z.array(z.string()).min(1, 'Chọn ít nhất một kỹ năng.'),
  bank: requiredText, bankAccount: z.string().trim().regex(/^\d{6,20}$/, 'Số tài khoản phải gồm 6–20 chữ số.'), accountName: requiredText,
  consent: z.boolean().refine(Boolean, 'Bạn cần xác nhận thông tin trước khi gửi.'),
})
export type PartnerRegistrationValues = z.infer<typeof partnerRegistrationSchema>
