export type VehicleType = 'car' | 'truck' | 'minivan' | 'suv-compact' | 'suv-fullsize'

export type LocationMode = 'mobile' | 'shop'

/** 24h values for API / payloads; UI shows AM/PM. */
export type PreferredTimeSlot = '10:00' | '14:00' | '16:00'

export const PREFERRED_TIME_OPTIONS: { value: PreferredTimeSlot; label: string }[] = [
  { value: '10:00', label: '10 AM' },
  { value: '14:00', label: '2 PM' },
  { value: '16:00', label: '4 PM' },
]

export function labelVehicleType(t: VehicleType | ''): string {
  if (!t) return '—'
  switch (t) {
    case 'car':
      return 'Car'
    case 'truck':
      return 'Truck'
    case 'minivan':
      return 'Minivan'
    case 'suv-compact':
      return 'Compact SUV'
    case 'suv-fullsize':
      return 'Full-size SUV'
    default:
      return t
  }
}

export function labelPreferredTime(value: PreferredTimeSlot): string {
  return PREFERRED_TIME_OPTIONS.find((o) => o.value === value)?.label ?? value
}

/** Reverse sheet / admin labels (Submitted Requests col F) → vehicle type for pricing. */
export function vehicleTypeFromSheetLabel(label: string): VehicleType | '' {
  const t = label.trim()
  const map: Record<string, VehicleType> = {
    Car: 'car',
    Truck: 'truck',
    Minivan: 'minivan',
    'Compact SUV': 'suv-compact',
    'Full-size SUV': 'suv-fullsize',
  }
  return map[t] ?? ''
}

export interface RequestPayload {
  clientReferenceId: string
  createdAt: string
  contact: {
    name: string
    phone: string
    email: string
    notes?: string
  }
  vehicle: {
    type: VehicleType
    /** Free text — encourage make & model in the form placeholder. */
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
  totals: {
    packageLine: { label: string; amount: number | null }
    addonsLine: { label: string; amount: number }
    grandTotal: number | null
  }
}
