import { firstNameFromFullName } from './personName'
import {
  DEFAULT_LOYALTY_TIER_LABELS,
  type LoyaltyLookupResult,
} from '../types/loyalty'

/**
 * Normalize `/api/loyalty/lookup` JSON into the shape used by the returning-customer UI.
 */
export function loyaltyLookupResultFromApi(
  data: Partial<LoyaltyLookupResult> & { error?: string },
): LoyaltyLookupResult {
  const hintName = typeof data.contactHint?.name === 'string' ? data.contactHint.name : ''
  const resolvedFirst =
    (typeof data.firstName === 'string' ? data.firstName : '').trim() ||
    firstNameFromFullName(hintName)
  const notesRaw =
    typeof data.contactHint?.notes === 'string' ? data.contactHint.notes.trim() : ''
  return {
    recognized: Boolean(data.recognized),
    completedPunches: Number(data.completedPunches) || 0,
    punchesOnCard: Number(data.punchesOnCard) || 0,
    maxPunches: Number(data.maxPunches) || 5,
    nextDiscountPercent: Number(data.nextDiscountPercent) || 0,
    tierLabels:
      Array.isArray(data.tierLabels) && data.tierLabels.length > 0
        ? data.tierLabels
        : [...DEFAULT_LOYALTY_TIER_LABELS],
    annualResetNote:
      typeof data.annualResetNote === 'string' ? data.annualResetNote.trim() : '',
    message: typeof data.message === 'string' ? data.message : '',
    firstName: resolvedFirst,
    contactHint: {
      name: hintName,
      email: typeof data.contactHint?.email === 'string' ? data.contactHint.email : '',
      ...(notesRaw ? { notes: notesRaw } : {}),
    },
    vehicleHint: {
      typeLabel: typeof data.vehicleHint?.typeLabel === 'string' ? data.vehicleHint.typeLabel : '',
      description:
        typeof data.vehicleHint?.description === 'string' ? data.vehicleHint.description : '',
    },
  }
}
