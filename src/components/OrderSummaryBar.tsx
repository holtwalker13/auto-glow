import { getAddonById, getPackageById, loyaltyDiscountScopeWord, resolvePackagePrice } from '../data/services'
import type { VehicleType } from '../types/request'
import {
  computeAddonTotal,
  computeGrandTotal,
  computeLoyaltyAdjustedGrand,
  partitionAddonIdsForLoyaltyDisplay,
} from '../lib/buildPayload'

function formatPrice(n: number | null): string {
  if (n === null) return 'Quote'
  return `$${n}`
}

export function OrderSummaryBar({
  selectedPackageId,
  selectedAddonIds,
  vehicleType,
  loyaltyDiscountPercent = 0,
}: {
  selectedPackageId: string
  selectedAddonIds: string[]
  vehicleType: VehicleType | ''
  /** Punch-card % off (package + non-premium add-ons; Glow-ups excluded). */
  loyaltyDiscountPercent?: number
}) {
  const isLuxury = selectedPackageId === 'full-everything'
  const pkg = getPackageById(selectedPackageId)
  const pkgPrice = resolvePackagePrice(selectedPackageId, vehicleType)
  const addonTotal = computeAddonTotal(selectedAddonIds)
  const grand = computeGrandTotal(pkgPrice, addonTotal)
  const loyalty =
    grand != null && loyaltyDiscountPercent > 0
      ? computeLoyaltyAdjustedGrand(pkgPrice, selectedAddonIds, loyaltyDiscountPercent)
      : null
  const { eligibleAddonIds, premiumAddonIds } = partitionAddonIdsForLoyaltyDisplay(selectedAddonIds)
  const scopeWord = loyaltyDiscountScopeWord(selectedPackageId)
  const loyaltyLine =
    loyalty && loyalty.savings > 0
      ? `${Math.round(loyaltyDiscountPercent)}% off ${scopeWord}`
      : null

  return (
    <div className="mb-2 rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 to-blue-900/25 px-3 py-2.5 shadow-inner shadow-cyan-500/5">
      <h3 className="font-display text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/85">
        Order summary
      </h3>
      <dl className="mt-1.5 space-y-1 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="truncate text-slate-400">{pkg?.name ?? 'Package'}</dt>
          <dd className="shrink-0 font-medium text-white">{formatPrice(pkgPrice)}</dd>
        </div>
        {eligibleAddonIds.map((id) => {
          const a = getAddonById(id)
          if (!a) return null
          return (
            <div key={id} className="flex justify-between gap-2 pl-1">
              <dt className="min-w-0 truncate text-slate-500">{a.name}</dt>
              <dd className="shrink-0 font-medium text-cyan-200/90">
                {isLuxury ? 'Selected' : `+$${a.price}`}
              </dd>
            </div>
          )
        })}
        {loyaltyLine && loyalty ? (
          <div className="flex justify-between gap-3 border-t border-white/10 pt-1 text-emerald-200/95">
            <dt className="truncate">Loyalty — {loyaltyLine}</dt>
            <dd className="shrink-0 font-medium">−${loyalty.savings}</dd>
          </div>
        ) : null}
        {premiumAddonIds.length > 0 ? (
          <>
            <div className="border-t border-white/5 pt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Glow-ups (full price)
            </div>
            {premiumAddonIds.map((id) => {
              const a = getAddonById(id)
              if (!a) return null
              return (
                <div key={id} className="flex justify-between gap-2 pl-1">
                  <dt className="min-w-0 truncate text-slate-500">{a.name}</dt>
                  <dd className="shrink-0 font-medium text-cyan-200/90">
                    {isLuxury ? 'Selected' : `+$${a.price}`}
                  </dd>
                </div>
              )
            })}
          </>
        ) : null}
        <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5 text-sm">
          <dt className="font-semibold text-white">Est. total</dt>
          <dd className="font-display font-bold italic text-cyan-300">
            {isLuxury
              ? 'Custom quote'
              : grand === null
              ? 'Quote + add-ons'
              : loyalty && loyalty.savings > 0
                ? `$${loyalty.grandAfterLoyalty ?? grand}`
                : `$${grand}`}
          </dd>
        </div>
      </dl>
    </div>
  )
}
