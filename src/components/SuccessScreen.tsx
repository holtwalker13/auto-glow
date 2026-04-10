import { motion } from 'framer-motion'
import type { RequestPayload } from '../types/request'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export function SuccessScreen({
  payload,
  pendingInQueue = false,
  onStartNew,
}: {
  payload: RequestPayload
  pendingInQueue?: boolean
  onStartNew: () => void
}) {
  const reduce = usePrefersReducedMotion()

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-10 text-center">
      <motion.div
        initial={reduce ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 shadow-lg shadow-cyan-500/25"
        aria-hidden
      >
        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24">
          <motion.path
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            stroke="currentColor"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>

      <h2 className="font-display text-2xl font-bold italic tracking-tight text-white">
        Request received
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        Thanks for choosing Jackson Auto Glow.
        {pendingInQueue ? (
          <>
            {' '}
            Your request is in our queue — we’ll confirm your date and time before anything is added
            to the calendar.
          </>
        ) : (
          <> We’ll reach out to confirm your date, location, and any final details.</>
        )}
      </p>

      <div className="mt-8 w-full rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-4 text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Reference</p>
        <p className="mt-1 font-mono text-sm text-cyan-300 break-all">
          {payload.clientReferenceId}
        </p>
      </div>

      <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={copyJson}
          className="min-h-11 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Copy request (JSON)
        </button>
        <button
          type="button"
          onClick={onStartNew}
          className="cta-gradient min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          New request
        </button>
      </div>
    </div>
  )
}
