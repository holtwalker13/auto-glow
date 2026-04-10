import { useState, type FormEvent } from 'react'
import { formatUsPhoneInput, phoneDigitsOnly } from '../lib/formatUsPhone'
import { firstNameFromFullName } from '../lib/personName'

export type LoyaltyLookupResult = {
  recognized: boolean
  completedPunches: number
  punchesOnCard: number
  maxPunches: number
  nextDiscountPercent: number
  tierLabels: string[]
  message: string
  /** First name from job history (for greetings). */
  firstName: string
  contactHint: { name: string; email: string }
}

export function ReturningCustomerLoyaltyScreen({
  initialPhone,
  welcomeFirstNameHint,
  onBack,
  onContinueToBooking,
  onWelcomeNameResolved,
}: {
  initialPhone: string
  /** e.g. when coming back from booking with contact already filled */
  welcomeFirstNameHint?: string
  onBack: () => void
  onContinueToBooking: (phone: string, loyalty: LoyaltyLookupResult) => void
  /** Called after a successful lookup so the shell header can match the greeting. */
  onWelcomeNameResolved?: (firstName: string) => void
}) {
  const [phone, setPhone] = useState(initialPhone)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loyalty, setLoyalty] = useState<LoyaltyLookupResult | null>(null)

  async function runLookup() {
    const d = phoneDigitsOnly(phone)
    if (d.length < 7) {
      setError('Enter a phone number we can match (at least 7 digits).')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/loyalty/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<LoyaltyLookupResult> & {
        error?: string
      }
      if (!res.ok) {
        setError(typeof data.error === 'string' ? data.error : 'Lookup failed. Try again.')
        setLoyalty(null)
        onWelcomeNameResolved?.(firstNameFromFullName(welcomeFirstNameHint ?? ''))
        return
      }
      const hintName = typeof data.contactHint?.name === 'string' ? data.contactHint.name : ''
      const resolvedFirst =
        (typeof data.firstName === 'string' ? data.firstName : '').trim() ||
        firstNameFromFullName(hintName)
      const nextLoyalty: LoyaltyLookupResult = {
        recognized: Boolean(data.recognized),
        completedPunches: Number(data.completedPunches) || 0,
        punchesOnCard: Number(data.punchesOnCard) || 0,
        maxPunches: Number(data.maxPunches) || 5,
        nextDiscountPercent: Number(data.nextDiscountPercent) || 0,
        tierLabels: Array.isArray(data.tierLabels) ? data.tierLabels : [],
        message: typeof data.message === 'string' ? data.message : '',
        firstName: resolvedFirst,
        contactHint: {
          name: hintName,
          email: typeof data.contactHint?.email === 'string' ? data.contactHint.email : '',
        },
      }
      setLoyalty(nextLoyalty)
      onWelcomeNameResolved?.(resolvedFirst)
    } catch {
      setError('Network error — check your connection and try again.')
      setLoyalty(null)
      onWelcomeNameResolved?.(firstNameFromFullName(welcomeFirstNameHint ?? ''))
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    void runLookup()
  }

  function handleStartBooking() {
    if (!loyalty) return
    onContinueToBooking(phone.trim(), loyalty)
  }

  const welcomeFirst =
    (loyalty?.firstName || '').trim() || firstNameFromFullName(welcomeFirstNameHint ?? '')

  return (
    <div className="space-y-6 pt-2">
      <div>
        <h1 className="font-display text-2xl font-semibold italic tracking-tight text-white sm:text-3xl">
          {welcomeFirst ? `Welcome back, ${welcomeFirst}` : 'Welcome back'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the phone number on your past bookings. We will match it to our job history and show
          your detail punch rewards.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="returning-phone">
            Phone number
          </label>
          <input
            id="returning-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none ring-emerald-400/40 transition placeholder:text-slate-500 focus:border-emerald-400/40 focus:ring-2"
            placeholder="(555) 123-4567 or +1 …"
            value={phone}
            onChange={(e) => {
              setPhone(formatUsPhoneInput(e.target.value))
              setLoyalty(null)
              onWelcomeNameResolved?.(firstNameFromFullName(welcomeFirstNameHint ?? ''))
            }}
          />
        </div>
        {error ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-12 rounded-xl border border-emerald-500/40 bg-emerald-500/20 text-sm font-semibold text-emerald-50 transition enabled:hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Looking up…' : loyalty ? 'Refresh lookup' : 'See my punch card & rewards'}
        </button>
      </form>

      {loyalty ? (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-sm leading-relaxed text-slate-200">{loyalty.message}</p>

          <div>
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
              Detail punch card ({loyalty.maxPunches} visits)
            </p>
            <div className="flex justify-between gap-1 sm:gap-2">
              {Array.from({ length: loyalty.maxPunches }, (_, i) => {
                const filled = i < loyalty.punchesOnCard
                const label = loyalty.tierLabels[i] ?? ''
                return (
                  <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-xs font-bold sm:h-12 sm:w-12 ${
                        filled
                          ? 'border-emerald-400/80 bg-emerald-500/25 text-emerald-100'
                          : 'border-white/15 bg-black/30 text-slate-600'
                      }`}
                      aria-label={filled ? `Punch ${i + 1} earned` : `Punch ${i + 1} open`}
                    >
                      {filled ? '✓' : i + 1}
                    </div>
                    <span className="max-w-[4.5rem] text-center text-[10px] leading-tight text-slate-500 sm:max-w-none sm:text-[11px]">
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-3 text-center">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">
              Your next wash or detail
            </p>
            <p className="mt-1 font-display text-xl font-semibold italic text-white">
              {loyalty.nextDiscountPercent > 0
                ? `${loyalty.nextDiscountPercent}% off`
                : 'Regular price'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartBooking}
            className="cta-gradient w-full min-h-12 rounded-xl text-sm font-semibold transition enabled:hover:brightness-110 enabled:active:scale-[0.99]"
          >
            Continue to book
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={onBack}
        className="w-full min-h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-medium text-white transition hover:bg-white/10"
      >
        Back
      </button>
    </div>
  )
}
