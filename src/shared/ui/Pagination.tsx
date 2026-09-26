interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ onPageChange, page, totalPages }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <nav aria-label="Phân trang" className="flex items-center justify-center gap-3">
      <button
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Trang trước
      </button>
      <span className="text-sm text-slate-600">
        Trang {page} / {totalPages}
      </span>
      <button
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-40"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Trang sau
      </button>
    </nav>
  )
}
