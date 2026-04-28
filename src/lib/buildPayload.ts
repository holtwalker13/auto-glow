import {
  getAddonById,
  getPackageById,
  PREMIUM_UPSELL_ADDON_ID_SET,
  resolvePackagePrice,
  type Addon,
} from '../data/services'
import type {
  RequestPayload,
  VehicleType,
  LocationMode,
  PreferredTimeSlot,
} from '../types/request'

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

/** Whole-dollar subtotal after punch-card % off (caller supplies eligible subtotal only). */
export function applyLoyaltyPercentOff(
  subtotal: number,
  loyaltyDiscountPercent: number,
): { totalAfter: number; savings: number } {
  const pct = Math.min(100, Math.max(0, Math.round(loyaltyDiscountPercent)))
  if (pct <= 0 || subtotal <= 0) return { totalAfter: subtotal, savings: 0 }
  const totalAfter = Math.round((subtotal * (100 - pct)) / 100)
  return { totalAfter, savings: subtotal - totalAfter }
}

/** Split selection into loyalty-eligible add-ons vs premium Glow-ups (excluded from % off). */
export function partitionAddonIdsForLoyaltyDisplay(selectedAddonIds: string[]): {
  eligibleAddonIds: string[]
  premiumAddonIds: string[]
} {
  const eligibleAddonIds: string[] = []
  const premiumAddonIds: string[] = []
  for (const id of selectedAddonIds) {
    if (PREMIUM_UPSELL_ADDON_ID_SET.has(id)) premiumAddonIds.push(id)
    else eligibleAddonIds.push(id)
  }
  return { eligibleAddonIds, premiumAddonIds }
}

/** Sum of Glow-up (premium) add-on prices in the selection. */
export function computePremiumUpsellAddonTotal(selectedAddonIds: string[]): number {
  return selectedAddonIds.reduce((sum, id) => {
    if (!PREMIUM_UPSELL_ADDON_ID_SET.has(id)) return sum
    const a = getAddonById(id)
    return sum + (a?.price ?? 0)
  }, 0)
}

/**
 * Punch-card discount on package + non–premium add-ons only; premium Glow-up line stays full price.
 */
export function computeLoyaltyAdjustedGrand(
  packagePrice: number | null,
  selectedAddonIds: string[],
  loyaltyDiscountPercent: number,
): {
  grandBeforeLoyalty: number | null
  premiumAddonTotal: number
  savings: number
  grandAfterLoyalty: number | null
} {
  const addonTotal = computeAddonTotal(selectedAddonIds)
  const grandBeforeLoyalty = computeGrandTotal(packagePrice, addonTotal)
  const premiumAddonTotal = computePremiumUpsellAddonTotal(selectedAddonIds)
  if (packagePrice === null || loyaltyDiscountPercent <= 0) {
    return {
      grandBeforeLoyalty,
      premiumAddonTotal,
      savings: 0,
      grandAfterLoyalty: grandBeforeLoyalty,
    }
  }
  const eligibleSubtotal = packagePrice + (addonTotal - premiumAddonTotal)
  const { totalAfter: eligibleAfter, savings } = applyLoyaltyPercentOff(
    eligibleSubtotal,
    loyaltyDiscountPercent,
  )
  const grandAfterLoyalty = eligibleAfter + premiumAddonTotal
  return { grandBeforeLoyalty, premiumAddonTotal, savings, grandAfterLoyalty }
}

export function buildRequestPayload(input: {
  clientReferenceId: string
  contact: { name: string; phone: string; email: string; notes?: string }
  vehicle: {
    type: VehicleType
    description?: string
  }
  selectedPackageId: string
  selectedAddonIds: string[]
  dismissedPremiumIds: string[]
  locationMode: LocationMode
  preferredDate: string
  preferredTimeSlot: PreferredTimeSlot
  address?: string
  parkingNotes?: string
}): RequestPayload {
  const pkg = getPackageById(input.selectedPackageId)
  const packageLabel = pkg?.name ?? 'Package'
  const packagePrice = resolvePackagePrice(
    input.selectedPackageId,
    input.vehicle.type,
  )
  const addonsLineAmount =
    input.selectedPackageId === 'full-everything' ? 0 : computeAddonTotal(input.selectedAddonIds)
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
    preferredTimeSlot: input.preferredTimeSlot,
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
