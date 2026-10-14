import { MapPin, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { bookingErrorMessage } from '../../../entities/booking'
import { formatAddress, useCustomerAddresses, useDeleteCustomerAddress, useAdministrativeDivisions, useAdministrativeWards, useSaveCustomerAddress, type CustomerAddress, type SaveCustomerAddressRequest } from '../api/addresses'
import { StatusPill } from './CustomerPrimitives'
import { Select } from '../../../shared/ui/Select'

const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal'
const labelClass = 'block text-xs font-semibold text-brand-muted'

const emptyAddress: SaveCustomerAddressRequest = { label: 'Nhà', apartmentNumber: '', floor: '', buildingName: '', streetAddress: '', ward: '', district: '', city: '', accessInstructions: '', isDefault: false }

function AddressForm({ address, onDone }: { address?: CustomerAddress; onDone: (saved?: CustomerAddress) => void }) {
  const divisions = useAdministrativeDivisions()
  const save = useSaveCustomerAddress()
  const [values, setValues] = useState<SaveCustomerAddressRequest>(address ?? emptyAddress)
  const province = divisions.data?.find((division) => division.name === values.city)
  const districts = province?.districts ?? []
  const district = districts.find((item) => item.name === values.district)
  const wards = useAdministrativeWards(province?.code, district?.code)
  const wardOptions = wards.data ?? []
  // Không chặn người dùng lưu địa chỉ khi không có danh sách phường/xã: server trả [], lỗi,
  // hoặc quận/huyện đang lưu không có trong danh mục (dữ liệu nhập tay trước đây).
  const wardIsFreeText = Boolean(values.district) && (wards.isError || (wards.isSuccess && wardOptions.length === 0) || (!district && !divisions.isPending))
  // Phường/xã đã lưu mà không có trong danh sách vẫn được giữ làm một lựa chọn, không tự đổi sang giá trị khác.
  const savedWardMissing = Boolean(values.ward) && wards.isSuccess && !wardOptions.some((ward) => ward.name === values.ward)

  function field(name: keyof SaveCustomerAddressRequest) {
    return { value: (values[name] as string | null) ?? '', onChange: (event: { target: { value: string } }) => setValues((current) => ({ ...current, [name]: event.target.value })) }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    save.mutate(
      { ...values, id: address?.id, floor: values.floor?.trim() || null, accessInstructions: values.accessInstructions?.trim() || null },
      { onSuccess: (saved) => onDone(saved) },
    )
  }

  return (
    <form className="mt-4 rounded-xl border border-brand-border bg-[#f7f8fa] p-4" onSubmit={submit}>
      <p className="text-sm font-semibold text-brand-charcoal">{address ? 'Sửa địa chỉ' : 'Thêm địa chỉ mới'}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Tên gợi nhớ<input className={inputClass} maxLength={50} required {...field('label')} /></label>
        <label className={labelClass}>Số căn hộ<input className={inputClass} placeholder="A-1205" required {...field('apartmentNumber')} /></label>
        <label className={labelClass}>Tầng<input className={inputClass} {...field('floor')} /></label>
        <label className={labelClass}>Tòa nhà / Chung cư<input className={inputClass} required {...field('buildingName')} /></label>
        <label className={`${labelClass} sm:col-span-2`}>Số nhà, tên đường<input className={inputClass} required {...field('streetAddress')} /></label>
        <label className={labelClass}>Tỉnh / Thành phố<Select className={inputClass} required value={values.city} onChange={(event) => setValues((current) => ({ ...current, city: event.target.value, district: '', ward: '' }))}><option value="">{divisions.isPending ? 'Đang tải...' : 'Chọn tỉnh / thành phố'}</option>{divisions.data?.map((division) => <option key={division.code}>{division.name}</option>)}</Select></label>
        <label className={labelClass}>Quận / Huyện<Select className={inputClass} disabled={!values.city} onChange={(event) => setValues((current) => ({ ...current, district: event.target.value, ward: '' }))} required value={values.district}><option value="">Chọn quận / huyện</option>{districts.map((item) => <option key={item.code} value={item.name}>{item.name}{item.isServed ? '' : ' (chưa phục vụ)'}</option>)}</Select></label>
        {district && !district.isServed ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:col-span-2">ABSTRICT chưa có dịch vụ tại {district.name}. Bạn vẫn lưu được địa chỉ này nhưng chưa đặt lịch được ở đây.</p> : null}
        {divisions.isError ? <p className="text-xs text-red-700 sm:col-span-2" role="alert">Không tải được danh sách tỉnh/thành. {bookingErrorMessage(divisions.error)}</p> : null}
        <label className={labelClass}>Phường / Xã{wardIsFreeText
          ? <input className={inputClass} placeholder="Nhập tên phường / xã" required {...field('ward')} />
          : <Select className={inputClass} disabled={!values.district} required {...field('ward')}><option value="">{values.district && wards.isPending ? 'Đang tải...' : 'Chọn phường / xã'}</option>{savedWardMissing ? <option>{values.ward}</option> : null}{wardOptions.map((ward) => <option key={ward.code}>{ward.name}</option>)}</Select>}</label>
        <label className={labelClass}>Hướng dẫn vào nhà<input className={inputClass} placeholder="Gọi lễ tân, gửi xe ở hầm B1..." {...field('accessInstructions')} /></label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-xs text-brand-muted"><input checked={values.isDefault} className="h-4 w-4 accent-brand-charcoal" onChange={(event) => setValues((current) => ({ ...current, isDefault: event.target.checked }))} type="checkbox" />Đặt làm địa chỉ mặc định</label>
      {save.isError ? <p className="mt-3 text-xs text-red-700" role="alert">{bookingErrorMessage(save.error)}</p> : null}
      <div className="mt-4 flex gap-2">
        <button className="inline-flex h-10 items-center rounded-xl bg-brand-charcoal px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-50" disabled={save.isPending} type="submit">{save.isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}</button>
        <button className="inline-flex h-10 items-center rounded-xl px-4 text-sm font-semibold text-brand-muted hover:bg-slate-100" onClick={() => onDone()} type="button">Hủy</button>
      </div>
    </form>
  )
}

// Không truyền onSelect thì đây là sổ địa chỉ chỉ để quản lý (trang hồ sơ), không có ô chọn.
export function AddressPicker({ onSelect, selectedId }: { onSelect?: (addressId: string) => void; selectedId?: string }) {
  const { data: addresses, error, isError, isPending } = useCustomerAddresses()
  const remove = useDeleteCustomerAddress()
  const [editing, setEditing] = useState<CustomerAddress | 'new' | null>(null)

  if (isPending) return <p className="mt-4 text-sm text-brand-muted" role="status">Đang tải sổ địa chỉ...</p>
  if (isError) return <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>

  return (
    <div className="mt-4">
      {addresses.length === 0 && editing === null ? <p className="text-sm text-brand-muted">{onSelect ? 'Bạn chưa lưu địa chỉ nào. Thêm địa chỉ để nhận báo giá.' : 'Bạn chưa lưu địa chỉ nào.'}</p> : null}
      <ul className="space-y-3">
        {addresses.map((address) => {
          const selected = address.id === selectedId
          return (
            <li className={`rounded-xl border p-4 ${selected ? 'border-brand-purple bg-brand-50/50' : 'border-brand-border'}`} key={address.id}>
              <label className={`flex gap-3 ${onSelect ? 'cursor-pointer' : ''}`}>
                {onSelect ? <input checked={selected} className="mt-1 h-4 w-4 accent-brand-charcoal" name="booking-address" onChange={() => onSelect(address.id)} type="radio" /> : null}
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-charcoal"><MapPin aria-hidden="true" className="h-4 w-4 text-brand-purple" />{address.label}{address.isDefault ? <StatusPill tone="purple">Mặc định</StatusPill> : null}</span><span className="mt-1 block text-sm leading-6 text-brand-muted">{formatAddress(address)}</span>{address.accessInstructions ? <span className="block text-xs text-brand-muted">Ghi chú: {address.accessInstructions}</span> : null}</span>
              </label>
              <div className={`mt-2 flex gap-4 text-xs font-semibold ${onSelect ? 'pl-7' : ''}`}><button className="text-brand-purple hover:underline" onClick={() => setEditing(address)} type="button">Sửa</button><button className="text-red-700 hover:underline disabled:opacity-50" disabled={remove.isPending} onClick={() => remove.mutate(address.id)} type="button">Xóa</button></div>
            </li>
          )
        })}
      </ul>
      {remove.isError ? <p className="mt-3 text-xs text-red-700" role="alert">{bookingErrorMessage(remove.error)}</p> : null}
      {editing !== null
        ? <AddressForm address={editing === 'new' ? undefined : editing} key={editing === 'new' ? 'new' : editing.id} onDone={(saved) => { if (saved) onSelect?.(saved.id); setEditing(null) }} />
        : addresses.length < 10 ? <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline" onClick={() => setEditing('new')} type="button"><Plus aria-hidden="true" className="h-4 w-4" />Thêm địa chỉ mới</button> : null}
    </div>
  )
}
