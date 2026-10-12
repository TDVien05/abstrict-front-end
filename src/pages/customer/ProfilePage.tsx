import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImageUp, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../../features/auth/auth-context'
import { initialsOf } from '../../features/customer/api/freelancers'
import { avatarAccept, avatarErrorMessage, avatarFileProblem, deleteAvatar, uploadAvatar, useAvatarImage, useCustomerProfile } from '../../features/customer/api/profile'
import { AddressPicker } from '../../features/customer/components/AddressPicker'
import { CustomerCard, CustomerContainer } from '../../features/customer/components/CustomerPrimitives'
import { vnDateLabel } from '../../shared/lib/vn-time'

const secondaryButton = 'inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-brand-border bg-white px-4 text-sm font-semibold text-brand-charcoal hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export function ProfilePage() {
  const { updateUser, user } = useAuth()
  const queryClient = useQueryClient()
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileProblem, setFileProblem] = useState<string | null>(null)
  const { data: profile } = useCustomerProfile()
  // Phiên đăng nhập chỉ có hồ sơ tại thời điểm đăng nhập; GET /customer/profile là bản mới nhất.
  const fullName = profile?.fullName ?? user?.displayName ?? ''
  const phoneNumber = profile?.phoneNumber ?? user?.phoneNumber ?? ''
  const avatarUrl = profile ? profile.avatarUrl : user?.avatarUrl
  const avatar = useAvatarImage(avatarUrl)
  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ['customer', 'profile'] })
  const upload = useMutation({ mutationFn: uploadAvatar, onSuccess: (result) => { updateUser({ avatarUrl: result.avatarUrl }); void refreshProfile() } })
  const remove = useMutation({ mutationFn: deleteAvatar, onSuccess: () => { updateUser({ avatarUrl: null }); void refreshProfile() } })
  const avatarBusy = upload.isPending || remove.isPending
  const avatarError = fileProblem ?? (upload.isError ? avatarErrorMessage(upload.error) : remove.isError ? avatarErrorMessage(remove.error) : null)

  // Thanh trên cùng đọc tên và ảnh từ phiên, nên phiên được đồng bộ theo hồ sơ vừa tải.
  useEffect(() => {
    if (profile) updateUser({ displayName: profile.fullName, phoneNumber: profile.phoneNumber, avatarUrl: profile.avatarUrl })
  }, [profile, updateUser])

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

  return (
    <main className="pb-20">
      <CustomerContainer className="py-8 sm:py-12">
        <p className="text-sm font-semibold text-brand-purple">Tài khoản</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Hồ sơ của tôi</h1>

        <div className="mt-8 grid max-w-5xl gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <CustomerCard className="h-fit p-6 text-center">
            {avatar
              ? <img alt="Ảnh đại diện" className="mx-auto h-28 w-28 rounded-full object-cover" src={avatar} />
              : <span className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-brand-purple text-3xl font-semibold text-white">{initialsOf(fullName)}</span>}
            <input accept={avatarAccept} aria-label="Chọn ảnh đại diện" className="sr-only" onChange={pickFile} ref={fileInput} type="file" />
            <div className="mt-5 flex flex-col gap-2">
              <button className={secondaryButton} disabled={avatarBusy} onClick={() => fileInput.current?.click()} type="button"><ImageUp aria-hidden="true" className="h-4 w-4" />{upload.isPending ? 'Đang tải ảnh lên...' : avatarUrl ? 'Đổi ảnh đại diện' : 'Thêm ảnh đại diện'}</button>
              {avatarUrl ? <button className={`${secondaryButton} text-red-700`} disabled={avatarBusy} onClick={removeAvatar} type="button"><Trash2 aria-hidden="true" className="h-4 w-4" />{remove.isPending ? 'Đang xóa...' : 'Xóa ảnh'}</button> : null}
            </div>
            <p className="mt-3 text-xs text-brand-muted">JPG hoặc PNG, tối đa 5 MB.</p>
            {avatarError ? <p className="mt-2 text-xs text-red-700" role="alert">{avatarError}</p> : null}
          </CustomerCard>

          <div className="space-y-6">
            <CustomerCard className="p-6">
              <h2 className="text-lg font-semibold">Thông tin cá nhân</h2>
              <dl className="mt-4 text-sm">
                <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-brand-border py-3"><dt className="text-brand-muted">Họ và tên</dt><dd className="font-semibold">{fullName}</dd></div>
                <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-b border-brand-border py-3"><dt className="text-brand-muted">Số điện thoại</dt><dd className="font-semibold">{phoneNumber}</dd></div>
                {profile ? <div className="flex flex-wrap justify-between gap-x-6 gap-y-1 py-3"><dt className="text-brand-muted">Tham gia từ</dt><dd className="font-semibold first-letter:uppercase">{vnDateLabel(profile.createdAtUtc)}</dd></div> : null}
              </dl>
              <p className="mt-3 text-xs text-brand-muted">Họ tên và số điện thoại hiện chưa đổi được tại đây. Cần hỗ trợ, liên hệ <a className="font-semibold text-brand-purple hover:underline" href="mailto:support@abstrict.vn">support@abstrict.vn</a>.</p>
            </CustomerCard>

            <CustomerCard className="p-6">
              <h2 className="text-lg font-semibold">Sổ địa chỉ</h2>
              <p className="mt-1 text-sm text-brand-muted">Tối đa 10 địa chỉ. Địa chỉ mặc định được chọn sẵn khi bạn đặt lịch.</p>
              <AddressPicker />
            </CustomerCard>
          </div>
        </div>
      </CustomerContainer>
    </main>
  )
}
