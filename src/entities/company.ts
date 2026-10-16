import { ApiError } from '../shared/api/problem-details'

export type CompanyOnboardingStep = 'Company' | 'Representative' | 'ServiceAreas' | 'Documents' | 'Submit' | 'AwaitingReview' | 'Completed' | 'Suspended'
export type CompanyStatus = 'NotStarted' | 'Draft' | 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Suspended'
export type CompanyWorkforceSize = 'UnderTen' | 'TenToThirty' | 'OverThirty'
export type CompanyDocumentType = 'BusinessRegistration' | 'CitizenIdFront' | 'CitizenIdBack' | 'LiabilityInsurance'

export interface CompanyProfile {
  legalName: string
  displayName: string
  taxCode: string
  hotline: string
  headquartersAddress: string
  workforceSize: CompanyWorkforceSize
  liabilityCoverageVnd: number | null
}

export interface CompanyServiceArea {
  id: string
  city: string
  district: string
  wardOrComplex: string | null
}

export interface CompanyDocument {
  id: string
  type: CompanyDocumentType
  status: 'Pending' | 'Verified' | 'Rejected' | 'Expired'
  originalFileName: string
  contentType: string
  uploadedAtUtc: string
  rejectionReason: string | null
}

export interface CompanyFeedback {
  decision: string
  reason: string | null
  decidedAtUtc: string
}

export const companyStatusLabels: Record<CompanyStatus, string> = {
  NotStarted: 'Chưa bắt đầu',
  Draft: 'Đang soạn',
  Submitted: 'Đã gửi, chờ duyệt',
  UnderReview: 'Đang xem xét',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Suspended: 'Tạm ngưng',
}

export const workforceSizeLabels: Record<CompanyWorkforceSize, string> = {
  UnderTen: 'Dưới 10 người',
  TenToThirty: '10 – 30 người',
  OverThirty: 'Trên 30 người',
}

// Căn cước chỉ nhận ảnh; ĐKKD và bảo hiểm nhận thêm PDF.
export const companyDocumentSpecs: Record<CompanyDocumentType, { label: string; accept: string; formats: string }> = {
  BusinessRegistration: { label: 'Giấy đăng ký kinh doanh', accept: 'image/jpeg,image/png,application/pdf', formats: 'JPG, PNG hoặc PDF' },
  CitizenIdFront: { label: 'CCCD người đại diện – mặt trước', accept: 'image/jpeg,image/png', formats: 'JPG hoặc PNG' },
  CitizenIdBack: { label: 'CCCD người đại diện – mặt sau', accept: 'image/jpeg,image/png', formats: 'JPG hoặc PNG' },
  LiabilityInsurance: { label: 'Bảo hiểm trách nhiệm', accept: 'image/jpeg,image/png,application/pdf', formats: 'JPG, PNG hoặc PDF' },
}

export const documentStatusLabels: Record<CompanyDocument['status'], string> = { Pending: 'Chờ duyệt', Verified: 'Đã xác minh', Rejected: 'Bị từ chối', Expired: 'Hết hạn' }

export const companyDocumentMaxBytes = 10 * 1024 * 1024

const companyErrorMessages: Record<string, string> = {
  INVALID_TAX_CODE: 'Mã số thuế phải gồm 10 chữ số, hoặc 10 chữ số kèm hậu tố chi nhánh dạng -001.',
  INVALID_HOTLINE: 'Hotline phải là số điện thoại Việt Nam hoặc tổng đài 1800/1900.',
  INVALID_PHONE_NUMBER: 'Số điện thoại chưa đúng định dạng.',
  INVALID_COMPANY_NAME: 'Tên công ty chưa hợp lệ.',
  INVALID_SERVICE_AREA: 'Chọn từ 1 đến 20 khu vực đang hoạt động.',
  INVALID_DOCUMENT_TYPE: 'Loại giấy tờ này không thuộc hồ sơ doanh nghiệp.',
  EMPTY_FILE: 'File rỗng. Vui lòng chọn file khác.',
  INVALID_DECISION: 'Quyết định không hợp lệ.',
  REASON_REQUIRED: 'Cần nhập lý do, tối thiểu 10 ký tự.',
  COMPANY_NOT_FOUND: 'Không tìm thấy hồ sơ doanh nghiệp.',
  DOCUMENT_NOT_FOUND: 'Không tìm thấy giấy tờ.',
  TAX_CODE_ALREADY_USED: 'Mã số thuế này đã thuộc về một doanh nghiệp khác.',
  COMPANY_NOT_EDITABLE: 'Hồ sơ đã gửi duyệt hoặc đã được duyệt nên không sửa được.',
  COMPANY_PROFILE_REQUIRED: 'Cần khai thông tin pháp nhân trước.',
  COMPANY_REPRESENTATIVE_REQUIRED: 'Cần khai người đại diện trước khi gửi duyệt.',
  COMPANY_SERVICE_AREAS_REQUIRED: 'Cần chọn khu vực nhận ca trước khi gửi duyệt.',
  COMPANY_DOCUMENTS_MISSING: 'Còn thiếu giấy tờ bắt buộc.',
  COMPANY_DOCUMENT_REJECTED: 'Còn giấy tờ bị từ chối chưa tải lại.',
  COMPANY_REVIEW_INVALID_STATE: 'Hồ sơ không ở trạng thái chờ duyệt.',
  FILE_TOO_LARGE: 'File lớn hơn 10 MB.',
  UNSUPPORTED_DOCUMENT: 'Định dạng file không được chấp nhận cho loại giấy tờ này.',
}

export function companyErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const code = error.problem.code
    if (code && code in companyErrorMessages) return companyErrorMessages[code]
    if (error.status === 413) return companyErrorMessages.FILE_TOO_LARGE
    if (error.status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
    return Object.values(error.problem.errors ?? {}).flat()[0] ?? error.message
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}

export { openDocumentInNewTab } from '../shared/api/document-content'
