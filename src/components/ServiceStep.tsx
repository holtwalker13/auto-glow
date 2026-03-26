import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { addons, packages, type ServicePackage } from '../data/services'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

function formatPrice(n: number | null): string {
  if (n === null) return 'Quote'
  return `$${n}`
}

function PackageCard({
  pkg,
  selected,
  onSelect,
}: {
  pkg: ServicePackage
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
              {formatPrice(pkg.price)}
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
  selectedPackageId,
  onPackageChange,
  selectedAddonIds,
  onToggleAddon,
}: {
  selectedPackageId: string
  onPackageChange: (id: string) => void
  selectedAddonIds: string[]
  onToggleAddon: (id: string) => void
}) {
  const reduce = usePrefersReducedMotion()

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="glow-divider w-16" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-slate-400">
            Choose package
          </h2>
        </div>
        <div className="space-y-3">
          {packages.map((p) => (
            <PackageCard
              key={p.id}
              pkg={p}
              selected={p.id === selectedPackageId}
              onSelect={() => onPackageChange(p.id)}
            />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <span className="glow-divider w-16" />
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-slate-400">
            Add-ons
          </h2>
        </div>
        <p className="mb-4 text-sm text-slate-500">
          À la carte extras — tap a block to toggle. Totals stay in sync with the bar below.
        </p>
        <ul className="space-y-3">
          {addons.map((a) => {
            const on = selectedAddonIds.includes(a.id)
            return (
              <li key={a.id}>
                <label
                  className={`group flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${
                    on
                      ? 'border-cyan-400/50 bg-white/[0.06] shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]'
                      : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="peer sr-only focus:outline-none"
                    checked={on}
                    onChange={() => onToggleAddon(a.id)}
                  />
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-[box-shadow] peer-focus-visible:ring-2 peer-focus-visible:ring-cyan-400/50 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-black ${
                      on
                        ? 'border-cyan-400 bg-cyan-400/20'
                        : 'border-white/25 bg-transparent'
                    }`}
                    aria-hidden
                  >
                    {on ? (
                      <motion.span
                        initial={reduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center"
                      >
                        <Check className="h-2.5 w-2.5 text-cyan-300" strokeWidth={3} aria-hidden />
                      </motion.span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-white">{a.name}</span>
                      <span className="text-sm font-semibold text-cyan-300">+${a.price}</span>
                    </span>
                    {a.description ? (
                      <span className="mt-0.5 block text-xs text-slate-500">{a.description}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
