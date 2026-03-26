import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { premiumUpsells } from '../data/services'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export function UpsellStep({
  selectedAddonIds,
  dismissedIds,
  onAddAddon,
  onDismiss,
}: {
  selectedAddonIds: string[]
  dismissedIds: string[]
  onAddAddon: (addonId: string) => void
  onDismiss: (premiumId: string) => void
}) {
  const reduce = usePrefersReducedMotion()
  const visible = premiumUpsells.filter((u) => !dismissedIds.includes(u.id))
  /** Ceramic coating first when present (same visual style as other upsells) */
  const ordered = [
    ...visible.filter((c) => c.id === 'premium-ceramic'),
    ...visible.filter((c) => c.id !== 'premium-ceramic'),
  ]

  return (
    <div className="space-y-4 pb-8 sm:pb-10">
      <p className="text-sm leading-relaxed text-slate-400">
        A few upgrades that pair perfectly with your package. Totally optional — your detail is
        already going to shine.
      </p>

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-center text-sm text-slate-500">
          You’ve skipped the extras for now. You can always mention add-ons when we confirm your
          appointment.
        </p>
      ) : null}

      <div className="flex flex-col gap-8">
        <AnimatePresence mode="popLayout">
          {ordered.map((card, i) => {
            const added = selectedAddonIds.includes(card.addonId)

            const shellClass = added
              ? 'relative rounded-2xl bg-gradient-to-br from-cyan-400 via-blue-600 to-sky-500 p-[2px] shadow-[0_0_48px_-8px_rgba(34,211,238,0.5)]'
              : 'shimmer-border rounded-2xl p-[1px]'

            const innerClass = added
              ? 'overflow-hidden rounded-[0.9rem] bg-zinc-950 ring-2 ring-cyan-400/50 ring-inset shadow-xl shadow-cyan-500/10'
              : 'overflow-hidden rounded-2xl bg-zinc-950/80 shadow-xl shadow-black/40'

            return (
              <motion.article
                key={card.id}
                layout
                initial={reduce ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : {
                        opacity: 0,
                        y: -20,
                        scale: 0.985,
                        transition: { duration: 0.22, ease: 'easeIn' },
                      }
                }
                transition={{
                  layout: { type: 'spring', stiffness: 420, damping: 34 },
                  opacity: { duration: reduce ? 0 : 0.28 },
                  y: { type: 'spring', stiffness: 420, damping: 34 },
                  delay: reduce ? 0 : i * 0.05,
                }}
                className={shellClass}
              >
                <div className={innerClass}>
                  <div className="relative z-[1]">
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                      <img
                        src={card.image}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <h3 className="font-display text-xl font-bold italic tracking-tight text-white drop-shadow-md">
                            {card.title}
                          </h3>
                          {card.subtitle ? (
                            <p className="mt-1 text-sm text-cyan-200/90">{card.subtitle}</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-black/50 px-3 py-1 text-sm font-semibold text-cyan-300 backdrop-blur">
                          ${card.price}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <p className="text-sm leading-relaxed text-slate-300">{card.description}</p>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Est. time:{' '}
                        <span className="font-medium text-slate-400">
                          {card.durationLabel ?? `~${card.durationMinutes} min`}
                        </span>
                      </p>

                      {card.processSteps && card.processSteps.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">
                            Our process
                          </p>
                          <div className="space-y-2">
                            {card.processSteps.map((stepItem, si) => (
                              <div
                                key={stepItem.title}
                                className="rounded-xl border border-white/10 bg-black/40 p-3"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-300">
                                    {si + 1}
                                  </span>
                                  <h4 className="text-sm font-semibold text-white">{stepItem.title}</h4>
                                </div>
                                <p className="mt-1 text-xs leading-relaxed text-slate-400 sm:text-sm">
                                  {stepItem.body}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                        {added ? (
                          <div
                            role="status"
                            className="w-full rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 p-[1.5px] shadow-lg shadow-cyan-500/20 sm:w-auto"
                          >
                            <div className="flex min-h-11 w-full items-center justify-center gap-2.5 rounded-[10px] bg-zinc-950 px-5 py-2.5">
                              <motion.span
                                className="flex shrink-0 text-cyan-400"
                                initial={reduce ? false : { scale: 0, rotate: -25 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 420,
                                  damping: 22,
                                  delay: reduce ? 0 : 0.06,
                                }}
                              >
                                <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                              </motion.span>
                              <span className="text-sm font-semibold tracking-wide text-white">
                                Added to your request
                              </span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onAddAddon(card.addonId)}
                            className="cta-gradient min-h-11 rounded-xl px-4 py-2.5 text-center text-sm font-semibold transition hover:brightness-110 active:scale-[0.98]"
                          >
                            {card.cta}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDismiss(card.id)}
                          className="text-center text-sm text-slate-500 underline decoration-slate-600 underline-offset-4 transition hover:text-slate-300"
                        >
                          No thanks
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.article>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
