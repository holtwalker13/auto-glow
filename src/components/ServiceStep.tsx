import { motion } from 'framer-motion'
import {
  getFullDetailPriceRangeLabel,
  LUXURY_AUTO_GLOW_SELECTION_OPTION_IDS,
  packages,
  premiumUpsells,
  resolvePackagePrice,
  PREMIUM_UPSELL_ADDON_ID_SET,
  type ServicePackage,
} from '../data/services'
import type { VehicleType } from '../types/request'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

function formatPrice(n: number | null): string {
  if (n === null) return 'Quote'
  return `$${n}`
}

function displayPackagePrice(pkg: ServicePackage, vehicleType: VehicleType | '') {
  if (pkg.id === 'full-everything') return 'Custom quote'
  const resolved = resolvePackagePrice(pkg.id, vehicleType)
  if (resolved !== null) return formatPrice(resolved)
  if (pkg.id === 'full-detail') return getFullDetailPriceRangeLabel()
  return formatPrice(pkg.price)
}

function PackageCard({
  pkg,
  vehicleType,
  selected,
  selectedAddonIds,
  onTogglePremiumAddon,
  onSelect,
}: {
  pkg: ServicePackage
  vehicleType: VehicleType | ''
  selected: boolean
  selectedAddonIds: string[]
  onTogglePremiumAddon: (addonId: string) => void
  onSelect: () => void
}) {
  const reduce = usePrefersReducedMotion()
  const isLuxury = pkg.id === 'full-everything'
  const luxuryOptions = [
    { addonId: LUXURY_AUTO_GLOW_SELECTION_OPTION_IDS[0], title: 'Interior detail' },
    { addonId: LUXURY_AUTO_GLOW_SELECTION_OPTION_IDS[1], title: 'Exterior detail' },
    { addonId: LUXURY_AUTO_GLOW_SELECTION_OPTION_IDS[2], title: 'Full detail' },
    ...premiumUpsells.map((u) => ({ addonId: u.addonId, title: u.title })),
  ]

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-2xl border transition-colors ${
        selected
          ? 'border-cyan-400/50 bg-white/[0.06]'
          : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex w-full items-start gap-3 p-4 text-left"
      >
        <span
          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected
              ? 'border-cyan-400 bg-cyan-400/20'
              : 'border-white/25 bg-transparent'
          }`}
          aria-hidden
        >
          {selected ? (
            <motion.span
              className="h-2.5 w-2.5 rounded-full bg-cyan-300"
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
            />
          ) : null}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-lg font-semibold italic tracking-tight text-white">
              {pkg.name}
            </h3>
            <span className="text-base font-semibold text-cyan-300">
              {displayPackagePrice(pkg, vehicleType)}
            </span>
          </div>
          {pkg.tagline ? (
            <p className="mt-1 text-sm font-medium text-slate-300">{pkg.tagline}</p>
          ) : null}
        </div>
      </button>

      <details className="group border-t border-white/5 bg-black/20">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm text-cyan-200/90 marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-2">
            <span>What’s included</span>
            <span className="text-cyan-400/70 transition group-open:rotate-180">▼</span>
          </span>
        </summary>
        <div className="space-y-4 px-4 pb-4 pt-0">
          {pkg.intro ? (
            <p className="text-sm leading-relaxed text-slate-400">{pkg.intro}</p>
          ) : null}
          {pkg.sections.map((sec) => (
            <div key={sec.title}>
              <div className="mb-2 flex items-center gap-2">
                <span className="glow-divider" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {sec.title}
                </h4>
              </div>
              <ul className="space-y-2 text-sm text-slate-300">
                {sec.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan-400/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {pkg.outro ? (
            <p className="text-sm italic text-slate-500">{pkg.outro}</p>
          ) : null}
          {isLuxury ? (
            <div className="space-y-2">
              <div className="mb-2 flex items-center gap-2">
                <span className="glow-divider" />
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Select luxury upgrades
                </h4>
              </div>
              <p className="text-xs text-slate-500">
                Pick what you are interested in. We will finalize details and quote with you directly.
              </p>
              <div className="max-h-72 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                  {luxuryOptions.map((u) => {
                    const checked = selectedAddonIds.includes(u.addonId)
                  return (
                    <label
                      key={u.addonId}
                      className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                        checked
                          ? 'border-cyan-400/40 bg-cyan-500/10'
                          : 'border-white/10 bg-white/[0.03] hover:border-cyan-500/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          if (!selected) onSelect()
                          onTogglePremiumAddon(u.addonId)
                        }}
                        className="sr-only"
                      />
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                          checked
                            ? 'border-cyan-300 bg-cyan-500/20 text-cyan-100'
                            : 'border-white/30 text-transparent'
                        }`}
                        aria-hidden
                      >
                        ✓
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">{u.title}</span>
                      </span>
                    </label>
                  )
                  })}
                </div>
              </div>
              {!selected ? (
                <p className="text-[11px] text-slate-600">
                  Tap any option to auto-select Luxury Auto Glow.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </details>
    </motion.div>
  )
}

export function ServiceStep({
  vehicleType,
  selectedPackageId,
  selectedAddonIds,
  onTogglePremiumAddon,
  onPackageChange,
}: {
  vehicleType: VehicleType | ''
  selectedPackageId: string
  selectedAddonIds: string[]
  onTogglePremiumAddon: (addonId: string) => void
  onPackageChange: (id: string) => void
}) {
  const selectedPremiumCount = selectedAddonIds.filter((id) => PREMIUM_UPSELL_ADDON_ID_SET.has(id)).length
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="glow-divider w-16" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-slate-400">
            Choose package
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          Interior, Exterior, and Full Detail handle most standard appointments. Use Luxury Auto Glow
          for custom premium builds.
        </p>
        {selectedPackageId === 'full-everything' ? (
          <p className="mb-3 text-xs text-cyan-200/90">
            Luxury upgrades selected: <strong>{selectedPremiumCount}</strong>
          </p>
        ) : null}
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              vehicleType={vehicleType}
              selected={p.id === selectedPackageId}
              selectedAddonIds={selectedAddonIds}
              onTogglePremiumAddon={onTogglePremiumAddon}
              onSelect={() => onPackageChange(p.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
