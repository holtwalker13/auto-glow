import { motion } from 'framer-motion'
import { Sparkles, X } from 'lucide-react'
import { resolvePackagePrice } from '../data/services'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import type { VehicleType } from '../types/request'

export function FullEverythingUpsellModal({
  open,
  vehicleType,
  onAccept,
  onDecline,
}: {
  open: boolean
  vehicleType: VehicleType | ''
  onAccept: () => void
  onDecline: () => void
}) {
  const reduce = usePrefersReducedMotion()
  const bundlePrice = resolvePackagePrice('full-everything', vehicleType)
  const priceLabel = bundlePrice != null ? `$${bundlePrice}` : '—'

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        aria-hidden
        onClick={onDecline}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="full-everything-title"
        initial={reduce ? false : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className="relative z-[71] w-full max-w-md overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.08] via-zinc-950 to-zinc-950 shadow-2xl shadow-cyan-950/25"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(34,211,238,0.12),transparent)]" />
        <button
          type="button"
          onClick={onDecline}
          className="absolute right-3 top-3 z-10 rounded-lg border border-white/10 bg-black/40 p-2 text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="relative px-5 pb-6 pt-8 text-center sm:px-6 sm:pt-10">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-sky-700 shadow-lg shadow-cyan-900/35">
            <Sparkles className="h-7 w-7 text-white" strokeWidth={2} aria-hidden />
          </div>
          <h2
            id="full-everything-title"
            className="font-display text-2xl font-bold italic tracking-tight text-white"
          >
            Go Full Everything?
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            You&apos;re stacking a lot of love on this detail. Our{' '}
            <strong className="text-cyan-200/85">Full Everything</strong> bundle wraps the big-ticket
            interior + exterior work into <strong className="text-white">one simple price</strong>.
          </p>
          <p className="mt-4 font-display text-3xl font-bold italic text-cyan-200/90">{priceLabel}</p>
          <p className="mt-1 text-xs text-slate-500">Limited-time bundle pricing · Glow-up add-ons stay separate</p>

          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={onDecline}
              className="min-h-12 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-300 hover:bg-white/10 sm:flex-1"
            >
              No thanks
            </button>
            <button
              type="button"
              onClick={onAccept}
              className="min-h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 text-sm font-bold text-white shadow-lg shadow-cyan-950/40 transition hover:brightness-110 sm:flex-1"
            >
              Upgrade to Full Everything
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
