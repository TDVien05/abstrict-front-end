import { Link } from 'react-router-dom'
import { Phone } from 'lucide-react'
import { BrandLogo } from '../../../shared/ui/BrandLogo'

export function CustomerFooter() {
  return (
    <footer className="border-t border-brand-border bg-white px-6 py-6 text-xs text-brand-muted">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex items-center gap-2"><BrandLogo size="sm" /><span>© 2026 ABSTRICT. Dịch vụ chăm sóc căn hộ tiêu chuẩn cao.</span></div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link className="hover:text-brand-charcoal" to="/discover">Quy chuẩn an toàn</Link>
          <a className="hover:text-brand-charcoal" href="mailto:support@abstrict.vn">Trung tâm trợ giúp</a>
          <a className="inline-flex items-center gap-1.5 font-semibold text-brand-charcoal" href="tel:19006868"><Phone aria-hidden="true" className="h-3.5 w-3.5" />1900 6868</a>
        </div>
      </div>
    </footer>
  )
}
