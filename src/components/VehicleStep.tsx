import { motion } from 'framer-motion'
import { Car, Truck, CarFront } from 'lucide-react'
import type { VehicleType } from '../types/request'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion'

const OPTIONS: { id: VehicleType; label: string; Icon: typeof Car }[] = [
  { id: 'car', label: 'Car', Icon: Car },
  { id: 'truck', label: 'Truck', Icon: Truck },
  { id: 'suv', label: 'SUV', Icon: CarFront },
]

export function VehicleStep({
  type,
  onTypeChange,
  year,
  makeModel,
  color,
  onDetailsChange,
}: {
  type: VehicleType | ''
  onTypeChange: (t: VehicleType) => void
  year: string
  makeModel: string
  color: string
  onDetailsChange: (field: 'year' | 'makeModel' | 'color', value: string) => void
}) {
  const reduce = usePrefersReducedMotion()

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">Tap the vehicle that matches yours.</p>
      <div className="grid grid-cols-3 gap-3">
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
                className={`text-sm font-medium ${selected ? 'text-white' : 'text-slate-300'}`}
              >
                {label}
              </span>
            </motion.button>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1.5 block text-sm text-slate-400" htmlFor="vyear">
            Year <span className="text-slate-600">(optional)</span>
          </label>
          <input
            id="vyear"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="2022"
            value={year}
            onChange={(e) => onDetailsChange('year', e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm text-slate-400" htmlFor="vmake">
            Make & model <span className="text-slate-600">(optional)</span>
          </label>
          <input
            id="vmake"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Tesla Model Y"
            value={makeModel}
            onChange={(e) => onDetailsChange('makeModel', e.target.value)}
          />
        </div>
        <div className="sm:col-span-3">
          <label className="mb-1.5 block text-sm text-slate-400" htmlFor="vcolor">
            Color <span className="text-slate-600">(optional)</span>
          </label>
          <input
            id="vcolor"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white outline-none focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/30"
            placeholder="Midnight silver"
            value={color}
            onChange={(e) => onDetailsChange('color', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}
