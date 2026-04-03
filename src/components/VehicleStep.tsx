import { motion } from 'framer-motion'
import { Car, Truck, CarFront, Bus } from 'lucide-react'
import type { VehicleType } from '../types/request'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const OPTIONS: { id: VehicleType; label: string; Icon: typeof Car }[] = [
  { id: 'car', label: 'Car', Icon: Car },
  { id: 'truck', label: 'Truck', Icon: Truck },
  { id: 'suv-compact', label: 'Compact SUV', Icon: CarFront },
  { id: 'suv-fullsize', label: 'Full-size SUV', Icon: Bus },
]

export function VehicleStep({
  type,
  onTypeChange,
  description,
  onDescriptionChange,
}: {
  type: VehicleType | ''
  onTypeChange: (t: VehicleType) => void
  description: string
  onDescriptionChange: (value: string) => void
}) {
  const reduce = usePrefersReducedMotion()

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">Tap the vehicle that matches yours.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {OPTIONS.map(({ id, label, Icon }) => {
          const selected = type === id
          return (
            <motion.button
              key={id}
              type="button"
              onClick={() => onTypeChange(id)}
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-4 transition-colors ${
                selected
                  ? 'border-cyan-400/60 bg-gradient-to-b from-cyan-500/15 to-blue-900/20 shadow-[0_0_24px_-8px_rgba(34,211,238,0.5)]'
                  : 'border-white/10 bg-white/[0.03] hover:border-white/20'
              }`}
            >
              <Icon
                className={`h-9 w-9 ${selected ? 'text-cyan-300' : 'text-slate-400'}`}
                strokeWidth={1.5}
                aria-hidden
              />
              <span
                className={`text-center text-xs font-medium leading-tight sm:text-sm ${
                  selected ? 'text-white' : 'text-slate-300'
                }`}
              >
                {label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="vehicle-desc">
          Tell us about your vehicle <span className="text-red-400/90">*</span>
        </label>
        <textarea
          id="vehicle-desc"
          rows={3}
          required
          className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
          placeholder="Required — year, make & model, trim (e.g. 2022 Honda Civic Sport)"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
    </div>
  )
}
