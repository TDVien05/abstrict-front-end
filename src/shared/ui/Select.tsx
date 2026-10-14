import { ChevronDown } from 'lucide-react'
import { useState, type ComponentProps } from 'react'

// Khoảng cách ngoài phải nằm trên khung bọc, nếu không mũi tên sẽ lệch khỏi tâm ô chọn.
const isOuterSpacing = (token: string) => /^(?:[a-z0-9]+:)?-?m[trblxy]?-/.test(token)

/**
 * Ô chọn gốc của trình duyệt với mũi tên riêng, xoay khi danh sách đang mở (cùng kiểu với ô tìm kiếm ở trang chủ).
 * Dùng thay thẻ `select`: nhận nguyên các thuộc tính và `className` của nó.
 */
export function Select({ children, className = '', onBlur, onChange, onKeyDown, onPointerDown, ...props }: ComponentProps<'select'>) {
  const [isOpen, setIsOpen] = useState(false)
  const tokens = className.split(/\s+/).filter(Boolean)

  return (
    <span className={`relative block ${tokens.filter(isOuterSpacing).join(' ')}`}>
      <select
        {...props}
        className={`${tokens.filter((token) => !isOuterSpacing(token)).join(' ')} w-full appearance-none pr-11`}
        onBlur={(event) => { setIsOpen(false); onBlur?.(event) }}
        onChange={(event) => { setIsOpen(false); onChange?.(event) }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') setIsOpen(true)
          if (event.key === 'Escape') setIsOpen(false)
          onKeyDown?.(event)
        }}
        onPointerDown={(event) => { setIsOpen((current) => !current); onPointerDown?.(event) }}
      >
        {children}
      </select>
      <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
    </span>
  )
}
