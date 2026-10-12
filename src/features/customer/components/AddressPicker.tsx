import { MapPin, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { bookingErrorMessage } from '../../../entities/booking'
import { formatAddress, useCustomerAddresses, useDeleteCustomerAddress, useSaveCustomerAddress, useServiceAreas, type CustomerAddress, type SaveCustomerAddressRequest } from '../api/addresses'
import { StatusPill } from './CustomerPrimitives'

const inputClass = 'mt-1.5 h-10 w-full rounded-xl border border-brand-border bg-white px-3 text-sm font-normal text-brand-charcoal outline-none focus:border-brand-charcoal'
const labelClass = 'block text-xs font-semibold text-brand-muted'

const emptyAddress: SaveCustomerAddressRequest = { label: 'Nhà', apartmentNumber: '', floor: '', buildingName: '', streetAddress: '', ward: '', district: '', city: '', accessInstructions: '', isDefault: false }

function AddressForm({ address, onDone }: { address?: CustomerAddress; onDone: (saved?: CustomerAddress) => void }) {
  const { data: areas = [] } = useServiceAreas()
  const save = useSaveCustomerAddress()
  const [values, setValues] = useState<SaveCustomerAddressRequest>(address ?? emptyAddress)
  const cities = [...new Set(areas.filter((area) => area.isActive).map((area) => area.city))]
  const districts = [...new Set(areas.filter((area) => area.isActive && area.city === values.city).map((area) => area.district))]

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
        <label className={labelClass}>Thành phố<select className={inputClass} required value={values.city} onChange={(event) => setValues((current) => ({ ...current, city: event.target.value, district: '' }))}><option value="">Chọn thành phố</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className={labelClass}>Quận / Huyện<select className={inputClass} disabled={!values.city} required {...field('district')}><option value="">Chọn quận / huyện</option>{districts.map((district) => <option key={district}>{district}</option>)}</select></label>
        <label className={labelClass}>Phường / Xã<input className={inputClass} required {...field('ward')} /></label>
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

export function AddressPicker({ onSelect, selectedId }: { onSelect: (addressId: string) => void; selectedId: string | undefined }) {
  const { data: addresses, error, isError, isPending } = useCustomerAddresses()
  const remove = useDeleteCustomerAddress()
  const [editing, setEditing] = useState<CustomerAddress | 'new' | null>(null)

  if (isPending) return <p className="mt-4 text-sm text-brand-muted" role="status">Đang tải sổ địa chỉ...</p>
  if (isError) return <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{bookingErrorMessage(error)}</p>

  return (
    <div className="mt-4">
      {addresses.length === 0 && editing === null ? <p className="text-sm text-brand-muted">Bạn chưa lưu địa chỉ nào. Thêm địa chỉ để nhận báo giá.</p> : null}
      <ul className="space-y-3">
        {addresses.map((address) => {
          const selected = address.id === selectedId
          return (
            <li className={`rounded-xl border p-4 ${selected ? 'border-brand-purple bg-brand-50/50' : 'border-brand-border'}`} key={address.id}>
              <label className="flex cursor-pointer gap-3">
                <input checked={selected} className="mt-1 h-4 w-4 accent-brand-charcoal" name="booking-address" onChange={() => onSelect(address.id)} type="radio" />
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-charcoal"><MapPin aria-hidden="true" className="h-4 w-4 text-brand-purple" />{address.label}{address.isDefault ? <StatusPill tone="purple">Mặc định</StatusPill> : null}</span><span className="mt-1 block text-sm leading-6 text-brand-muted">{formatAddress(address)}</span>{address.accessInstructions ? <span className="block text-xs text-brand-muted">Ghi chú: {address.accessInstructions}</span> : null}</span>
              </label>
              <div className="mt-2 flex gap-4 pl-7 text-xs font-semibold"><button className="text-brand-purple hover:underline" onClick={() => setEditing(address)} type="button">Sửa</button><button className="text-red-700 hover:underline disabled:opacity-50" disabled={remove.isPending} onClick={() => remove.mutate(address.id)} type="button">Xóa</button></div>
            </li>
          )
        })}
      </ul>
      {remove.isError ? <p className="mt-3 text-xs text-red-700" role="alert">{bookingErrorMessage(remove.error)}</p> : null}
      {editing !== null
        ? <AddressForm address={editing === 'new' ? undefined : editing} key={editing === 'new' ? 'new' : editing.id} onDone={(saved) => { if (saved) onSelect(saved.id); setEditing(null) }} />
        : addresses.length < 10 ? <button className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-purple hover:underline" onClick={() => setEditing('new')} type="button"><Plus aria-hidden="true" className="h-4 w-4" />Thêm địa chỉ mới</button> : null}
    </div>
  )
}
