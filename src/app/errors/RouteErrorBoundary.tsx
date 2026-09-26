import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { Button } from '../../shared/ui/Button'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Đã xảy ra lỗi không xác định.'

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-4">
      <div className="max-w-lg text-center">
        <p className="text-base font-semibold text-brand-purple">Có lỗi xảy ra</p>
        <h1 className="page-title mt-4">Không thể hiển thị trang</h1>
        <p className="page-intro mt-6">{message}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          Thử lại
        </Button>
        <Link className="ml-4 text-sm font-semibold text-brand-700" to="/">
          Về trang chủ
        </Link>
      </div>
    </main>
  )
}
