import { motion } from 'framer-motion'
import { ShieldCheck, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export function CustomerDataConsentModal({
  open,
  context,
  onAccept,
  onDecline,
}: {
  open: boolean
  context: 'new' | 'returning'
  onAccept: () => void
  onDecline: () => void
}) {
  const reduce = usePrefersReducedMotion()
  const titleId = useId()
  const [consentChecked, setConsentChecked] = useState(false)

  useEffect(() => {
    if (!open) return
    setConsentChecked(false)
  }, [open])

  useEffect(() => {
    if (!open || typeof document === 'undefined') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const canAccept = consentChecked
  const intro =
    context === 'new'
      ? 'Quick summary below—then check the box to start booking.'
      : 'Your phone ties to your punch card and booking. Skim the summary, then check the box to continue.'

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/85 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4">
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
        aria-labelledby={titleId}
        initial={reduce ? false : { y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative z-[71] flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-zinc-950 shadow-2xl shadow-black/50 sm:max-h-[85dvh] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_-10%,rgba(56,189,248,0.08),transparent)]" />
        <button
          type="button"
          onClick={onDecline}
          className="absolute right-2.5 top-2.5 z-10 rounded-lg border border-white/10 bg-black/50 p-2 text-slate-400 hover:bg-white/10 hover:text-white sm:right-3 sm:top-3"
          aria-label="Close without accepting"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        <div className="relative shrink-0 border-b border-white/10 px-4 pb-3 pt-7 sm:px-6 sm:pt-8">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/90 to-sky-700 shadow-lg shadow-cyan-950/40">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2} aria-hidden />
          </div>
          <h2
            id={titleId}
            className="text-center font-display text-xl font-semibold italic tracking-tight text-white sm:text-2xl"
          >
            Privacy &amp; messaging consent
          </h2>
          <p className="mt-1.5 text-center text-sm leading-snug text-slate-400">{intro}</p>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
            <div className="space-y-3 text-xs leading-snug text-slate-400 sm:text-[13px] sm:leading-relaxed">
              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  How you sign in
                </h3>
                <p>
                  Your <strong className="font-medium text-slate-200">mobile number</strong> links to
                  your customer record and rewards. It’s{' '}
                  <strong className="font-medium text-slate-200">not</strong> a bank PIN—keep it
                  current and treat your phone like access to your booking info.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  What we collect here
                </h3>
                <p>
                  What you enter: name, phone, optional email, vehicle details, service address (for
                  mobile visits), scheduling preferences, notes, and loyalty fields when you return.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Payments
                </h3>
                <p>
                  <strong className="font-medium text-slate-200">
                    No card or bank data runs through this app.
                  </strong>{' '}
                  Paying for services is between you and Jackson Auto Glow outside this form.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Messages
                </h3>
                <p>
                  We may <strong className="font-medium text-slate-200">text or call</strong> you about
                  appointments, arrivals, updates, and loyalty. Rates may apply, including for promotional
                  texts when you proceed.
                </p>
              </section>

              <section>
                <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300">
                  Your choices
                </h3>
                <p>
                  Don’t continue if you disagree—you’ll stay on the previous screen. Privacy rights vary
                  by location; contact Jackson Auto Glow for requests.
                </p>
              </section>

              <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] leading-snug text-slate-500">
                Plain-language summary for transparency—not legal advice or a full privacy policy.
              </p>
            </div>
          </div>

          <div className="relative shrink-0 border-t border-white/10 bg-zinc-950 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_32px_rgba(0,0,0,0.45)] sm:px-6 sm:pb-4 sm:pt-3.5">
            <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Confirm to continue
            </p>
            <label className="flex cursor-pointer gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-cyan-500/25 sm:gap-3 sm:p-3.5">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-black text-cyan-500 focus:ring-cyan-400/50"
              />
              <span className="text-sm leading-snug text-slate-200">
                I acknowledge the summary above and agree to proceed on those terms.
              </span>
            </label>

            <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:flex-row-reverse sm:justify-end">
              <button
                type="button"
                onClick={onAccept}
                disabled={!canAccept}
                className="min-h-11 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-4 text-sm font-semibold text-white shadow-lg shadow-cyan-950/35 transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-12 sm:min-w-[140px] sm:flex-1"
              >
                Accept &amp; continue
              </button>
              <button
                type="button"
                onClick={onDecline}
                className="min-h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-slate-300 hover:bg-white/10 sm:min-h-12 sm:w-auto sm:min-w-[120px]"
              >
                Decline
              </button>
            </div>
            <p className="mt-2 text-center text-[10px] leading-snug text-slate-600 sm:text-[11px]">
              Accepting is required to book online. You can still contact Jackson Auto Glow directly.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
