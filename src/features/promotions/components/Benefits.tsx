import { Check, Plus, X } from 'lucide-react'
import { useRef } from 'react'

export const MAX_BENEFITS = 10
export const MAX_BENEFIT_LENGTH = 200

// Hiển thị quyền lợi của gói: mỗi mục một dấu tích để quét nhanh.
export function BenefitList({ benefits, className = '' }: { benefits: string[]; className?: string }) {
  if (benefits.length === 0) return null
  return (
    <ul className={`space-y-2.5 text-sm ${className}`}>
      {benefits.map((benefit) => (
        <li className="flex items-start gap-2.5" key={benefit}>
          <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-3.5" strokeWidth={3} /></span>
          <span>{benefit}</span>
        </li>
      ))}
    </ul>
  )
}

// Nhập quyền lợi: mỗi quyền lợi một ô riêng; Enter thêm ô mới, nút × xóa ô. Dòng trống bị bỏ khi lưu (xem `cleanBenefits`).
export function BenefitsEditor({ onChange, value }: { onChange: (next: string[]) => void; value: string[] }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const items = value.length === 0 ? [''] : value
  const canAdd = items.length < MAX_BENEFITS

  function update(index: number, text: string) {
    onChange(items.map((item, i) => (i === index ? text : item)))
  }

  function add(after: number) {
    if (!canAdd) return
    const next = [...items.slice(0, after + 1), '', ...items.slice(after + 1)]
    onChange(next)
    setTimeout(() => refs.current[after + 1]?.focus(), 0)
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <fieldset className="rounded-xl border border-brand-border p-3">
      <legend className="px-1 text-sm font-semibold">Quyền lợi của gói <span className="font-normal text-brand-muted">({items.filter((x) => x.trim()).length}/{MAX_BENEFITS})</span></legend>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li className="flex items-center gap-2" key={index}>
            <span aria-hidden className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check className="size-3.5" strokeWidth={3} /></span>
            <input
              aria-label={`Quyền lợi ${index + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-charcoal"
              maxLength={MAX_BENEFIT_LENGTH}
              onChange={(event) => update(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  if (item.trim()) add(index)
                }
              }}
              placeholder="Ví dụ: Ưu tiên hiển thị trong khu vực nhận ca"
              ref={(element) => { refs.current[index] = element }}
              value={item}
            />
            <button aria-label={`Xóa quyền lợi ${index + 1}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-slate-100 hover:text-red-700" onClick={() => remove(index)} type="button"><X className="size-4" /></button>
          </li>
        ))}
      </ul>
      <button className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-charcoal disabled:cursor-not-allowed disabled:text-brand-muted" disabled={!canAdd} onClick={() => add(items.length - 1)} type="button"><Plus className="size-4" />Thêm quyền lợi</button>
    </fieldset>
  )
}

export function cleanBenefits(value: string[]) {
  return value.map((item) => item.trim()).filter(Boolean)
}
