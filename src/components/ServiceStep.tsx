import { motion } from 'framer-motion'
import {
  packages,
  resolvePackagePrice,
  type ServicePackage,
} from '../data/services'
import type { VehicleType } from '../types/request'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

function formatPrice(n: number | null): string {
  if (n === null) return 'Quote'
  return `$${n}`
}

function displayPackagePrice(pkg: ServicePackage, vehicleType: VehicleType | '') {
  const resolved = resolvePackagePrice(pkg.id, vehicleType)
  if (resolved !== null) return formatPrice(resolved)
  if (pkg.id === 'full-detail') return '$225–$295'
  return formatPrice(pkg.price)
}

function PackageCard({
  pkg,
  vehicleType,
  selected,
  onSelect,
}: {
  pkg: ServicePackage
  vehicleType: VehicleType | ''
  selected: boolean
  onSelect: () => void
}) {
  const reduce = usePrefersReducedMotion()

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
        </div>
      </details>
    </motion.div>
  )
}

export function ServiceStep({
  vehicleType,
  selectedPackageId,
  onPackageChange,
}: {
  vehicleType: VehicleType | ''
  selectedPackageId: string
  onPackageChange: (id: string) => void
}) {
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
          More upgrades are available on the next step (Glow-ups).
        </p>
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              vehicleType={vehicleType}
              selected={p.id === selectedPackageId}
              onSelect={() => onPackageChange(p.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
