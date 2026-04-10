export function CustomerGateScreen({
  onNewCustomer,
  onReturningCustomer,
}: {
  onNewCustomer: () => void
  onReturningCustomer: () => void
}) {
  return (
    <div className="space-y-8 pt-2">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold italic tracking-tight text-white sm:text-3xl">
          Book with Jackson Auto Glow
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Tell us how you would like to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
        <button
          type="button"
          onClick={onNewCustomer}
          className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-cyan-500/35 bg-gradient-to-b from-cyan-500/15 to-white/5 px-5 py-6 text-center transition hover:border-cyan-400/50 hover:from-cyan-500/25"
        >
          <span className="text-lg font-semibold text-white">New customer</span>
          <span className="mt-2 text-xs leading-relaxed text-slate-400">
            First time here or booking without signing in.
          </span>
        </button>
        <button
          type="button"
          onClick={onReturningCustomer}
          className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-emerald-500/35 bg-gradient-to-b from-emerald-500/15 to-white/5 px-5 py-6 text-center transition hover:border-emerald-400/50 hover:from-emerald-500/25"
        >
          <span className="text-lg font-semibold text-white">Returning customer</span>
          <span className="mt-2 text-xs leading-relaxed text-slate-400">
            Look up rewards with your phone number.
          </span>
        </button>
      </div>
    </div>
  )
}
