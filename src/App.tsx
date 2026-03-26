import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContactStep } from './components/ContactStep'
import { OrderSummaryBar } from './components/OrderSummaryBar'
import { LogisticsStep } from './components/LogisticsStep'
import { ReviewStep } from './components/ReviewStep'
import { ServiceStep } from './components/ServiceStep'
import { SuccessScreen } from './components/SuccessScreen'
import { UpsellStep } from './components/UpsellStep'
import { VehicleStep } from './components/VehicleStep'
import { packages, premiumUpsells } from './data/services'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import { buildRequestPayload } from './lib/buildPayload'
import type { LocationMode, RequestPayload, VehicleType } from './types/request'

const STEP_LABELS = [
  'Contact',
  'Vehicle',
  'Services',
  'Schedule',
  'Glow-ups',
  'Review',
] as const

const defaultPackageId =
  packages.find((p) => p.defaultSelected)?.id ?? packages[0]?.id ?? 'full-detail'

/** Set to `false` before launch — skips contact validation for faster user tests. */
const USER_TEST_RELAX_CONTACT = true

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

export default function App() {
  const reduceMotion = usePrefersReducedMotion()
  const minDate = useMemo(() => todayISODate(), [])

  const [step, setStep] = useState(0)
  const [contact, setContact] = useState({
    name: '',
    phone: '',
    email: '',
    notes: '',
  })
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleMakeModel, setVehicleMakeModel] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [selectedPackageId, setSelectedPackageId] = useState(defaultPackageId)
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([])
  const [dismissedPremiumIds, setDismissedPremiumIds] = useState<string[]>([])
  const [locationMode, setLocationMode] = useState<LocationMode>('mobile')
  const [preferredDate, setPreferredDate] = useState('')
  const [address, setAddress] = useState('')
  const [parkingNotes, setParkingNotes] = useState('')
  const [submitted, setSubmitted] = useState<RequestPayload | null>(null)

  const toggleAddon = useCallback((id: string) => {
    setSelectedAddonIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }, [])

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

  const validationError = useMemo(() => {
    const scheduleOk =
      Boolean(preferredDate) &&
      (locationMode === 'shop' || address.trim().length > 0)

    if (step === 0 && !USER_TEST_RELAX_CONTACT) {
      if (!contact.name.trim()) return 'Please enter your name.'
      if (!isValidEmail(contact.email)) return 'Please enter a valid email.'
      if (digitsOnly(contact.phone).length < 7) return 'Please enter a reachable phone number.'
    }
    if (step === 1 && !vehicleType) return 'Pick car, truck, or SUV.'
    if (step === 3) {
      if (!preferredDate) return 'Choose a preferred date.'
      if (locationMode === 'mobile' && !address.trim())
        return 'Add a service address for mobile detailing.'
    }
    if (step === 5) {
      if (!USER_TEST_RELAX_CONTACT) {
        if (!contact.name.trim()) return 'Please enter your name.'
        if (!isValidEmail(contact.email)) return 'Please enter a valid email.'
        if (digitsOnly(contact.phone).length < 7)
          return 'Please enter a reachable phone number.'
      }
      if (!vehicleType) return 'Pick car, truck, or SUV.'
      if (!scheduleOk) return 'Complete schedule and location before submitting.'
    }
    return null
  }, [step, contact, vehicleType, preferredDate, locationMode, address])

  const canProceed = validationError === null

  function goNext() {
    if (!canProceed) return
    setStep((s) => Math.min(s + 1, STEP_LABELS.length - 1))
  }

  function goBack() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function handleSubmit() {
    if (!vehicleType) return
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `jag-${Date.now()}`
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
        year: vehicleYear.trim() || undefined,
        makeModel: vehicleMakeModel.trim() || undefined,
        color: vehicleColor.trim() || undefined,
      },
      selectedPackageId,
      selectedAddonIds,
      dismissedPremiumIds,
      locationMode,
      preferredDate,
      address: locationMode === 'mobile' ? address.trim() : undefined,
      parkingNotes:
        locationMode === 'mobile' && parkingNotes.trim() ? parkingNotes.trim() : undefined,
    })
    console.log('[Jackson Auto Glow] request payload', payload)
    setSubmitted(payload)
  }

  function resetWizard() {
    setSubmitted(null)
    setStep(0)
    setContact({ name: '', phone: '', email: '', notes: '' })
    setVehicleType('')
    setVehicleYear('')
    setVehicleMakeModel('')
    setVehicleColor('')
    setSelectedPackageId(defaultPackageId)
    setSelectedAddonIds([])
    setDismissedPremiumIds([])
    setLocationMode('mobile')
    setPreferredDate('')
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
      : step === 4
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
        className={`relative z-10 mx-auto max-w-lg px-4 pt-5 ${step === 4 ? 'overflow-x-clip' : ''}`}
      >
        {validationError ? (
          <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
            {validationError}
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
              <ContactStep
                value={contact}
                onChange={setContact}
                userTestOptionalContact={USER_TEST_RELAX_CONTACT}
              />
            ) : null}
            {step === 1 ? (
              <VehicleStep
                type={vehicleType}
                onTypeChange={setVehicleType}
                year={vehicleYear}
                makeModel={vehicleMakeModel}
                color={vehicleColor}
                onDetailsChange={(field, v) => {
                  if (field === 'year') setVehicleYear(v)
                  if (field === 'makeModel') setVehicleMakeModel(v)
                  if (field === 'color') setVehicleColor(v)
                }}
              />
            ) : null}
            {step === 2 ? (
              <ServiceStep
                selectedPackageId={selectedPackageId}
                onPackageChange={setSelectedPackageId}
                selectedAddonIds={selectedAddonIds}
                onToggleAddon={toggleAddon}
              />
            ) : null}
            {step === 3 ? (
              <LogisticsStep
                preferredDate={preferredDate}
                onDateChange={setPreferredDate}
                locationMode={locationMode}
                onLocationModeChange={setLocationMode}
                address={address}
                onAddressChange={setAddress}
                parkingNotes={parkingNotes}
                onParkingNotesChange={setParkingNotes}
                minDate={minDate}
              />
            ) : null}
            {step === 4 ? (
              <UpsellStep
                selectedAddonIds={selectedAddonIds}
                dismissedIds={dismissedPremiumIds}
                onAddAddon={addAddon}
                onDismiss={dismissPremium}
              />
            ) : null}
            {step === 5 ? (
              <ReviewStep
                contact={contact}
                vehicleType={vehicleType}
                year={vehicleYear}
                makeModel={vehicleMakeModel}
                color={vehicleColor}
                selectedPackageId={selectedPackageId}
                selectedAddonIds={selectedAddonIds}
                locationMode={locationMode}
                preferredDate={preferredDate}
                address={address}
                parkingNotes={parkingNotes}
              />
            ) : null}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black px-4 pt-2 pb-3">
        <div className="mx-auto max-w-lg">
          {step === 2 || step === 4 ? (
            <OrderSummaryBar
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
                type="button"
                onClick={goNext}
                disabled={!canProceed}
                className="cta-gradient min-h-12 flex-1 rounded-xl text-sm font-semibold transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canProceed}
                className="cta-gradient min-h-12 flex-1 rounded-xl text-sm font-semibold transition enabled:hover:brightness-110 enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit request
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
