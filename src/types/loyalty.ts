export const DEFAULT_LOYALTY_TIER_LABELS = ['10% off', '15% off', '20% off', '25% off', '30% off'] as const

export type LoyaltyLookupResult = {
  recognized: boolean
  completedPunches: number
  punchesOnCard: number
  maxPunches: number
  nextDiscountPercent: number
  tierLabels: string[]
  /** Shown when we recognize the phone; explains 365-day rolling reset. */
  annualResetNote?: string
  message: string
  /** First name from job history (for greetings). */
  firstName: string
  contactHint: { name: string; email: string; notes?: string }
  vehicleHint: { typeLabel: string; description: string }
}
