import { motion } from 'framer-motion'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

export function SuccessScreen({
  pendingInQueue = false,
  onStartNew,
}: {
  pendingInQueue?: boolean
  onStartNew: () => void
}) {
  const reduce = usePrefersReducedMotion()

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
            Your request is in our queue while we check the calendar—we’ll still text you to confirm.
          </>
        ) : null}
      </p>

      <div className="mt-8 w-full rounded-2xl border border-cyan-500/20 bg-white/[0.04] p-5 text-left">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500">What happens next</p>
        <ol className="mt-3 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-200 marker:font-semibold marker:text-cyan-400">
          <li>{`We'll reach out via text to confirm your listing.`}</li>
          <li>{`Your car will be 'Glowing' in no time.`}</li>
        </ol>
      </div>

      <div className="mt-8 w-full sm:flex sm:justify-center">
        <button
          type="button"
          onClick={onStartNew}
          className="cta-gradient min-h-11 w-full rounded-xl px-4 py-2.5 text-sm font-semibold sm:w-auto sm:min-w-[200px]"
        >
          New request
        </button>
      </div>
    </div>
  )
}
