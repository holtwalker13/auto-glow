import { AnimatePresence, motion } from 'framer-motion'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { ContactStep } from './components/ContactStep'
import { OrderSummaryBar } from './components/OrderSummaryBar'
import { LogisticsStep } from './components/LogisticsStep'
import { ReviewStep } from './components/ReviewStep'
import { ServiceStep } from './components/ServiceStep'
import { SuccessScreen } from './components/SuccessScreen'
import { UpsellStep } from './components/UpsellStep'
import { VehicleStep } from './components/VehicleStep'
import { countFreeSlots } from './lib/calendarAvailability'
import { addons, packages, premiumUpsells } from './data/services'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { buildRequestPayload } from './lib/buildPayload'
import type {
  LocationMode,
  PreferredTimeSlot,
  RequestPayload,
  VehicleType,
} from './types/request'

const CERAMIC_ADDON_ID = 'addon-ceramic-3yr'

const STEP_LABELS = [
  'Contact',
  'Vehicle',
  'Services',
  'Glow-ups',
  'Schedule',
  'Review',
] as const

const defaultPackageId =
  packages.find((p) => p.defaultSelected)?.id ?? packages[0]?.id ?? 'full-detail'

function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, '')
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d + days)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

type SlotAvail = { status: string; label?: string }

export default function BookingWizard() {
  const reduceMotion = usePrefersReducedMotion()
  const minDate = useMemo(() => todayISODate(), [])
  const maxDate = useMemo(() => addDaysIso(minDate, 180), [minDate])

  const [step, setStep] = useState(0)
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  })
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehicleDescription, setVehicleDescription] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackageId)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [dismissedPremiumIds, setDismissedPremiumIds] = useState<string[]>([])
  const [locationMode, setLocationMode] = useState<LocationMode>('mobile')
  const [preferredDate, setPreferredDate] = useState('')
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<PreferredTimeSlot | ''>('')
  const [slotAvailability, setSlotAvailability] = useState<
    Record<string, SlotAvail> | null
  >(null)
  const [address, setAddress] = useState('')
  const [parkingNotes, setParkingNotes] = useState('')
  const [submitted, setSubmitted] = useState<RequestPayload | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const hasCeramic = selectedAddonIds.includes(CERAMIC_ADDON_ID)

  const addAddon = useCallback((id: string) => {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const dismissPremium = useCallback((premiumCardId: string) => {
    const addonId = premiumUpsells.find((u) => u.id === premiumCardId)?.addonId
    setDismissedPremiumIds((prev) =>
      prev.includes(premiumCardId) ? prev : [...prev, premiumCardId],
    )
    if (addonId) {
      setSelectedAddonIds((prev) => prev.filter((x) => x !== addonId))
    }
  }, [])

  useEffect(() => {
    setSelectedAddonIds((prev) =>
      prev.filter((id) => id !== 'addon-paint-enhance' && id !== 'addon-ceramic-1yr'),
    )
  }, [])

  useEffect(() => {
    if (!preferredDate) {
      setSlotAvailability(null)
      setAvailabilityLoading(false)
      return
    }
    let cancelled = false
    setAvailabilityLoading(true)
    fetch(`/api/availability?date=${encodeURIComponent(preferredDate)}`, {
      credentials: 'omit',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.slots) setSlotAvailability(data.slots)
      })
      .catch(() => {
        /* keep calendar snapshot on network error */
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [preferredDate])

  useEffect(() => {
    if (!hasCeramic || !preferredDate || !slotAvailability) return
    if (countFreeSlots(slotAvailability) < 3) {
      setPreferredDate('')
      setPreferredTimeSlot('')
      setSlotAvailability(null)
    }
  }, [hasCeramic, preferredDate, slotAvailability])

  const scheduleOk = useMemo(() => {
    if (!preferredDate) return false
    if (locationMode === 'mobile' && !address.trim()) return false
    if (slotAvailability === null) return false
    const n = countFreeSlots(slotAvailability)
    if (hasCeramic) return n === 3
    if (n === 0) return false
    return Boolean(preferredTimeSlot)
  }, [
    preferredDate,
    hasCeramic,
    preferredTimeSlot,
    locationMode,
    address,
    slotAvailability,
  ])

  const validationError = useMemo(() => {
    if (step === 0) {
      if (!contact.name.trim()) return 'Please enter your name.'
      if (!isValidEmail(contact.email)) return 'Please enter a valid email.'
      if (digitsOnly(contact.phone).length < 7) return 'Please enter a reachable phone number.'
    }
    if (step === 1) {
      if (!vehicleType) return 'Pick a vehicle type.'
      if (!vehicleDescription.trim()) return 'Tell us about your vehicle (make, model, etc.).'
    }
    if (step === 4) {
      if (!preferredDate) return 'Choose a preferred date.'
      if (slotAvailability === null) return 'Loading availability…'
      const n = countFreeSlots(slotAvailability)
      if (hasCeramic && n < 3)
        return 'Ceramic needs a fully open day — pick another date on the calendar.'
      if (!hasCeramic && n === 0)
        return 'No times available on this day — choose another date.'
      if (!hasCeramic && !preferredTimeSlot) return 'Choose a drop-off time (10 AM, 2 PM, or 4 PM).'
      if (locationMode === 'mobile' && !address.trim())
        return 'Add a service address for mobile detailing.'
      if (!hasCeramic && preferredTimeSlot && slotAvailability) {
        const a = slotAvailability[preferredTimeSlot]
        if (a?.status === 'block') return 'That time is unavailable — pick another slot.'
        if (a?.status === 'booked') return 'That time was just taken — pick another slot.'
      }
    }
    if (step === 5) {
      if (!contact.name.trim()) return 'Please enter your name.'
      if (!isValidEmail(contact.email)) return 'Please enter a valid email.'
      if (digitsOnly(contact.phone).length < 7)
        return 'Please enter a reachable phone number.'
      if (!vehicleType) return 'Pick a vehicle type.'
      if (!vehicleDescription.trim()) return 'Add your vehicle details before submitting.'
      if (!scheduleOk) return 'Complete schedule and location before submitting.'
    }
    return null
  }, [
    step,
    contact,
    vehicleType,
    vehicleDescription,
    preferredDate,
    hasCeramic,
    preferredTimeSlot,
    locationMode,
    address,
    scheduleOk,
    slotAvailability,
  ])

  const canProceed = validationError === null

  function handleStepFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!canProceed) return
    goNext()
  }

  function goNext() {
    if (!canProceed) return
    setStep((s) => {
      const next = Math.min(s + 1, STEP_LABELS.length - 1)
      if (s === 1 && next === 2) {
        setSelectedAddonIds((prev) => {
          const ala = new Set(addons.map((a) => a.id))
          return prev.filter((id) => !ala.has(id))
        })
      }
      return next
    })
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit() {
    if (!vehicleType || !vehicleDescription.trim()) return
    setSubmitError(null)
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `jag-${Date.now()}`
    const timeForPayload: PreferredTimeSlot = hasCeramic ? '10:00' : (preferredTimeSlot as PreferredTimeSlot)
    const payload = buildRequestPayload({
      clientReferenceId: id,
      contact: {
        name: contact.name.trim(),
        phone: contact.phone.trim(),
        email: contact.email.trim(),
        notes: contact.notes.trim() || undefined,
      },
      vehicle: {
        type: vehicleType,
        description: vehicleDescription.trim(),
      },
      selectedPackageId,
      selectedAddonIds,
      dismissedPremiumIds,
      locationMode,
      preferredDate,
      preferredTimeSlot: timeForPayload,
      address: locationMode === 'mobile' ? address.trim() : undefined,
      parkingNotes:
        locationMode === 'mobile' && parkingNotes.trim() ? parkingNotes.trim() : undefined,
    })

    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitError(typeof data.error === 'string' ? data.error : 'Could not complete booking.')
        return
      }
      setSubmitted(payload)
    } catch {
      setSubmitError('Network error — check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function resetWizard() {
    setSubmitted(null)
    setSubmitError(null)
    setStep(0)
    setContact({ name: '', phone: '', email: '', notes: '' })
    setVehicleType('')
    setVehicleDescription('')
    setSelectedPackageId(defaultPackageId)
    setSelectedAddonIds([])
    setDismissedPremiumIds([])
    setLocationMode('mobile')
    setPreferredDate('')
    setPreferredTimeSlot('')
    setSlotAvailability(null)
    setAddress('')
    setParkingNotes('')
  }

  if (submitted) {
    return (
      <div className="relative min-h-dvh">
        <header className="h-[150px] min-h-[150px] border-b border-white/5 bg-black px-4">
          <div className="mx-auto flex h-full max-w-lg items-center justify-start">
            <img
              src="/logo.png"
              alt="Jackson Auto Glow"
              className="max-h-[130px] w-auto object-contain object-left"
            />
          </div>
        </header>
        <div className="form-ambient-layer" aria-hidden />
        <div className="relative z-10">
          <SuccessScreen payload={submitted} onStartNew={resetWizard} />
        </div>
      </div>
    )
  }

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 34 }

  const bottomPad =
    step === 2
      ? 'pb-[11.5rem]'
      : step === 3
        ? 'pb-[21rem] max-[480px]:pb-[22rem]'
        : 'pb-28'

  return (
    <div className={`relative min-h-dvh ${bottomPad}`}>
      <header className="sticky top-0 z-20 h-[150px] min-h-[150px] border-b border-white/5 bg-black px-3 sm:px-4">
        <div className="mx-auto flex h-full max-w-lg items-center gap-3 sm:gap-4">
          <img
            src="/logo.png"
            alt="Jackson Auto Glow"
            className="max-h-[130px] w-auto shrink-0 object-contain object-left"
          />
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
            <span className="shrink-0 whitespace-nowrap text-[10px] tabular-nums text-slate-500 sm:text-xs">
              {step + 1}/{STEP_LABELS.length}
            </span>
            <span className="min-w-0 truncate font-display text-[10px] font-medium italic text-cyan-200/90 sm:text-xs">
              {STEP_LABELS[step]}
            </span>
            <div className="flex min-w-0 flex-1 gap-0.5 sm:gap-1">
              {STEP_LABELS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 min-w-[2px] flex-1 rounded-full transition-colors ${
                    i <= step ? 'bg-gradient-to-r from-cyan-400 to-blue-600' : 'bg-white/10'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="form-ambient-layer" aria-hidden />

      <main
        className={`relative z-10 mx-auto max-w-lg px-4 pt-5 ${step === 3 ? 'overflow-x-clip' : ''}`}
      >
        {validationError && step > 1 ? (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
            {validationError}
          </p>
        ) : null}
        {submitError ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-100/90">
            {submitError}
          </p>
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduceMotion ? false : { opacity: 0, x: 24, filter: 'blur(6px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? undefined : { opacity: 0, x: -20, filter: 'blur(4px)' }}
            transition={transition}
          >
            {step === 0 ? (
              <form id="booking-step-contact" onSubmit={handleStepFormSubmit}>
                <ContactStep value={contact} onChange={setContact} />
              </form>
            ) : null}
            {step === 1 ? (
              <VehicleStep
                type={vehicleType}
                onTypeChange={setVehicleType}
                description={vehicleDescription}
                onDescriptionChange={setVehicleDescription}
              />
            ) : null}
            {step === 2 ? (
              <ServiceStep
                vehicleType={vehicleType}
                selectedPackageId={selectedPackageId}
                onPackageChange={setSelectedPackageId}
              />
            ) : null}
            {step === 3 ? (
              <UpsellStep
                selectedAddonIds={selectedAddonIds}
                dismissedIds={dismissedPremiumIds}
                onAddAddon={addAddon}
                onDismiss={dismissPremium}
              />
            ) : null}
            {step === 4 ? (
              <LogisticsStep
                preferredDate={preferredDate}
                onScheduleDayPick={(date, slots) => {
                  setPreferredDate(date)
                  setPreferredTimeSlot('')
                  setSlotAvailability(slots)
                }}
                preferredTimeSlot={preferredTimeSlot}
                onTimeSlotChange={setPreferredTimeSlot}
                hideTimeSlots={hasCeramic}
                allDayLabel="Ceramic coating uses the full day — all three time slots will be held for you."
                slotAvailability={slotAvailability}
                locationMode={locationMode}
                onLocationModeChange={setLocationMode}
                address={address}
                onAddressChange={setAddress}
                parkingNotes={parkingNotes}
                onParkingNotesChange={setParkingNotes}
                minDate={minDate}
                maxDate={maxDate}
                hasCeramic={hasCeramic}
                availabilityLoading={availabilityLoading}
              />
            ) : null}
            {step === 5 ? (
              <ReviewStep
                contact={contact}
                vehicleType={vehicleType}
                vehicleDescription={vehicleDescription}
                selectedPackageId={selectedPackageId}
                selectedAddonIds={selectedAddonIds}
                locationMode={locationMode}
                preferredDate={preferredDate}
                preferredTimeSlot={preferredTimeSlot}
                hasCeramicCoating={hasCeramic}
                address={address}
                parkingNotes={parkingNotes}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black px-4 pt-2 pb-3">
        <div className="mx-auto max-w-lg">
          {step === 2 || step === 3 ? (
            <OrderSummaryBar
              vehicleType={vehicleType}
              selectedPackageId={selectedPackageId}
              selectedAddonIds={selectedAddonIds}
            />
          ) : null}
          <div className="flex gap-3 pt-1">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="min-h-12 min-w-[96px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Back
              </button>
            ) : (
              <span className="min-w-[96px]" />
            )}
            {step < STEP_LABELS.length - 1 ? (
              <button
                type={step === 0 ? 'submit' : 'button'}
                form={step === 0 ? 'booking-step-contact' : undefined}
                onClick={step === 0 ? undefined : goNext}
                disabled={!canProceed}
                className="cta-gradient min-h-12 flex-1 rounded-xl text-sm font-semibold transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleSubmit()}
                disabled={!canProceed || submitting}
                className="cta-gradient min-h-12 flex-1 rounded-xl text-sm font-semibold transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? 'Submitting…' : 'Submit request'}
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
