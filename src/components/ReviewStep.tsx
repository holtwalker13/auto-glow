import { getAddonById, getPackageById, resolvePackagePrice } from '../data/services'
import { computeAddonTotal, computeGrandTotal } from '../lib/buildPayload'
import {
  labelPreferredTime,
  labelVehicleType,
  type LocationMode,
  type PreferredTimeSlot,
  type VehicleType,
} from '../types/request'

export function ReviewStep({
  contact,
  vehicleType,
  vehicleDescription,
  selectedPackageId,
  selectedAddonIds,
  locationMode,
  preferredDate,
  preferredTimeSlot,
  hasCeramicCoating,
  address,
  parkingNotes,
}: {
  contact: { name: string; phone: string; email: string; notes: string }
  vehicleType: VehicleType | ''
  vehicleDescription: string
  selectedPackageId: string
  selectedAddonIds: string[]
  locationMode: LocationMode
  preferredDate: string
  preferredTimeSlot: PreferredTimeSlot | ''
  hasCeramicCoating: boolean
  address: string
  parkingNotes: string
}) {
  const pkg = getPackageById(selectedPackageId)
  const pkgPrice = resolvePackagePrice(selectedPackageId, vehicleType)
  const addonTotal = computeAddonTotal(selectedAddonIds)
  const grand = computeGrandTotal(pkgPrice, addonTotal)

  return (
    <div className="space-y-6 text-sm">
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
          Contact
        </h3>
        <ul className="mt-2 space-y-1 text-slate-300">
          <li>{contact.name}</li>
          <li>{contact.phone}</li>
          <li>{contact.email}</li>
          {contact.notes ? <li className="text-slate-500">{contact.notes}</li> : null}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
          Vehicle
        </h3>
        <p className="mt-2 text-slate-300">{labelVehicleType(vehicleType)}</p>
        <p className="mt-2 text-slate-400">{vehicleDescription.trim() || '—'}</p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
          Package & add-ons
        </h3>
        <p className="mt-2 font-medium text-white">{pkg?.name}</p>
        <p className="text-cyan-300">{pkgPrice === null ? 'Quote' : `$${pkgPrice}`}</p>
        {selectedAddonIds.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-white/5 pt-3">
            {selectedAddonIds.map((id) => {
              const a = getAddonById(id)
              return a ? (
                <li key={id} className="flex justify-between gap-4 text-slate-400">
                  <span>{a.name}</span>
                  <span className="text-cyan-200/90">+${a.price}</span>
                </li>
              ) : null
            })}
          </ul>
        ) : (
          <p className="mt-2 text-slate-500">No add-ons selected.</p>
        )}
        <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-base font-semibold text-white">
          <span>Estimated total</span>
          <span className="font-display italic text-cyan-300">
            {grand === null ? 'Quote + add-ons' : `$${grand}`}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-cyan-400/90">
          Schedule & location
        </h3>
        <p className="mt-2 text-slate-300">
          <span className="text-slate-500">Date: </span>
          {preferredDate || '—'}
        </p>
        <p className="mt-1 text-slate-300">
          <span className="text-slate-500">Time: </span>
          {hasCeramicCoating
            ? 'All day (ceramic coating)'
            : preferredTimeSlot
              ? labelPreferredTime(preferredTimeSlot)
              : '—'}
        </p>
        <p className="mt-1 text-slate-300">
          <span className="text-slate-500">Mode: </span>
          {locationMode === 'mobile' ? 'Mobile — we come to you' : 'Drop-off — you bring it in'}
        </p>
        {locationMode === 'mobile' && address ? (
          <p className="mt-2 text-slate-400">
            <span className="text-slate-500">Address: </span>
            {address}
          </p>
        ) : null}
        {parkingNotes ? <p className="mt-1 text-slate-500">{parkingNotes}</p> : null}
      </section>
    </div>
  )
}
