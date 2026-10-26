import jsQR from 'jsqr'
import { useEffect, useRef, useState } from 'react'

function cameraProblem(error: unknown) {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Bạn chưa cho phép dùng camera. Hãy cấp quyền cho trang này hoặc nhập mã thủ công.'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy camera trên thiết bị này. Hãy nhập mã thủ công.'
  return 'Không mở được camera. Hãy thử lại hoặc nhập mã thủ công.'
}

// Quét liên tục tới khi đọc được mã đầu tiên rồi gọi onScan một lần. Camera luôn được tắt khi đóng hoặc rời trang.
export function QrScanner({ onCancel, onScan }: { onCancel: () => void; onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const supported = Boolean(navigator.mediaDevices?.getUserMedia)
  const [error, setError] = useState<string | null>(supported ? null : 'Trình duyệt hoặc kết nối hiện tại không cho dùng camera (cần HTTPS). Hãy nhập mã thủ công.')
  const [ready, setReady] = useState(false)
  const onScanRef = useRef(onScan)

  useEffect(() => { onScanRef.current = onScan })

  useEffect(() => {
    if (!supported) return

    let stopped = false
    let frame = 0
    let stream: MediaStream | null = null
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { willReadFrequently: true })

    function tick() {
      const video = videoRef.current
      if (stopped || !video || !context) return
      if (video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, canvas.width, canvas.height)
        const image = context.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' })
        if (code?.data) {
          stopped = true
          onScanRef.current(code.data)
          return
        }
      }
      frame = window.requestAnimationFrame(tick)
    }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        const video = videoRef.current
        if (!video) return
        video.srcObject = media
        void video.play().catch(() => undefined)
        setReady(true)
        frame = window.requestAnimationFrame(tick)
      })
      .catch((cause: unknown) => { if (!stopped) setError(cameraProblem(cause)) })

    return () => {
      stopped = true
      window.cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [supported])

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : (
        <div className="relative overflow-hidden rounded-xl bg-black">
          <video aria-label="Camera quét mã QR" className="aspect-square w-full object-cover" muted playsInline ref={videoRef} />
          {!ready ? <p className="absolute inset-0 flex items-center justify-center text-sm text-white" role="status">Đang mở camera...</p> : null}
          <span aria-hidden="true" className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80" />
        </div>
      )}
      <button className="text-sm font-semibold text-brand-purple hover:underline" onClick={onCancel} type="button">Đóng camera</button>
    </div>
  )
}
