import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import {
  getSubAddonsForPackage,
  packageUsesTwoPhaseSubAddons,
  subAddonsExterior,
  subAddonsInterior,
} from '../data/services'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'
import { useState } from 'react'

export function SubAddonsModal({
  open,
  packageId,
  selectedAddonIds,
  onToggleAddon,
  onSkipAll,
  onComplete,
}: {
  open: boolean
  packageId: string
  selectedAddonIds: string[]
  onToggleAddon: (id: string) => void
  onSkipAll: () => void
  onComplete: () => void
}) {
  const reduce = usePrefersReducedMotion()
  const [phase, setPhase] = useState(0)
  const twoPhase = packageUsesTwoPhaseSubAddons(packageId)
  const allForPkg = getSubAddonsForPackage(packageId)

  if (!open || allForPkg.length === 0) return null

  const currentList = twoPhase
    ? phase === 0
      ? subAddonsExterior
      : subAddonsInterior
    : packageId === 'exterior-detail'
      ? subAddonsExterior
      : packageId === 'interior-detail'
        ? subAddonsInterior
        : subAddonsExterior

  const title =
    twoPhase && phase === 0
      ? 'Exterior extras'
      : twoPhase && phase === 1
        ? 'Interior extras'
        : packageId === 'exterior-detail'
          ? 'Exterior extras'
          : packageId === 'interior-detail'
            ? 'Interior extras'
            : 'Add-ons'

  const subtitle =
    twoPhase && phase === 0
      ? 'Optional — like choosing toppings after your base.'
      : twoPhase && phase === 1
        ? 'Almost there — cabin upgrades are optional too.'
        : 'Quick picks — all optional.'

  function clearCurrentGroup() {
    for (const a of currentList) {
      if (selectedAddonIds.includes(a.id)) onToggleAddon(a.id)
    }
  }

  function handleCloseEntireModal() {
    onSkipAll()
    onComplete()
  }

  function handleFooterSkip() {
    if (twoPhase && phase === 0) {
      clearCurrentGroup()
      setPhase(1)
      return
    }
    if (twoPhase && phase === 1) {
      clearCurrentGroup()
      onSkipAll()
      onComplete()
      return
    }
    clearCurrentGroup()
    onSkipAll()
    onComplete()
  }

  function handleContinue() {
    if (twoPhase && phase === 0) {
      setPhase(1)
      return
    }
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 sm:items-center sm:p-4"
      role="presentation"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
        aria-hidden
        onClick={handleCloseEntireModal}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subaddons-title"
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 36 }}
        className="relative z-[61] flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col rounded-t-3xl border border-cyan-500/25 bg-zinc-950 shadow-2xl shadow-cyan-950/30 sm:max-h-[85vh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-4 sm:px-5">
          <div>
            <h2 id="subaddons-title" className="font-display text-lg font-bold italic text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-slate-500 sm:text-sm">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={handleCloseEntireModal}
            className="rounded-lg border border-white/10 p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            aria-label="Skip and close"
          >
            <X className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
          <AnimatePresence mode="wait">
            <motion.ul
              key={`${packageId}-${phase}`}
              initial={reduce ? false : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -12 }}
              className="space-y-2"
            >
              {currentList.map((a) => {
                const checked = selectedAddonIds.includes(a.id)
                return (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 transition hover:border-cyan-500/30 hover:bg-white/[0.05] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cyan-400/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleAddon(a.id)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-400/50"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-white">{a.name}</span>
                        <span className="text-xs text-cyan-300/90">+${a.price}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </motion.ul>
          </AnimatePresence>
        </div>

        {twoPhase ? (
          <div className="flex gap-2 border-t border-white/10 px-4 py-3 sm:px-5">
            <div className="flex flex-1 gap-1">
              {['Exterior', 'Interior'].map((label, i) => (
                <div
                  key={label}
                  className={`h-1 flex-1 rounded-full ${i <= phase ? 'bg-gradient-to-r from-cyan-400 to-blue-600' : 'bg-white/10'}`}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-white/10 px-4 py-4 sm:flex-row sm:px-5">
          <button
            type="button"
            onClick={handleFooterSkip}
            className="min-h-12 rounded-xl border border-white/15 px-4 text-sm font-medium text-slate-300 hover:bg-white/5 sm:flex-1"
          >
            {twoPhase && phase === 0 ? 'Skip exterior' : 'Skip all'}
          </button>
          <button
            type="button"
            onClick={handleContinue}
            className="cta-gradient min-h-12 rounded-xl px-4 text-sm font-semibold sm:flex-1"
          >
            {twoPhase && phase === 0 ? 'Continue' : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
