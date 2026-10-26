import { useProtectedImageUrl } from '../api/protected-image'

export function ProtectedImage({ alt, className = '', contentUrl }: { alt: string; className?: string; contentUrl: string }) {
  const { data: src, isError, isPending } = useProtectedImageUrl(contentUrl)

  if (isPending) return <div aria-busy="true" className={`animate-pulse rounded-xl bg-slate-100 ${className}`} role="status"><span className="sr-only">Đang tải ảnh...</span></div>
  if (isError || !src) return <div className={`flex items-center justify-center rounded-xl bg-red-50 p-3 text-center text-xs text-red-700 ${className}`} role="alert">Không tải được ảnh.</div>

  return (
    <a href={src} rel="noreferrer" target="_blank" title="Mở ảnh lớn trong tab mới">
      <img alt={alt} className={`rounded-xl object-cover ${className}`} src={src} />
    </a>
  )
}
