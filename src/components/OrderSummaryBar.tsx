import { getPackageById } from '../data/services'
import { computeAddonTotal, computeGrandTotal } from '../lib/buildPayload'

function formatPrice(n: number | null): string {
  if (n === null) return 'Quote'
  return `$${n}`
}

export function OrderSummaryBar({
  selectedPackageId,
  selectedAddonIds,
}: {
  selectedPackageId: string
  selectedAddonIds: string[]
}) {
  const pkg = getPackageById(selectedPackageId)
  const pkgPrice = pkg?.price ?? null
  const addonTotal = computeAddonTotal(selectedAddonIds)
  const grand = computeGrandTotal(pkgPrice, addonTotal)

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
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Add-ons</dt>
          <dd className="font-medium text-cyan-200">+${addonTotal}</dd>
        </div>
        <div className="flex justify-between gap-3 border-t border-white/10 pt-1.5 text-sm">
          <dt className="font-semibold text-white">Est. total</dt>
          <dd className="font-display font-bold italic text-cyan-300">
            {grand === null ? 'Quote + add-ons' : `$${grand}`}
          </dd>
        </div>
      </dl>
    </div>
  )
}
