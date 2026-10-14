import type { SetURLSearchParams } from 'react-router-dom'
import { Button } from '../../../shared/ui/Button'
import { Select } from '../../../shared/ui/Select'

interface DiscoveryFiltersProps {
  searchParams: URLSearchParams
  setSearchParams: SetURLSearchParams
}

export function DiscoveryFilters({ searchParams, setSearchParams }: DiscoveryFiltersProps) {
  function updateFilter(name: string, value: string) {
    const next = new URLSearchParams(searchParams)

    if (value) next.set(name, value)
    else next.delete(name)

    next.set('page', '1')
    setSearchParams(next)
  }

  return (
    <section aria-label="Bộ lọc đối tác" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Khu vực
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          defaultValue={searchParams.get('location') ?? ''}
          onBlur={(event) => updateFilter('location', event.currentTarget.value.trim())}
          placeholder="Ví dụ: Quận 1"
        />
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Loại đối tác
        <Select
          className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          onChange={(event) => updateFilter('type', event.currentTarget.value)}
          value={searchParams.get('type') ?? ''}
        >
          <option value="">Tất cả</option>
          <option value="freelancer">Freelancer</option>
          <option value="company">Công ty</option>
        </Select>
      </label>
      <label className="grid gap-2 text-sm font-semibold text-slate-700">
        Ngày cần đặt
        <input
          className="rounded-xl border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          onChange={(event) => updateFilter('date', event.currentTarget.value)}
          type="date"
          value={searchParams.get('date') ?? ''}
        />
      </label>
      <Button className="self-end" onClick={() => setSearchParams({ page: '1', pageSize: '12' })} variant="secondary">
        Xóa bộ lọc
      </Button>
    </section>
  )
}
