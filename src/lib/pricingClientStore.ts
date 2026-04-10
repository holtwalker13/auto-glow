import type { VehicleType } from '../types/request'
import { FALLBACK_PACKAGE_MATRIX } from './pricingConstants'

/** Matches GET /api/pricing JSON. */
export type PricingPayload = {
  packages: Record<string, Partial<Record<VehicleType, number>>>
  addons: Record<string, { name: string; price: number }>
}

let snapshot: PricingPayload | null = null

export function hydratePricing(data: PricingPayload) {
  snapshot = data
}

export function getPricingSnapshot(): PricingPayload | null {
  return snapshot
}

export function clearPricingSnapshot() {
  snapshot = null
}

export function getClientPackagePrice(packageId: string, vehicleType: VehicleType | ''): number | null {
  const row = snapshot?.packages[packageId] ?? FALLBACK_PACKAGE_MATRIX[packageId]
  if (!row) return null
  if (!vehicleType) return null
  const n = row[vehicleType]
  return typeof n === 'number' && Number.isFinite(n) ? n : null
}

/** Package price when all vehicle columns are the same (interior / exterior / everything). */
export function getClientPackagePriceAnyVehicle(packageId: string): number | null {
  const row = snapshot?.packages[packageId] ?? FALLBACK_PACKAGE_MATRIX[packageId]
  if (!row) return null
  const vals = Object.values(row).filter((v) => typeof v === 'number' && Number.isFinite(v)) as number[]
  if (vals.length === 0) return null
  const first = vals[0]
  return vals.every((v) => v === first) ? first : null
}

export function getClientAddonOverride(id: string): { name: string; price: number } | undefined {
  return snapshot?.addons[id]
}
