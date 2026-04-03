import type { LocationMode, PreferredTimeSlot } from '../types/request'
import { PREFERRED_TIME_OPTIONS } from '../types/request'
import { ScheduleCalendar } from './ScheduleCalendar'
import { slotsRecordFromCalendar, countFreeSlots } from '../lib/calendarAvailability'

type SlotAvail = { status: string; label?: string }

export function LogisticsStep({
  preferredDate,
  onScheduleDayPick,
  preferredTimeSlot,
  onTimeSlotChange,
  hideTimeSlots,
  allDayLabel,
  slotAvailability,
  locationMode,
  onLocationModeChange,
  address,
  onAddressChange,
  parkingNotes,
  onParkingNotesChange,
  minDate,
  maxDate,
  hasCeramic,
  availabilityLoading,
}: {
  preferredDate: string
  onScheduleDayPick: (date: string, slots: Record<string, SlotAvail>) => void
  preferredTimeSlot: PreferredTimeSlot | ''
  onTimeSlotChange: (v: PreferredTimeSlot) => void
  hideTimeSlots: boolean
  allDayLabel: string
  slotAvailability: Record<string, SlotAvail> | null
  locationMode: LocationMode
  onLocationModeChange: (m: LocationMode) => void
  address: string
  onAddressChange: (v: string) => void
  parkingNotes: string
  onParkingNotesChange: (v: string) => void
  minDate: string
  maxDate: string
  hasCeramic: boolean
  availabilityLoading: boolean
}) {
  const freeCount = countFreeSlots(slotAvailability ?? undefined)
  const showSlotWarning =
    Boolean(preferredDate && slotAvailability) &&
    (hasCeramic ? freeCount < 3 : freeCount === 0)
  const noTimeSlotsPickable = showSlotWarning && !hideTimeSlots

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-medium text-slate-300">Preferred date</p>
        <ScheduleCalendar
          minDate={minDate}
          maxDate={maxDate}
          selectedDate={preferredDate}
          hasCeramic={hasCeramic}
          onSelectDay={(date, slots) => {
            onScheduleDayPick(date, slotsRecordFromCalendar(slots))
          }}
        />
      </div>

      {showSlotWarning ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
          {hasCeramic
            ? 'Ceramic needs the whole day clear — this date still has a booking or blockout. Choose another blue (fully open) day.'
            : 'No time slots are open on this day — choose another blue date on the calendar.'}
        </p>
      ) : null}

      {hideTimeSlots ? (
        <p className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100/90">
          {allDayLabel}
        </p>
      ) : (
        <div>
          <p className="mb-3 text-sm font-medium text-slate-300">Drop-off time</p>
          {availabilityLoading && preferredDate ? (
            <p className="mb-2 text-xs text-slate-500">Checking slot availability…</p>
          ) : null}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PREFERRED_TIME_OPTIONS.map(({ value, label }) => {
              const selected = preferredTimeSlot === value
              const avail = slotAvailability?.[value]
              const blocked = avail?.status === 'block' || avail?.status === 'booked'
              return (
                <button
                  key={value}
                  type="button"
                  disabled={blocked || noTimeSlotsPickable}
                  onClick={() => onTimeSlotChange(value)}
                  className={`rounded-2xl border px-4 py-4 text-left transition ${
                    blocked || noTimeSlotsPickable
                      ? 'cursor-not-allowed border-white/5 bg-white/[0.02] opacity-50'
                      : selected
                        ? 'border-cyan-400/50 bg-cyan-500/10'
                        : 'border-white/10 bg-white/[0.03] hover:border-white/20'
                  }`}
                >
                  <span className="font-display text-base font-semibold italic text-white">{label}</span>
                  {blocked ? (
                    <span className="mt-1 block text-xs text-slate-500">
                      {avail?.status === 'block' ? 'Unavailable' : 'Booked'}
                    </span>
                  ) : noTimeSlotsPickable ? (
                    <span className="mt-1 block text-xs text-slate-500">—</span>
                  ) : (
                    <span className="mt-1 block text-xs text-slate-500">Available</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <p className="mb-3 text-sm font-medium text-slate-300">How should we meet?</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onLocationModeChange('mobile')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              locationMode === 'mobile'
                ? 'border-cyan-400/50 bg-cyan-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <span className="font-display text-base font-semibold italic text-white">
              I come to you
            </span>
            <span className="mt-1 block text-sm text-slate-400">
              Mobile detailing at your home or work.
            </span>
          </button>
          <button
            type="button"
            onClick={() => onLocationModeChange('shop')}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              locationMode === 'shop'
                ? 'border-cyan-400/50 bg-cyan-500/10'
                : 'border-white/10 bg-white/[0.03] hover:border-white/20'
            }`}
          >
            <span className="font-display text-base font-semibold italic text-white">
              You bring it to me
            </span>
            <span className="mt-1 block text-sm text-slate-400">
              Drop-off at our location.
            </span>
          </button>
        </div>
      </div>

      {locationMode === 'mobile' ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="addr">
              Service address
            </label>
            <input
              id="addr"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="Street, city, ZIP"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              autoComplete="street-address"
              required={locationMode === 'mobile'}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="park">
              Parking / access notes{' '}
              <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <textarea
              id="park"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
              placeholder="Gate code, covered parking, etc."
              value={parkingNotes}
              onChange={(e) => onParkingNotesChange(e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
