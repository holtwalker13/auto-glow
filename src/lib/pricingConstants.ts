/**
 * Fallback when /api/pricing has not loaded yet or the sheet is empty.
 * Keep in sync with `BUILTIN_PACKAGE_MATRIX` (+ ADDON_META) in server/index.mjs.
 */
import type { VehicleType } from '../types/request'

export const FALLBACK_PACKAGE_MATRIX: Record<string, Record<VehicleType, number>> = {
  'interior-detail': {
    car: 120,
    truck: 120,
    minivan: 120,
    'suv-compact': 120,
    'suv-fullsize': 120,
  },
  'exterior-detail': {
    car: 200,
    truck: 200,
    minivan: 200,
    'suv-compact': 200,
    'suv-fullsize': 200,
  },
  'full-detail': {
    car: 225,
    truck: 295,
    minivan: 295,
    'suv-compact': 225,
    'suv-fullsize': 265,
  },
  'full-everything': {
    car: 700,
    truck: 700,
    minivan: 700,
    'suv-compact': 700,
    'suv-fullsize': 700,
  },
}
