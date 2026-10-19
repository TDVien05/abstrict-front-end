import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, MapPin, MessageSquare, Star, Timer } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { initialsOf, useFreelancer, useFreelancerRatings } from '../../features/customer/api/freelancers'
import { CustomerCard, CustomerContainer, SectionHeading, StatusPill } from '../../features/customer/components/CustomerPrimitives'
import { ApiError } from '../../shared/api/problem-details'
import { formatVnd } from '../../shared/lib/format-currency'
import { vnDateTime } from '../../shared/lib/vn-time'

export function CustomerProviderPage() {
  const { providerId } = useParams()
  const { data: provider, error, isError, isPending } = useFreelancer(providerId)
  const ratings = useFreelancerRatings(providerId, 10)

  if (isPending) {
    return <main className="pb-20"><CustomerContainer className="py-10"><p className="text-sm text-brand-muted" role="status">Đang tải hồ sơ đối tác...</p></CustomerContainer></main>
  }

  if (isError || !provider) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <main className="pb-20"><CustomerContainer className="py-10">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/discover"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách đối tác</Link>
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{notFound ? 'Không tìm thấy hồ sơ đối tác này hoặc hồ sơ chưa được duyệt.' : error instanceof Error ? error.message : 'Không tải được hồ sơ đối tác.'}</p>
      </CustomerContainer></main>
    )
  }

  return (
    <main className="pb-20">
      <CustomerContainer className="py-6 sm:py-8">
        <div className="mb-5">
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-brand-muted hover:text-brand-charcoal" to="/discover">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />Danh sách đối tác
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── Cột trái: thông tin hồ sơ ── */}
          <div className="space-y-6">
            {/* Hero */}
            <CustomerCard className="overflow-hidden p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
                <div className="relative shrink-0">
                  <span className="flex h-28 w-28 items-center justify-center rounded-2xl bg-brand-charcoal text-3xl font-semibold text-white">{initialsOf(provider.displayName)}</span>
                  <span className="absolute -bottom-2 -right-2 rounded-lg bg-brand-purple p-1.5 text-white"><BadgeCheck aria-hidden="true" className="h-4 w-4" /></span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    <StatusPill tone="purple">Freelancer</StatusPill>
                    {provider.isAcceptingBookings ? <StatusPill tone="green">Đang nhận đặt lịch</StatusPill> : <StatusPill tone="neutral">Tạm nghỉ nhận đơn</StatusPill>}
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-brand-charcoal">{provider.displayName}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-brand-muted">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-amber-700"><Star className="h-4 w-4 fill-amber-400 text-amber-400" />{provider.averageRating} ({provider.ratingCount} đánh giá)</span>
                    <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{provider.completedBookingCount} ca hoàn thành</span>
                    <span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4" />{provider.experienceYears} năm kinh nghiệm</span>
                  </div>
                  {provider.bio ? <p className="mt-4 text-sm leading-6 text-brand-muted">{provider.bio}</p> : null}
                </div>
              </div>
            </CustomerCard>

            {/* Dịch vụ & bảng giá (chỉ đọc) */}
            <CustomerCard className="p-6 sm:p-8">
              <SectionHeading description="Giá theo giờ do đối tác niêm yết." title="Dịch vụ & bảng giá" />
              {provider.services.length === 0
                ? <p className="mt-5 text-sm text-brand-muted">Đối tác chưa mở dịch vụ nào.</p>
                : (
                  <ul className="mt-5 space-y-3">
                    {provider.services.map((item) => (
                      <li className="flex items-start justify-between gap-4 rounded-xl border border-brand-border p-4" key={item.code}>
                        <div>
                          <p className="font-semibold text-brand-charcoal">{item.name}</p>
                          {item.description ? <p className="mt-1 text-xs leading-5 text-brand-muted">{item.description}</p> : null}
                        </div>
                        <strong className="shrink-0 text-sm text-brand-charcoal">{formatVnd(item.hourlyRateVnd)}<span className="font-normal text-brand-muted">/giờ</span></strong>
                      </li>
                    ))}
                  </ul>
                )}
            </CustomerCard>

            {/* Đánh giá từ khách hàng */}
            <CustomerCard className="p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <SectionHeading
                  description={provider.ratingCount > 0 ? `${provider.ratingCount} lượt đánh giá · điểm trung bình ${provider.averageRating}/5` : 'Chưa có đánh giá nào.'}
                  title="Đánh giá từ khách hàng"
                />
                {provider.averageRating > 0 && (
                  <div className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-amber-50 px-3 py-2">
                    <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                    <span className="text-xl font-semibold text-amber-900">{provider.averageRating}</span>
                  </div>
                )}
              </div>
              {ratings.isPending ? (
                <p className="mt-5 text-sm text-brand-muted" role="status">Đang tải đánh giá...</p>
              ) : ratings.isError || !ratings.data?.items.length ? (
                <p className="mt-5 text-sm text-brand-muted">Chưa có đánh giá nào.</p>
              ) : (
                <ul className="mt-5 divide-y divide-slate-100">
                  {ratings.data.items.map((r) => (
                    <li className="py-4 first:pt-0 last:pb-0" key={r.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < r.score ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300'}`} />
                          ))}
                        </div>
                        <time className="shrink-0 text-xs text-brand-muted" dateTime={r.publishedAtUtc}>{vnDateTime(r.publishedAtUtc)}</time>
                      </div>
                      {r.comment ? (
                        <p className="mt-2 flex gap-2 text-sm leading-6 text-brand-charcoal">
                          <MessageSquare aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-muted" />
                          {r.comment}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs italic text-brand-muted">Không có nhận xét.</p>
                      )}
                      <p className="mt-1 text-xs text-brand-muted">Đơn #{r.bookingNumber}</p>
                    </li>
                  ))}
                </ul>
              )}
              {(ratings.data?.totalPages ?? 0) > 1 && (
                <p className="mt-4 text-xs text-brand-muted">Hiển thị 10 đánh giá gần nhất trong tổng số {ratings.data?.totalItems}.</p>
              )}
            </CustomerCard>

            {/* Khu vực phục vụ */}
            <CustomerCard className="p-6 sm:p-8">
              <SectionHeading description="Khu vực đối tác nhận phục vụ." title="Khu vực phục vụ" />
              {provider.serviceAreas.length === 0
                ? <p className="mt-5 text-sm text-brand-muted">Đối tác chưa cập nhật khu vực phục vụ.</p>
                : (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {provider.serviceAreas.map((area) => (
                      <li className="flex gap-3 rounded-xl bg-[#f7f8fa] p-4" key={area.id}>
                        <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-brand-purple" />
                        <div>
                          <p className="text-sm font-semibold text-brand-charcoal">{area.district}, {area.city}</p>
                          {area.wardOrComplex ? <p className="text-xs text-brand-muted">{area.wardOrComplex}</p> : null}
                          <p className="mt-1 text-xs text-brand-muted">Bán kính di chuyển {area.travelRadiusKm} km</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </CustomerCard>
          </div>

          {/* ── Cột phải: CTA đặt lịch ── */}
          <aside className="lg:sticky lg:top-24 lg:h-fit">
            <CustomerCard className="p-5 sm:p-6">
              <p className="text-xs font-semibold text-brand-purple">Đặt ca dọn dẹp</p>
              <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em]">{provider.displayName}</h2>
              <div className="mt-4 space-y-2 text-sm text-brand-muted">
                <div className="flex items-center gap-2"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><span className="font-semibold text-brand-charcoal">{provider.averageRating}</span> · {provider.ratingCount} đánh giá</div>
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{provider.completedBookingCount} ca hoàn thành</div>
              </div>
              {provider.services.length > 0 && (
                <div className="mt-4 rounded-xl bg-[#f7f8fa] p-3 text-sm">
                  <p className="text-xs text-brand-muted">Giá từ</p>
                  <p className="mt-1 font-semibold text-brand-charcoal">
                    {formatVnd(Math.min(...provider.services.map((s) => s.hourlyRateVnd)))}<span className="font-normal text-brand-muted">/giờ</span>
                  </p>
                </div>
              )}
              <div className="my-5 h-px bg-brand-border" />
              {provider.isAcceptingBookings ? (
                <Link
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black"
                  to={`/book/${provider.providerId}`}
                >
                  Đặt lịch ngay <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-brand-muted">Đối tác hiện chưa nhận đặt lịch.</p>
              )}
            </CustomerCard>
          </aside>
        </div>
      </CustomerContainer>
    </main>
  )
}
