import { ApiError } from '../shared/api/problem-details'

export type KycStatus = 'NotStarted' | 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Suspended'
export type KycGender = 'Female' | 'Male' | 'Other' | 'PreferNotToSay'
export type KycDocumentType = 'CitizenIdFront' | 'CitizenIdBack' | 'FaceVerification'
export type KycDocumentStatus = 'Pending' | 'Verified' | 'Rejected' | 'Expired'

export interface KycProfile {
  legalFullName: string
  /** Ngày sinh dạng ISO `YYYY-MM-DD`. */
  dateOfBirth: string
  gender: KycGender
  /** Server chỉ trả 4 số cuối CCCD; số đầy đủ không bao giờ được trả lại. */
  citizenIdLast4: string
  permanentAddress: string
  currentAddress: string
  experienceYears: number
}

export interface KycDocument {
  id: string
  type: KycDocumentType
  status: KycDocumentStatus
  originalFileName: string
  uploadedAtUtc: string
  rejectionReason: string | null
}

export interface KycFeedback {
  decision: 'Approved' | 'Rejected' | 'ChangesRequested'
  reason: string | null
  decidedAtUtc: string
}

export interface FreelancerKyc {
  status: KycStatus
  canEdit: boolean
  profile: KycProfile | null
  documents: KycDocument[]
  feedback: KycFeedback | null
  submittedAtUtc: string | null
}

export const kycStatusLabels: Record<KycStatus, string> = {
  NotStarted: 'Chưa bắt đầu',
  Draft: 'Đang soạn',
  Submitted: 'Đã gửi, chờ duyệt',
  UnderReview: 'Đang xem xét',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Suspended: 'Tạm ngưng',
}

export const kycGenderLabels: Record<KycGender, string> = {
  Female: 'Nữ',
  Male: 'Nam',
  Other: 'Khác',
  PreferNotToSay: 'Không muốn nêu',
}

export const kycDocumentStatusLabels: Record<KycDocumentStatus, string> = {
  Pending: 'Chờ duyệt',
  Verified: 'Đã xác minh',
  Rejected: 'Bị từ chối',
  Expired: 'Hết hạn',
}

export const kycDocumentSpecs: Record<KycDocumentType, { label: string; accept: string; formats: string }> = {
  CitizenIdFront: { label: 'Mặt trước CCCD gắn chip', accept: 'image/jpeg,image/png', formats: 'JPG hoặc PNG' },
  CitizenIdBack: { label: 'Mặt sau CCCD gắn chip', accept: 'image/jpeg,image/png', formats: 'JPG hoặc PNG' },
  FaceVerification: { label: 'Ảnh chân dung', accept: 'image/jpeg,image/png', formats: 'JPG hoặc PNG' },
}

export const kycRequiredDocumentTypes: KycDocumentType[] = ['CitizenIdFront', 'CitizenIdBack', 'FaceVerification']

export const kycDocumentMaxBytes = 5 * 1024 * 1024

const kycErrorMessages: Record<string, string> = {
  INVALID_LEGAL_NAME: 'Vui lòng nhập họ tên đúng như trên CCCD.',
  UNDERAGE: 'Freelancer phải từ 18 tuổi trở lên.',
  INVALID_DATE_OF_BIRTH: 'Ngày sinh không hợp lệ.',
  KYC_NOT_EDITABLE: 'Hồ sơ đã gửi duyệt nên không sửa được lúc này.',
  CITIZEN_ID_ALREADY_USED: 'Số CCCD này đã được dùng cho một tài khoản khác.',
  KYC_PROFILE_REQUIRED: 'Hãy điền và lưu thông tin cá nhân trước khi tải giấy tờ.',
  KYC_DOCUMENTS_MISSING: 'Bạn cần tải đủ mặt trước CCCD, mặt sau CCCD và ảnh chân dung.',
  KYC_DOCUMENT_REJECTED: 'Một số giấy tờ bị từ chối. Hãy tải lại ảnh mới trước khi gửi.',
  INVALID_DOCUMENT_TYPE: 'Loại giấy tờ không hợp lệ.',
  EMPTY_FILE: 'Tệp tải lên đang trống. Vui lòng chọn tệp khác.',
  FILE_TOO_LARGE: 'Ảnh không được vượt quá 5 MB.',
  UNSUPPORTED_IMAGE: 'Chỉ chấp nhận ảnh JPG hoặc PNG.',
  KYC_NOT_FOUND: 'Không tìm thấy hồ sơ KYC.',
  KYC_NOT_PENDING: 'Hồ sơ này không ở trạng thái chờ duyệt.',
  INVALID_DECISION: 'Quyết định không hợp lệ.',
  REASON_REQUIRED: 'Cần nhập lý do, tối thiểu 10 ký tự.',
}

export function kycErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem.code
    if (code && code in kycErrorMessages) return kycErrorMessages[code]
    if (error.status === 413) return kycErrorMessages.FILE_TOO_LARGE
    if (error.status === 415) return kycErrorMessages.UNSUPPORTED_IMAGE
    if (error.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
    if (error.status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng tài khoản freelancer.'
    return Object.values(error.problem.errors ?? {}).flat()[0] ?? error.message
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}

export const kycDocumentContentPath = (documentId: string) => `/freelancer/kyc/documents/${encodeURIComponent(documentId)}/content`

export { openDocumentInNewTab } from '../shared/api/document-content'
