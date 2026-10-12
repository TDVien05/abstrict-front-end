import { useMutation } from '@tanstack/react-query'
import { ImageUp, Trash2 } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useAuth } from '../../features/auth/auth-context'
import { initialsOf } from '../../features/customer/api/freelancers'
import { avatarAccept, avatarErrorMessage, avatarFileProblem, deleteAvatar, updateProfile, uploadAvatar, useAvatarImage } from '../../features/customer/api/profile'
import { CustomerCard, CustomerContainer } from '../../features/customer/components/CustomerPrimitives'
import { ApiError } from '../../shared/api/problem-details'

const inputClass = 'mt-1.5 h-11 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal disabled:bg-slate-100 disabled:text-brand-muted'
const secondaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

function profileErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404 || error.status === 405) return 'Máy chủ chưa hỗ trợ cập nhật họ tên.'
    return Object.values(error.problem.errors ?? {}).flat()[0] ?? error.message
  }
  return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
}

export function ProfilePage() {
  const { updateUser, user } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState(user?.displayName ?? '')
  const [fileProblem, setFileProblem] = useState<string | null>(null)
  const avatar = useAvatarImage(user?.avatarUrl)
  // Hồ sơ chỉ được trả lúc đăng nhập, nên phiên được cập nhật từ response của từng thao tác.
  const save = useMutation({ mutationFn: updateProfile, onSuccess: (profile) => updateUser({ displayName: profile.fullName }) })
  const upload = useMutation({ mutationFn: uploadAvatar, onSuccess: (result) => updateUser({ avatarUrl: result.avatarUrl }) })
  const remove = useMutation({ mutationFn: deleteAvatar, onSuccess: () => updateUser({ avatarUrl: null }) })
  const avatarBusy = upload.isPending || remove.isPending
  const avatarError = fileProblem ?? (upload.isError ? avatarErrorMessage(upload.error) : remove.isError ? avatarErrorMessage(remove.error) : null)
  const trimmedName = fullName.trim()
  const nameChanged = trimmedName !== (user?.displayName ?? '')

  function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    remove.reset()
    upload.reset()
    const problem = avatarFileProblem(file)
    setFileProblem(problem)
    if (!problem) upload.mutate(file)
  }

  function removeAvatar() {
    setFileProblem(null)
    upload.reset()
    remove.mutate()
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate({ fullName: trimmedName })
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-brand-purple">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Hồ sơ của tôi</h1>

        <div className="mt-8 grid max-w-4xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <CustomerCard className="h-fit p-6 text-center">
            {avatar
              ? <img alt="Ảnh đại diện" className="mx-auto h-28 w-28 rounded-full object-cover" src={avatar} />
              : <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-brand-purple text-3xl font-semibold text-white">{initialsOf(user?.displayName ?? '')}</span>}
            <input accept={avatarAccept} aria-label="Chọn ảnh đại diện" className="sr-only" onChange={pickFile} ref={fileInput} type="file" />
            <div className="mt-5 flex flex-col gap-2">
              <button className={secondaryButton} disabled={avatarBusy} onClick={() => fileInput.current?.click()} type="button"><ImageUp aria-hidden="true" className="h-4 w-4" />{upload.isPending ? 'Đang tải ảnh lên...' : user?.avatarUrl ? 'Đổi ảnh đại diện' : 'Thêm ảnh đại diện'}</button>
              {user?.avatarUrl ? <button className={`${secondaryButton} text-red-700`} disabled={avatarBusy} onClick={removeAvatar} type="button"><Trash2 aria-hidden="true" className="h-4 w-4" />{remove.isPending ? 'Đang xóa...' : 'Xóa ảnh'}</button> : null}
            </div>
            <p className="mt-3 text-xs text-brand-muted">JPG hoặc PNG, tối đa 5 MB.</p>
            {avatarError ? <p className="mt-2 text-xs text-red-700" role="alert">{avatarError}</p> : null}
          </CustomerCard>

          <CustomerCard className="p-6">
            <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
            <form className="mt-5 space-y-4" onSubmit={submit}>
              <label className="block text-xs font-semibold text-brand-muted">Họ và tên<input autoComplete="name" className={inputClass} maxLength={100} minLength={2} onChange={(event) => { setFullName(event.target.value); save.reset() }} required value={fullName} /></label>
              <label className="block text-xs font-semibold text-brand-muted">Số điện thoại<input className={inputClass} disabled value={user?.phoneNumber ?? ''} /><span className="mt-1.5 block font-normal">Số điện thoại dùng để đăng nhập nên chưa đổi được tại đây.</span></label>
              {save.isError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{profileErrorMessage(save.error)}</p> : null}
              {save.isSuccess && !nameChanged ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800" role="status">Đã lưu thay đổi.</p> : null}
              <button className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-charcoal px-5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50" disabled={!nameChanged || trimmedName.length < 2 || save.isPending} type="submit">{save.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </form>
          </CustomerCard>
        </div>
      </CustomerContainer>
    </main>
  )
}
