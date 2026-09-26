import { zodResolver } from '@hookform/resolvers/zod'
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

export function SignInPage() {
  const navigate = useNavigate()
  const [isReadyForApi, setIsReadyForApi] = useState(false)
  const { formState: { errors, isSubmitting }, getValues, handleSubmit, register } = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })

  return (
    <AuthPage>
      <section className="w-full max-w-[440px] rounded-2xl border border-brand-border bg-white p-8 shadow-sm sm:p-10">
        <div className="mb-7"><h1 className="text-2xl font-semibold tracking-[-0.025em] text-brand-charcoal">Đăng nhập</h1><p className="mt-1.5 text-sm leading-relaxed text-brand-muted">Nhập thông tin đăng nhập để quản lý lịch hẹn và dịch vụ của bạn.</p></div>
        <form className="flex flex-col gap-5" noValidate onSubmit={handleSubmit(() => setIsReadyForApi(true))}>
          <label className="block text-xs font-semibold text-brand-charcoal">Số điện thoại<span className="relative mt-1.5 flex items-center"><span className="pointer-events-none absolute left-3.5 flex items-center gap-1 text-sm font-medium text-brand-muted"><span className="text-xs">🇻🇳</span>+84</span><input autoComplete="tel" className={`${inputClass} pl-[4.5rem]`} inputMode="tel" placeholder="090 123 4567" {...register('phone')} /></span><FieldError message={errors.phone?.message} /></label>
          <div><div className="mb-1.5 flex items-center justify-between"><span className="text-xs font-semibold text-brand-charcoal">Mật khẩu</span><a className="text-xs font-medium text-brand-blue-ink hover:underline" href="mailto:support@abstrict.vn">Quên mật khẩu?</a></div><PasswordField autoComplete="current-password" error={errors.password?.message} label="" placeholder="••••••••" registration={register('password')} /></div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-brand-muted"><input className="h-4 w-4 accent-brand-charcoal" defaultChecked type="checkbox" />Ghi nhớ đăng nhập</label>
          <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-charcoal text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] disabled:opacity-60" disabled={isSubmitting} type="submit">Đăng nhập <ArrowRight aria-hidden="true" className="h-[18px] w-[18px]" /></button>
          <button className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-brand-muted transition-colors hover:text-brand-charcoal" onClick={() => navigate('/verify-otp', { state: { phone: getValues('phone') } })} type="button"><MessageSquareText aria-hidden="true" className="h-4 w-4" />Đăng nhập nhanh bằng mã OTP SMS</button>
          {isReadyForApi ? <p className="rounded-lg bg-brand-blue-pastel-soft p-3 text-xs leading-relaxed text-brand-blue-ink" role="status">Thông tin đã hợp lệ và sẵn sàng gửi đến API đăng nhập.</p> : null}
          <div className="h-px bg-brand-border" />
          <p className="text-center text-xs text-brand-muted">Chưa có tài khoản? <Link className="ml-1 font-semibold text-brand-charcoal transition-colors hover:text-brand-blue-ink" to="/register">Đăng ký ngay</Link></p>
        </form>
      </section>
    </AuthPage>
  )
}

export function SignUpPage() {
  const navigate = useNavigate()
  const { formState: { errors, isSubmitting }, handleSubmit, register } = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  return (
    <AuthPage centeredHeader>
      <section className="w-full max-w-[460px] rounded-2xl border border-brand-border bg-white p-7 shadow-[0_2px_12px_rgba(0,0,0,0.03)] sm:p-9">
        <div className="mb-6"><h1 className="text-2xl font-semibold tracking-[-0.025em] text-brand-charcoal">Tạo tài khoản</h1><p className="mt-1.5 text-sm leading-relaxed text-brand-muted">Tạo tài khoản để đặt lịch và quản lý dịch vụ thuận tiện hơn.</p></div>
        <form className="space-y-4" noValidate onSubmit={handleSubmit((values) => navigate('/verify-otp', { state: { phone: values.phone } }))}>
          <label className="block text-[13px] font-medium text-brand-charcoal">Họ và tên <span className="text-red-600">*</span><input autoComplete="name" className={`${inputClass} mt-1.5`} placeholder="Nguyễn Thu Hà" {...register('fullName')} /><FieldError message={errors.fullName?.message} /></label>
          <label className="block text-[13px] font-medium text-brand-charcoal"><span className="flex items-center justify-between"><span>Số điện thoại <span className="text-red-600">*</span></span><span className="text-[11px] font-normal text-brand-muted">Nhận mã OTP qua SMS</span></span><input autoComplete="tel" className={`${inputClass} mt-1.5`} inputMode="tel" placeholder="090 123 4567" {...register('phone')} /><FieldError message={errors.phone?.message} /></label>
          <PasswordField autoComplete="new-password" error={errors.password?.message} label="Mật khẩu *" placeholder="Tối thiểu 8 ký tự kèm chữ và số" registration={register('password')} />
          <PasswordField autoComplete="new-password" error={errors.confirmPassword?.message} label="Xác nhận mật khẩu *" placeholder="Nhập lại mật khẩu vừa tạo" registration={register('confirmPassword')} />
          <div className="pt-1"><label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-5 text-brand-muted"><input className="mt-0.5 h-4 w-4 shrink-0 accent-brand-charcoal" type="checkbox" {...register('acceptsTerms')} /><span>Tôi đồng ý với <a className="font-medium text-brand-charcoal hover:underline" href="#terms">Điều khoản dịch vụ</a> và <a className="font-medium text-brand-charcoal hover:underline" href="#privacy">Chính sách quyền riêng tư</a> của ABSTRICT.</span></label><FieldError message={errors.acceptsTerms?.message} /></div>
          <div className="pt-2"><button className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand-charcoal text-sm font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] disabled:opacity-60" disabled={isSubmitting} type="submit">Tạo tài khoản</button></div>
          <div className="flex items-start gap-2 rounded-lg border border-brand-border bg-[#f8f9fa] p-3 text-xs leading-4 text-brand-muted"><Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-charcoal" /><span>Mã xác thực OTP sẽ được gửi qua SMS sau khi bạn nhấn <strong>Tạo tài khoản</strong>.</span></div>
          <p className="pt-2 text-center text-[13px] text-brand-muted">Đã có tài khoản ABSTRICT? <Link className="ml-1 font-semibold text-brand-charcoal hover:underline" to="/login">Đăng nhập ngay</Link></p>
        </form>
      </section>
    </AuthPage>
  )
}

function formatCountdown(seconds: number) {
  return `00:${String(seconds).padStart(2, '0')}`
}

export function OtpVerificationPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const phone = (location.state as { phone?: string } | null)?.phone?.trim() || '090 123 4567'
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [seconds, setSeconds] = useState(45)
  const [message, setMessage] = useState('')
  const inputRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (seconds <= 0) return
    const timer = window.setInterval(() => setSeconds((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearInterval(timer)
  }, [seconds])

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

  function submitOtp() {
    setMessage(digits.every(Boolean) ? 'Mã đã đủ 6 chữ số và sẵn sàng gửi đến API xác thực.' : 'Vui lòng nhập đủ 6 chữ số trong mã xác thực.')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 py-8 text-brand-charcoal">
      <main className="flex w-full max-w-[460px] flex-col items-center">
        <div className="mb-3 flex w-full items-center justify-between text-xs text-brand-muted"><button className="inline-flex items-center gap-1.5 transition-colors hover:text-brand-charcoal" onClick={() => navigate('/register')} type="button"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Quay lại sửa số điện thoại</button><span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-medium">Bước 2 / 2</span></div>
        <section className="w-full rounded-2xl bg-white p-6 shadow-sm sm:p-9">
          <div className="mb-4 flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue-pastel-soft text-brand-blue-ink"><ShieldCheck aria-hidden="true" className="h-6 w-6" /></span><span className="flex items-center gap-1.5 rounded-full bg-[#f8f9fa] px-2.5 py-1 text-[11px] font-medium text-brand-muted"><span className="h-2 w-2 animate-pulse rounded-full bg-brand-blue-pastel-hover" />Chờ nhập OTP</span></div>
          <div className="mb-6 space-y-1.5"><h1 className="text-2xl font-semibold tracking-[-0.025em]">Xác thực số điện thoại</h1><p className="text-sm leading-relaxed text-brand-muted">Mã xác thực 6 chữ số vừa được gửi qua SMS đến số điện thoại <strong className="font-semibold text-brand-charcoal">{phone}</strong>. Vui lòng nhập mã để hoàn tất đăng ký.</p></div>
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submitOtp() }}>
            <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>{digits.map((digit, index) => <input aria-label={`Chữ số OTP ${index + 1}`} autoComplete={index === 0 ? 'one-time-code' : 'off'} className="h-14 w-11 rounded-xl bg-[#f8f9fa] text-center text-xl font-semibold outline-none transition focus:bg-white focus:ring-2 focus:ring-brand-blue-pastel-hover sm:w-14" inputMode="numeric" key={index} maxLength={1} onChange={(event) => updateDigit(index, event)} onKeyDown={(event) => handleOtpKeyDown(index, event)} ref={(element) => { inputRefs.current[index] = element }} value={digit} />)}</div>
            <div className="flex flex-col items-center justify-between gap-2 pt-1 text-xs text-brand-muted sm:flex-row"><span className="flex items-center gap-1.5"><Clock3 aria-hidden="true" className="h-4 w-4" />Gửi lại mã sau <strong className="text-brand-charcoal">{formatCountdown(seconds)}</strong></span><button className="font-medium text-brand-blue-ink enabled:hover:underline disabled:cursor-not-allowed disabled:opacity-45" disabled={seconds > 0} onClick={() => { setSeconds(45); setMessage('Mã xác thực mới đã sẵn sàng được gửi khi API được kết nối.') }} type="button">Gửi lại qua Zalo ZNS / SMS</button></div>
            <button className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-charcoal text-sm font-semibold text-white transition hover:bg-black/90 active:scale-[0.99]" type="submit">Xác nhận & Hoàn tất tạo tài khoản <CheckCircle2 aria-hidden="true" className="h-[18px] w-[18px]" /></button>
          </form>
          {message ? <p className="mt-4 rounded-lg bg-brand-blue-pastel-soft p-3 text-xs leading-relaxed text-brand-blue-ink" role="status">{message}</p> : null}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-[#f8f9fa] p-3.5 text-xs leading-relaxed text-brand-muted"><ShieldCheck aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] shrink-0" /><p>Mã OTP có hiệu lực trong vòng <strong className="font-medium text-brand-charcoal">5 phút</strong>. Tuyệt đối không chia sẻ mã xác thực cho bất kỳ ai, bao gồm cả nhân viên hỗ trợ của ABSTRICT.</p></div>
          <div className="my-4 h-px bg-brand-border" />
          <div className="space-y-2 text-xs"><div className="flex items-center justify-between"><span className="text-brand-muted">Gặp sự cố với mã xác thực?</span><Link className="flex items-center gap-1 font-medium text-brand-blue-ink hover:underline" to="/login">Đổi phương thức <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></div><div className="flex items-center justify-between"><span className="text-brand-muted">Tổng đài hỗ trợ 24/7:</span><a className="font-semibold text-brand-charcoal" href="tel:18002278">1800-ABSTRICT <span className="font-normal text-brand-green">(Miễn phí)</span></a></div></div>
        </section>
        <div className="mt-4 flex items-center gap-3 text-[11px] text-brand-muted"><span className="flex items-center gap-1"><LockKeyhole aria-hidden="true" className="h-3.5 w-3.5 text-brand-green" />Mã hóa bảo mật 256-bit SSL</span><span>•</span><span>ABSTRICT Identity Cloud</span></div>
      </main>
    </div>
  )
}
