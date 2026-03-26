import type { LocationMode } from '../types/request'

export function LogisticsStep({
  preferredDate,
  onDateChange,
  locationMode,
  onLocationModeChange,
  address,
  onAddressChange,
  parkingNotes,
  onParkingNotesChange,
  minDate,
}: {
  preferredDate: string
  onDateChange: (v: string) => void
  locationMode: LocationMode
  onLocationModeChange: (m: LocationMode) => void
  address: string
  onAddressChange: (v: string) => void
  parkingNotes: string
  onParkingNotesChange: (v: string) => void
  minDate: string
}) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="date">
          Preferred date
        </label>
        <input
          id="date"
          type="date"
          min={minDate}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30 [color-scheme:dark]"
          value={preferredDate}
          onChange={(e) => onDateChange(e.target.value)}
          required
        />
      </div>

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
