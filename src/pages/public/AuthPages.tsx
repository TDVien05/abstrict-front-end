import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  HelpCircle,
  Info,
  LockKeyhole,
  MessageSquareText,
  Phone,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type KeyboardEvent,
  type PropsWithChildren,
} from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import {
  getAuthApiErrorMessage,
  registerCustomer,
  resendPhoneOtp,
  verifyPhoneOtp,
  type CustomerRegistrationResponse,
} from '../../features/auth/api/customer-registration'
import { loginCustomer } from '../../features/auth/api/customer-session'
import { useAuth } from '../../features/auth/auth-context'
import { BrandLogo } from '../../shared/ui/BrandLogo'

const inputClass =
  'h-11 w-full rounded-lg border border-brand-border bg-white px-3.5 text-sm text-brand-charcoal outline-none transition placeholder:text-brand-muted/60 focus:border-brand-charcoal focus:ring-1 focus:ring-brand-charcoal'

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập số điện thoại.')
  .regex(/^(0|\+84)[0-9\s]{9,12}$/, 'Số điện thoại chưa đúng định dạng.')

const signInSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, 'Vui lòng nhập mật khẩu.'),
})

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Vui lòng nhập đầy đủ họ và tên.'),
    phone: phoneSchema,
    password: z
      .string()
      .min(8, 'Mật khẩu cần có ít nhất 8 ký tự.')
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, 'Mật khẩu cần có cả chữ và số.'),
    confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu.'),
    acceptsTerms: z.literal(true, { error: 'Bạn cần đồng ý với điều khoản sử dụng.' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận chưa khớp.',
    path: ['confirmPassword'],
  })

type SignInValues = z.infer<typeof signInSchema>
type SignUpValues = z.infer<typeof signUpSchema>

function AuthFooter() {
  return (
    <footer className="w-full px-4 py-5 text-center text-xs text-brand-muted">
      <div className="mx-auto flex max-w-lg flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>© 2026 ABSTRICT Inc.</span><span>·</span>
        <a className="transition-colors hover:text-brand-charcoal" href="#terms">Điều khoản sử dụng</a><span>·</span>
        <a className="transition-colors hover:text-brand-charcoal" href="#privacy">Chính sách quyền riêng tư</a>
      </div>
    </footer>
  )
}

function SupportHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
      <Link aria-label="ABSTRICT - Trang chủ" className="shrink-0" to="/"><BrandLogo size="sm" /></Link>
      <div className="ml-auto flex min-w-0 items-center text-xs font-medium text-brand-muted">
        <a className="flex shrink-0 items-center gap-1 whitespace-nowrap transition-colors hover:text-brand-charcoal" href="mailto:support@abstrict.vn"><HelpCircle aria-hidden="true" className="h-4 w-4" />Trung tâm trợ giúp</a>
        <span className="mx-4 hidden text-brand-border lg:inline">|</span>
        <a className="hidden shrink-0 items-center gap-1 whitespace-nowrap transition-colors hover:text-brand-charcoal lg:flex" href="tel:18002278"><Phone aria-hidden="true" className="h-4 w-4" />Hotline 1800-ABSTRICT</a>
      </div>
    </header>
  )
}

function AuthPage({ centeredHeader = false, children }: PropsWithChildren<{ centeredHeader?: boolean }>) {
  if (centeredHeader) {
    return (
      <div className="flex min-h-screen flex-col justify-between bg-[#f8f9fa] text-brand-charcoal">
        <main className="flex w-full flex-1 items-center justify-center px-4 py-8">
          <div className="flex w-full flex-col items-center gap-6">
            <Link aria-label="ABSTRICT - Trang chủ" to="/"><BrandLogo /></Link>
            {children}
          </div>
        </main>
        <AuthFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-[#f8f9fa] text-brand-charcoal">
      <SupportHeader />
      <main className="flex w-full flex-1 items-center justify-center px-4 py-6 sm:py-8">{children}</main>
      <AuthFooter />
    </div>
  )
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-600" role="alert">{message}</p>
}

function PasswordField({ autoComplete, error, label, placeholder, registration }: {
  autoComplete: string
  error?: string
  label: string
  placeholder: string
  registration: UseFormRegisterReturn
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <label className="block text-xs font-semibold text-brand-charcoal">
      {label}
      <span className="relative mt-1.5 flex items-center">
        <input autoComplete={autoComplete} className={`${inputClass} pr-10`} placeholder={placeholder} type={isVisible ? 'text' : 'password'} {...registration} />
        <button aria-label={isVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 text-brand-muted transition-colors hover:text-brand-charcoal" onClick={() => setIsVisible((current) => !current)} type="button">
          {isVisible ? <EyeOff aria-hidden="true" className="h-[18px] w-[18px]" /> : <Eye aria-hidden="true" className="h-[18px] w-[18px]" />}
        </button>
      </span>
      <FieldError message={error} />
    </label>
  )
}

type LegalDocument = 'privacy' | 'terms'

function LegalDialog({ kind, isOpen, onClose }: { kind: LegalDocument; isOpen: boolean; onClose: () => void }) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const isPrivacy = kind === 'privacy'
  const title = isPrivacy ? 'Chính sách quyền riêng tư' : 'Điều khoản dịch vụ'
  const titleId = `${kind}-title`
  const summaryId = `${kind}-summary`

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>('button, a[href]')
      if (!focusableElements?.length) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-brand-charcoal/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <section
        aria-describedby={summaryId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-h-[85vh] sm:rounded-2xl"
        ref={dialogRef}
        role="dialog"
      >
        <header className="flex items-start justify-between gap-4 border-b border-brand-border px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue-ink">ABSTRICT</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-brand-charcoal sm:text-2xl" id={titleId}>{title}</h2>
            <p className="mt-1 text-xs text-brand-muted">Có hiệu lực từ ngày 27/09/2026</p>
          </div>
          <button
            aria-label={`Đóng ${title.toLocaleLowerCase('vi-VN')}`}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-[#f3f4f6] hover:text-brand-charcoal focus:outline-none focus:ring-2 focus:ring-brand-blue-pastel-hover"
            onClick={onClose}
            ref={closeButtonRef}
            type="button"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-5 text-[13px] leading-6 text-brand-muted sm:px-7 sm:py-6 sm:text-sm">
          <p className="rounded-xl bg-brand-blue-pastel-soft p-4 text-brand-blue-ink" id={summaryId}>
            {isPrivacy
              ? 'Chính sách này giải thích cách ABSTRICT thu thập, sử dụng, lưu trữ và bảo vệ thông tin của bạn.'
              : 'Khi tạo tài khoản và sử dụng ABSTRICT, bạn xác nhận đã đọc, hiểu và đồng ý với các điều khoản dưới đây.'}
          </p>
          <div className="mt-5 space-y-5">
            {isPrivacy ? (
              <>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">1. Thông tin chúng tôi thu thập</h3>
                  <p className="mt-1">ABSTRICT có thể thu thập họ tên, số điện thoại, thông tin tài khoản, địa chỉ cung cấp dịch vụ, nội dung đặt lịch, lịch sử giao dịch và thông tin bạn chủ động cung cấp khi liên hệ hỗ trợ.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">2. Mục đích sử dụng thông tin</h3>
                  <p className="mt-1">Thông tin được dùng để tạo và bảo vệ tài khoản, xử lý lịch hẹn và thanh toán, kết nối với đơn vị cung cấp dịch vụ, hỗ trợ khách hàng, phòng chống gian lận và cải thiện trải nghiệm trên nền tảng.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">3. Chia sẻ thông tin</h3>
                  <p className="mt-1">ABSTRICT chỉ chia sẻ dữ liệu cần thiết với đơn vị cung cấp dịch vụ, đối tác thanh toán, nhà cung cấp hạ tầng hoặc cơ quan có thẩm quyền khi pháp luật yêu cầu. Chúng tôi không bán thông tin cá nhân của bạn.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">4. Lưu trữ và bảo mật</h3>
                  <p className="mt-1">Dữ liệu được lưu trong thời gian cần thiết cho mục đích đã nêu hoặc theo nghĩa vụ pháp lý. ABSTRICT áp dụng các biện pháp kỹ thuật và tổ chức phù hợp để hạn chế truy cập, sử dụng hoặc tiết lộ trái phép.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">5. Quyền của bạn</h3>
                  <p className="mt-1">Bạn có thể yêu cầu xem, cập nhật, chỉnh sửa hoặc xóa thông tin cá nhân; rút lại sự đồng ý trong trường hợp phù hợp; và gửi phản ánh về cách dữ liệu được xử lý. Một số yêu cầu có thể bị giới hạn bởi nghĩa vụ pháp lý hoặc giao dịch đang thực hiện.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">6. Cookie và dữ liệu thiết bị</h3>
                  <p className="mt-1">Nền tảng có thể sử dụng cookie và dữ liệu kỹ thuật như loại thiết bị, trình duyệt, địa chỉ IP và nhật ký hoạt động để duy trì phiên đăng nhập, bảo mật hệ thống, đo lường hiệu suất và ghi nhớ tùy chọn của bạn.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">7. Liên hệ về quyền riêng tư</h3>
                  <p className="mt-1">Để thực hiện quyền của mình hoặc đặt câu hỏi về dữ liệu cá nhân, vui lòng liên hệ <a className="font-medium text-brand-blue-ink hover:underline" href="mailto:support@abstrict.vn">support@abstrict.vn</a> hoặc hotline <a className="font-medium text-brand-blue-ink hover:underline" href="tel:18002278">1800-ABSTRICT</a>.</p>
                </section>
              </>
            ) : (
              <>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">1. Tài khoản người dùng</h3>
                  <p className="mt-1">Bạn cần cung cấp thông tin chính xác, tự bảo mật mật khẩu và mã OTP, đồng thời thông báo cho ABSTRICT khi phát hiện truy cập trái phép. Mỗi người dùng chịu trách nhiệm với hoạt động phát sinh từ tài khoản của mình.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">2. Đặt lịch và sử dụng dịch vụ</h3>
                  <p className="mt-1">ABSTRICT là nền tảng hỗ trợ kết nối người dùng với đơn vị cung cấp dịch vụ. Giá, thời gian, phạm vi công việc và yêu cầu riêng sẽ được hiển thị để bạn xác nhận trước khi đặt lịch.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">3. Thanh toán, hủy lịch và hoàn tiền</h3>
                  <p className="mt-1">Bạn đồng ý thanh toán đầy đủ khoản phí đã xác nhận. Điều kiện hủy lịch, phí phát sinh và hoàn tiền có thể khác nhau theo từng dịch vụ; chính sách áp dụng sẽ được thông báo trước khi hoàn tất giao dịch.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">4. Quy tắc sử dụng</h3>
                  <p className="mt-1">Bạn không được dùng nền tảng cho hành vi gian lận, quấy rối, vi phạm pháp luật, xâm phạm quyền của người khác hoặc gây ảnh hưởng đến an toàn và hoạt động của hệ thống.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">5. Dữ liệu và quyền riêng tư</h3>
                  <p className="mt-1">ABSTRICT xử lý thông tin cần thiết để vận hành tài khoản, hỗ trợ đặt lịch, thanh toán và chăm sóc khách hàng. Cách thu thập, sử dụng và bảo vệ dữ liệu được mô tả chi tiết trong Chính sách quyền riêng tư.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">6. Thay đổi và chấm dứt</h3>
                  <p className="mt-1">ABSTRICT có thể cập nhật điều khoản để phù hợp với dịch vụ hoặc quy định pháp luật và sẽ thông báo khi có thay đổi quan trọng. Tài khoản vi phạm nghiêm trọng có thể bị hạn chế hoặc chấm dứt quyền truy cập.</p>
                </section>
                <section>
                  <h3 className="font-semibold text-brand-charcoal">7. Hỗ trợ</h3>
                  <p className="mt-1">Nếu có câu hỏi về điều khoản, vui lòng liên hệ <a className="font-medium text-brand-blue-ink hover:underline" href="mailto:support@abstrict.vn">support@abstrict.vn</a> hoặc hotline <a className="font-medium text-brand-blue-ink hover:underline" href="tel:18002278">1800-ABSTRICT</a>.</p>
                </section>
              </>
            )}
          </div>
        </div>

        <footer className="border-t border-brand-border bg-white px-5 py-4 sm:px-7">
          <button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-charcoal text-sm font-semibold text-white transition hover:bg-black/90 active:scale-[0.99]" onClick={onClose} type="button">
            Tôi đã hiểu
          </button>
        </footer>
      </section>
    </div>
  )
}

export function SignInPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSession } = useAuth()
  const loginMutation = useMutation({ mutationFn: loginCustomer })
  const { formState: { errors, isSubmitting }, getValues, handleSubmit, register, setError } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  async function submitSignIn(values: SignInValues) {
    try {
      const response = await loginMutation.mutateAsync({ phoneNumber: values.phone, password: values.password })
      setSession(
        { id: response.userId, displayName: response.fullName, actor: 'customer' },
        response.accessToken,
      )

      const from = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from
      const destination = from?.pathname && from.pathname !== '/login'
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/kham-pha'
      navigate(destination, { replace: true })
    } catch (error) {
      setError('root', { message: getAuthApiErrorMessage(error) })
    }
  }

  return (
    <AuthPage>
      <section className="w-full max-w-[440px] rounded-2xl border border-brand-border bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-7"><h1 className="text-2xl font-semibold tracking-[-0.025em] text-brand-charcoal">Đăng nhập</h1><p className="mt-1.5 text-sm leading-relaxed text-brand-muted">Nhập thông tin đăng nhập để quản lý lịch hẹn và dịch vụ của bạn.</p></div>
        <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit(submitSignIn)}>
          <label className="block text-xs font-semibold text-brand-charcoal">Số điện thoại<span className="relative mt-1.5 flex items-center"><span className="pointer-events-none absolute left-3.5 flex items-center gap-1 text-sm font-medium text-brand-muted"><span className="text-xs">🇻🇳</span>+84</span><input autoComplete="tel" className={`${inputClass} pl-[4.5rem]`} inputMode="tel" placeholder="090 123 4567" {...register('phone')} /></span><FieldError message={errors.phone?.message} /></label>
          <div><div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold text-brand-charcoal">Mật khẩu</span><a className="text-xs font-medium text-brand-blue-ink hover:underline" href="mailto:support@abstrict.vn">Quên mật khẩu?</a></div><PasswordField autoComplete="current-password" error={errors.password?.message} label="" placeholder="••••••••" registration={register('password')} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-brand-muted"><input className="h-4 w-4 accent-brand-charcoal" defaultChecked type="checkbox" />Ghi nhớ đăng nhập</label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-charcoal text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] disabled:opacity-60" disabled={isSubmitting || loginMutation.isPending} type="submit">{loginMutation.isPending ? 'Đang đăng nhập...' : 'Đăng nhập'} <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" /></button>
          <button className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-brand-muted transition-colors hover:text-brand-charcoal" onClick={() => navigate('/verify-otp', { state: { phone: getValues('phone') } })} type="button"><MessageSquareText aria-hidden="true" className="h-4 w-4" />Đăng nhập nhanh bằng mã OTP SMS</button>
          <FieldError message={errors.root?.message} />
          <div className="h-px bg-brand-border" />
          <p className="text-center text-xs text-brand-muted">Chưa có tài khoản? <Link className="ml-1 font-semibold text-brand-charcoal transition-colors hover:text-brand-blue-ink" to="/register">Đăng ký ngay</Link></p>
        </form>
      </section>
    </AuthPage>
  )
}

export function SignUpPage() {
  const navigate = useNavigate()
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false)
  const [isTermsOpen, setIsTermsOpen] = useState(false)
  const privacyButtonRef = useRef<HTMLButtonElement>(null)
  const termsButtonRef = useRef<HTMLButtonElement>(null)
  const registrationMutation = useMutation({ mutationFn: registerCustomer })
  const { formState: { errors, isSubmitting }, handleSubmit, register, setError } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  function closeTerms() {
    setIsTermsOpen(false)
    window.requestAnimationFrame(() => termsButtonRef.current?.focus())
  }

  function closePrivacy() {
    setIsPrivacyOpen(false)
    window.requestAnimationFrame(() => privacyButtonRef.current?.focus())
  }

  async function submitRegistration(values: SignUpValues) {
    try {
      const response = await registrationMutation.mutateAsync({
        fullName: values.fullName,
        phoneNumber: values.phone,
        password: values.password,
        confirmPassword: values.confirmPassword,
        acceptTermsAndPrivacy: values.acceptsTerms,
      })
      navigate('/verify-otp', { state: response })
    } catch (error) {
      setError('root', { message: getAuthApiErrorMessage(error) })
    }
  }

  return (
    <AuthPage centeredHeader>
      <section className="w-full max-w-[460px] rounded-2xl border border-brand-border bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-9">
        <div className="mb-6"><h1 className="text-2xl font-semibold tracking-[-0.025em] text-brand-charcoal">Tạo tài khoản</h1><p className="mt-1.5 text-sm leading-relaxed text-brand-muted">Tạo tài khoản để đặt lịch và quản lý dịch vụ thuận tiện hơn.</p></div>
        <form className="space-y-4" noValidate onSubmit={handleSubmit(submitRegistration)}>
          <label className="block text-[13px] font-medium text-brand-charcoal">Họ và tên <span className="text-red-600">*</span><input autoComplete="name" className={`${inputClass} mt-1.5`} placeholder="Nguyễn Thu Hà" {...register('fullName')} /><FieldError message={errors.fullName?.message} /></label>
          <label className="block text-[13px] font-medium text-brand-charcoal"><span className="flex items-center justify-between"><span>Số điện thoại <span className="text-red-600">*</span></span><span className="text-[11px] font-normal text-brand-muted">Nhận mã OTP qua SMS</span></span><input autoComplete="tel" className={`${inputClass} mt-1.5`} inputMode="tel" placeholder="090 123 4567" {...register('phone')} /><FieldError message={errors.phone?.message} /></label>
          <PasswordField autoComplete="new-password" error={errors.password?.message} label="Mật khẩu *" placeholder="Tối thiểu 8 ký tự kèm chữ và số" registration={register('password')} />
          <PasswordField autoComplete="new-password" error={errors.confirmPassword?.message} label="Xác nhận mật khẩu *" placeholder="Nhập lại mật khẩu vừa tạo" registration={register('confirmPassword')} />
          <div className="pt-1">
            <div className="flex items-start gap-2.5 text-[12.5px] leading-5 text-brand-muted">
              <input aria-label="Đồng ý với điều khoản dịch vụ và chính sách quyền riêng tư" className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-charcoal" id="accepts-terms" type="checkbox" {...register('acceptsTerms')} />
              <span>
                <label className="cursor-pointer" htmlFor="accepts-terms">Tôi đồng ý với</label>{' '}
                <button className="font-medium text-brand-charcoal hover:underline" onClick={() => setIsTermsOpen(true)} ref={termsButtonRef} type="button">Điều khoản dịch vụ</button>
                {' '}và <button className="font-medium text-brand-charcoal hover:underline" onClick={() => setIsPrivacyOpen(true)} ref={privacyButtonRef} type="button">Chính sách quyền riêng tư</button> của ABSTRICT.
              </span>
            </div>
            <FieldError message={errors.acceptsTerms?.message} />
          </div>
          <FieldError message={errors.root?.message} />
          <div className="pt-2"><button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-charcoal text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting || registrationMutation.isPending} type="submit">{isSubmitting || registrationMutation.isPending ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button></div>
          <div className="flex items-start gap-2 rounded-lg border border-brand-border bg-[#f8f9fa] p-3 text-xs leading-4 text-brand-muted"><Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-charcoal" /><span>Mã xác thực OTP sẽ được gửi qua SMS sau khi bạn nhấn <strong>Tạo tài khoản</strong>.</span></div>
          <p className="pt-2 text-center text-[13px] text-brand-muted">Đã có tài khoản ABSTRICT? <Link className="ml-1 font-semibold text-brand-charcoal hover:underline" to="/login">Đăng nhập ngay</Link></p>
        </form>
      </section>
      <LegalDialog kind="terms" isOpen={isTermsOpen} onClose={closeTerms} />
      <LegalDialog kind="privacy" isOpen={isPrivacyOpen} onClose={closePrivacy} />
    </AuthPage>
  )
}

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function secondsUntil(utcDate?: string) {
  if (!utcDate) return 0
  return Math.max(0, Math.ceil((new Date(utcDate).getTime() - Date.now()) / 1000))
}

export function OtpVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationState = location.state as CustomerRegistrationResponse | null
  const [challenge, setChallenge] = useState<CustomerRegistrationResponse | null>(
    navigationState?.challengeId ? navigationState : null,
  )
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [seconds, setSeconds] = useState(() => secondsUntil(navigationState?.resendAvailableAtUtc))
  const [message, setMessage] = useState<{ kind: 'error' | 'info' | 'success'; text: string } | null>(
    navigationState?.challengeId
      ? null
      : { kind: 'error', text: 'Không tìm thấy yêu cầu đăng ký đang chờ. Vui lòng quay lại và đăng ký lại.' },
  )
  const [isVerified, setIsVerified] = useState(false)
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])
  const verifyMutation = useMutation({ mutationFn: verifyPhoneOtp })
  const resendMutation = useMutation({ mutationFn: resendPhoneOtp })
  const phone = challenge?.phoneNumber ?? 'số điện thoại đã đăng ký'

  useEffect(() => {
    function updateCountdown() {
      setSeconds(secondsUntil(challenge?.resendAvailableAtUtc))
    }

    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [challenge?.resendAvailableAtUtc])

  function updateDigit(index: number, event: ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.replace(/\D/g, '').slice(-1)
    setDigits((current) => current.map((digit, digitIndex) => digitIndex === index ? value : digit))
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus()
  }

  function handleOtpPaste(event: ClipboardEvent<HTMLInputElement>) {
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('')
    if (!pastedDigits.length) return
    event.preventDefault()
    setDigits(Array.from({ length: 6 }, (_, index) => pastedDigits[index] ?? ''))
    inputRefs.current[Math.min(pastedDigits.length, 6) - 1]?.focus()
  }

  async function submitOtp() {
    if (!challenge) {
      setMessage({ kind: 'error', text: 'Không tìm thấy yêu cầu đăng ký đang chờ. Vui lòng quay lại và đăng ký lại.' })
      return
    }

    if (!digits.every(Boolean)) {
      setMessage({ kind: 'error', text: 'Vui lòng nhập đủ 6 chữ số trong mã xác thực.' })
      return
    }

    try {
      const response = await verifyMutation.mutateAsync({
        challengeId: challenge.challengeId,
        code: digits.join(''),
      })
      setIsVerified(true)
      setMessage({
        kind: 'success',
        text: response.status === 'Active'
          ? 'Số điện thoại đã được xác thực. Tài khoản của bạn đã sẵn sàng.'
          : 'Số điện thoại đã được xác thực thành công.',
      })
    } catch (error) {
      setMessage({ kind: 'error', text: getAuthApiErrorMessage(error) })
    }
  }

  async function resendOtp() {
    if (!challenge) {
      setMessage({ kind: 'error', text: 'Không tìm thấy yêu cầu xác thực để gửi lại mã.' })
      return
    }

    try {
      const response = await resendMutation.mutateAsync(challenge.challengeId)
      setChallenge(response)
      setDigits(['', '', '', '', '', ''])
      setMessage({ kind: 'success', text: 'Mã xác thực mới đã được gửi. Vui lòng kiểm tra điện thoại của bạn.' })
      window.requestAnimationFrame(() => inputRefs.current[0]?.focus())
    } catch (error) {
      setMessage({ kind: 'error', text: getAuthApiErrorMessage(error) })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-8 text-brand-charcoal">
      <main className="flex w-full max-w-[460px] flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between text-xs text-brand-muted"><button className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-charcoal" onClick={() => navigate('/register')} type="button"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Quay lại sửa số điện thoại</button><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium">Bước 2 / 2</span></div>
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-4 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue-pastel-soft text-brand-blue-ink"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span><span className="flex items-center gap-1.5 rounded-full bg-[#f8f9fa] px-2.5 py-1 text-[11px] font-medium text-brand-muted"><span className={`h-2 w-2 rounded-full ${isVerified ? 'bg-brand-green' : 'animate-pulse bg-brand-blue-pastel-hover'}`} />{isVerified ? 'Đã xác thực' : 'Chờ nhập OTP'}</span></div>
          <div className="mb-6 space-y-1.5"><h1 className="text-2xl font-semibold tracking-[-0.025em]">Xác thực số điện thoại</h1><p className="text-sm leading-relaxed text-brand-muted">Mã xác thực 6 chữ số vừa được gửi qua SMS đến số điện thoại <strong className="font-semibold text-brand-charcoal">{phone}</strong>. Vui lòng nhập mã để hoàn tất đăng ký.</p></div>
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void submitOtp() }}>
            <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>{digits.map((digit, index) => <input aria-label={`Chữ số OTP ${index + 1}`} autoComplete={index === 0 ? 'one-time-code' : 'off'} className="h-14 w-11 rounded-xl bg-[#f8f9fa] text-center text-xl font-semibold outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-blue-pastel-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-14" disabled={!challenge || isVerified || verifyMutation.isPending} inputMode="numeric" key={index} maxLength={1} onChange={(event) => updateDigit(index, event)} onKeyDown={(event) => handleOtpKeyDown(index, event)} ref={(element) => { inputRefs.current[index] = element }} value={digit} />)}</div>
            <div className="flex flex-col items-center justify-between gap-2 pt-1 text-xs text-brand-muted sm:flex-row"><span className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-4 w-4" />{seconds > 0 ? <>Gửi lại mã sau <strong className="text-brand-charcoal">{formatCountdown(seconds)}</strong></> : 'Bạn có thể yêu cầu mã mới'}</span><button className="font-medium text-brand-blue-ink enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-45" disabled={!challenge || isVerified || seconds > 0 || resendMutation.isPending} onClick={() => { void resendOtp() }} type="button">{resendMutation.isPending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}</button></div>
            {isVerified ? (
              <button className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-charcoal text-sm font-semibold text-white transition hover:bg-black/90 active:scale-[0.99]" onClick={() => navigate('/login')} type="button">Đến trang đăng nhập <ChevronRight aria-hidden="true" className="h-[18px] w-[18px]" /></button>
            ) : (
              <button className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-charcoal text-sm font-semibold text-white transition hover:bg-black/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60" disabled={!challenge || verifyMutation.isPending} type="submit">{verifyMutation.isPending ? 'Đang xác thực...' : 'Xác nhận & Hoàn tất tạo tài khoản'} <CheckCircle2 aria-hidden="true" className="h-[18px] w-[18px]" /></button>
            )}
          </form>
          {challenge?.developmentOtpCode && !isVerified ? <p className="mt-4 rounded-lg border border-brand-border bg-[#f8f9fa] p-3 text-xs leading-relaxed text-brand-muted" role="status">Mã OTP môi trường phát triển: <strong className="font-semibold tracking-[0.15em] text-brand-charcoal">{challenge.developmentOtpCode}</strong></p> : null}
          {message ? <p className={`mt-4 rounded-lg p-3 text-xs leading-relaxed ${message.kind === 'error' ? 'bg-red-50 text-red-700' : message.kind === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-brand-blue-pastel-soft text-brand-blue-ink'}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f8f9fa] p-3.5 text-xs leading-relaxed text-brand-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" /><p>Mã OTP có hiệu lực trong vòng <strong className="font-medium text-brand-charcoal">5 phút</strong>. Tuyệt đối không chia sẻ mã xác thực cho bất kỳ ai, bao gồm cả nhân viên hỗ trợ của ABSTRICT.</p></div>
          <div className="my-4 h-px bg-brand-border" />
          <div className="space-y-2 text-xs"><div className="flex items-center justify-between"><span className="text-brand-muted">Gặp sự cố với mã xác thực?</span><Link className="flex items-center gap-1 font-medium text-brand-blue-ink hover:underline" to="/login">Đổi phương thức <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></div><div className="flex items-center justify-between"><span className="text-brand-muted">Tổng đài hỗ trợ 24/7:</span><a className="font-semibold text-brand-charcoal" href="tel:18002278">1800-ABSTRICT <span className="font-normal text-brand-green">(Miễn phí)</span></a></div></div>
        </section>
        <div className="mt-4 flex items-center gap-3 text-[11px] text-brand-muted"><span className="flex items-center gap-1"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-brand-green" />Mã hóa bảo mật 256-bit SSL</span><span>•</span><span>ABSTRICT Identity Cloud</span></div>
      </main>
    </div>
  )
}
