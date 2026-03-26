import {
  getAddonById,
  getPackageById,
  type Addon,
} from '../data/services'
import type { RequestPayload, VehicleType, LocationMode } from '../types/request'

export function computeAddonTotal(selectedAddonIds: string[]): number {
  return selectedAddonIds.reduce((sum, id) => {
    const a = getAddonById(id)
    return sum + (a?.price ?? 0)
  }, 0)
}

export function computeGrandTotal(
  packagePrice: number | null,
  addonTotal: number,
): number | null {
  if (packagePrice === null) return null
  return packagePrice + addonTotal
}

export function buildRequestPayload(input: {
  clientReferenceId: string
  contact: { name: string; phone: string; email: string; notes?: string }
  vehicle: {
    type: VehicleType
    year?: string
    makeModel?: string
    color?: string
  }
  selectedPackageId: string
  selectedAddonIds: string[]
  dismissedPremiumIds: string[]
  locationMode: LocationMode
  preferredDate: string
  address?: string
  parkingNotes?: string
}): RequestPayload {
  const pkg = getPackageById(input.selectedPackageId)
  const packageLabel = pkg?.name ?? 'Package'
  const packagePrice = pkg?.price ?? null
  const addonsLineAmount = computeAddonTotal(input.selectedAddonIds)
  const grandTotal = computeGrandTotal(packagePrice, addonsLineAmount)

  return {
    clientReferenceId: input.clientReferenceId,
    createdAt: new Date().toISOString(),
    contact: input.contact,
    vehicle: input.vehicle,
    selectedPackageId: input.selectedPackageId,
    selectedAddonIds: [...input.selectedAddonIds],
    dismissedPremiumIds: [...input.dismissedPremiumIds],
    locationMode: input.locationMode,
    preferredDate: input.preferredDate,
    address: input.address,
    parkingNotes: input.parkingNotes,
    totals: {
      packageLine: { label: packageLabel, amount: packagePrice },
      addonsLine: { label: 'Add-ons', amount: addonsLineAmount },
      grandTotal,
    },
  }
}

export function listSelectedAddons(ids: string[]): Addon[] {
  return ids
    .map((id) => getAddonById(id))
    .filter((a): a is Addon => a !== undefined)
}
