import { ChevronDown, X } from 'lucide-react'
import { useId, useState, type KeyboardEvent } from 'react'

export interface ComboboxOption {
  value: string
  label: string
  /** Ghi chú nhỏ bên phải, ví dụ "chưa phục vụ". */
  hint?: string
}

interface ComboboxProps {
  className?: string
  disabled?: boolean
  emptyText?: string
  onChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  value: string
}

// Gõ "ho chi minh" hay "quan 1" vẫn khớp "Hồ Chí Minh", "Quận 1".
function fold(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().trim()
}

/** Ô chọn có thể gõ để lọc. Giá trị rỗng nghĩa là chưa chọn. */
export function Combobox({ className = '', disabled = false, emptyText = 'Không có kết quả phù hợp', onChange, options, placeholder, value }: ComboboxProps) {
  const listId = useId()
  // `null` = đang đóng; chuỗi = đang mở và lọc theo nội dung người dùng gõ.
  const [query, setQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const isOpen = query !== null
  const selectedLabel = options.find((option) => option.value === value)?.label ?? value
  const filtered = query ? options.filter((option) => fold(option.label).includes(fold(query))) : options

  function choose(next: string) {
    onChange(next)
    setQuery(null)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) setQuery('')
      else if (filtered.length > 0) setActiveIndex((current) => (current + (event.key === 'ArrowDown' ? 1 : filtered.length - 1)) % filtered.length)
    } else if (event.key === 'Enter' && isOpen) {
      event.preventDefault()
      if (filtered[activeIndex]) choose(filtered[activeIndex].value)
    } else if (event.key === 'Escape') {
      setQuery(null)
    }
  }

  return (
    <span className="relative block">
      <input
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={isOpen}
        autoComplete="off"
        className={`${className} w-full pr-16 disabled:cursor-not-allowed disabled:bg-slate-100`}
        disabled={disabled}
        onBlur={() => setQuery(null)}
        onChange={(event) => { setQuery(event.target.value); setActiveIndex(0) }}
        onFocus={() => { setQuery(''); setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value))) }}
        onKeyDown={handleKeyDown}
        placeholder={isOpen && value ? selectedLabel : placeholder}
        role="combobox"
        value={isOpen ? query : selectedLabel}
      />
      {/* onMouseDown chặn blur của ô nhập để cú bấm kịp được xử lý. */}
      {value && !disabled ? <button aria-label="Xóa lựa chọn" className="absolute right-10 top-1/2 -translate-y-1/2 rounded p-0.5 text-brand-muted hover:text-brand-charcoal" onClick={() => choose('')} onMouseDown={(event) => event.preventDefault()} tabIndex={-1} type="button"><X aria-hidden="true" className="h-3.5 w-3.5" /></button> : null}
      <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} strokeWidth={1.8} />
      {isOpen ? (
        <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-xl border border-brand-border bg-white p-1 text-sm font-normal shadow-lg" id={listId} role="listbox">
          {filtered.length === 0 ? <li className="px-3 py-2 text-brand-muted">{emptyText}</li> : filtered.map((option, index) => (
            <li
              aria-selected={option.value === value}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 ${index === activeIndex ? 'bg-slate-100' : ''} ${option.value === value ? 'font-semibold text-brand-charcoal' : 'text-brand-charcoal'}`}
              key={option.value}
              onClick={() => choose(option.value)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              ref={index === activeIndex ? (element) => { element?.scrollIntoView?.({ block: 'nearest' }) } : undefined}
              role="option"
            >
              <span>{option.label}</span>
              {option.hint ? <span className="shrink-0 text-xs font-normal text-brand-muted">{option.hint}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  )
}
