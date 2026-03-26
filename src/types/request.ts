export type VehicleType = 'car' | 'truck' | 'suv'

export type LocationMode = 'mobile' | 'shop'

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
  totals: {
    packageLine: { label: string; amount: number | null }
    addonsLine: { label: string; amount: number }
    grandTotal: number | null
  }
}
