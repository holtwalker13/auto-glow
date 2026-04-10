import type { VehicleType } from '../types/request'
import {
  getClientAddonOverride,
  getClientPackagePrice,
  getClientPackagePriceAnyVehicle,
} from '../lib/pricingClientStore'

export type PackageSection = { title: string; items: string[] }

export type ServicePackage = {
  id: string
  name: string
  tagline?: string
  price: number | null
  intro?: string
  outro?: string
  sections: PackageSection[]
  defaultSelected?: boolean
}

export type Addon = {
  id: string
  name: string
  price: number
  description?: string
}

export type ProcessStep = { title: string; body: string }

export type PremiumUpsell = {
  id: string
  title: string
  subtitle?: string
  price: number
  description: string
  durationMinutes: number
  durationLabel?: string
  image: string
  cta: string
  addonId: string
  processSteps?: ProcessStep[]
}

export const packages: ServicePackage[] = [
  {
    id: 'interior-detail',
    name: 'Interior Detail',
    price: 120,
    sections: [
      {
        title: 'Our Interior Detail includes all of the following',
        items: [
          'Blowout of cracks and crevices beneath or between seats',
          'Comprehensive steam cleaning of doors, seats, cupholders, and center console',
          'Thorough vacuum and stripping',
          'UV protectant dressing of plastics, dash, and mats',
        ],
      },
    ],
  },
  {
    id: 'exterior-detail',
    name: 'Exterior Detail',
    price: 200,
    intro:
      'When it comes to your vehicle, protection is key — our Exterior Detail not only enhances appearance but also helps guard against the harsh realities of life on the road.',
    outro: 'Finish with non-sling tire shine and plastic dressing.',
    sections: [
      {
        title: 'Included',
        items: [
          'Decontamination of rims, wheels, and wheel barrels',
          'Pre-wash and contact wash',
          'Dry and blow out of vents and badges to help prevent water spotting',
          'Hydrophobic wax',
        ],
      },
    ],
  },
  {
    id: 'full-detail',
    name: 'Full Detail',
    tagline: 'Experience the Shine Like Never Before',
    /** Base / fallback; use `resolvePackagePrice` for amount by vehicle. */
    price: 225,
    defaultSelected: true,
    sections: [
      {
        title: 'Exterior',
        items: [
          'Decontamination of wheels, rims, and wheel wells',
          'Thorough pre-wash and contact wash',
          'Drying and blowing out vents and badges',
          'Hydrophobic wax application',
          'Dressing of tires and plastics with non-sling tire shine',
        ],
      },
      {
        title: 'Interior',
        items: [
          'Blowout of cracks and crevices beneath seats',
          'Comprehensive steam cleaning of seats, doors, center console, and dash',
          'Thorough vacuuming and stripping',
          'UV-protectant dressing of plastics, center console, and dash',
        ],
      },
    ],
    intro: 'Our Full Detail includes the following:',
  },
  {
    id: 'full-everything',
    name: 'Full Everything',
    tagline: 'Maximum glow — bundled interior, exterior & curated extras',
    price: 700,
    sections: [
      {
        title: 'The works',
        items: [
          'Full interior and exterior detail baseline',
          'Curated add-ons bundled into one simple price',
          'Best value when you were stacking multiple upgrades',
        ],
      },
    ],
    intro: 'One package when you want it all handled together.',
  },
]

export const addons: Addon[] = [
  { id: 'addon-clay', name: 'Clay bar decontamination', price: 85 },
  { id: 'addon-spray-wax', name: 'Spray wax / sealant boost', price: 65 },
  {
    id: 'addon-interior-deep',
    name: 'Interior deep clean (cloth shampoo or leather treatment)',
    price: 125,
  },
  { id: 'addon-pet', name: 'Pet hair removal', price: 55 },
  { id: 'addon-engine', name: 'Engine bay wipe-down & dress', price: 85 },
  { id: 'addon-headlight', name: 'Headlight restoration (pair)', price: 99 },
  { id: 'addon-odor', name: 'Odor treatment (fogger / ozone-style)', price: 95 },
]

/** Quick-pick extras after package (not the premium Glow-up cards). */
export const subAddonsExterior: Addon[] = [
  { id: 'addon-sub-engine', name: 'Engine bay detail', price: 85 },
  { id: 'addon-sub-trim', name: 'Trim restoration', price: 75 },
  { id: 'addon-sub-tar-bug', name: 'Tar & bug removal', price: 65 },
]

export const subAddonsInterior: Addon[] = [
  { id: 'addon-sub-leather', name: 'Leather conditioner', price: 45 },
  { id: 'addon-sub-seat-shampoo', name: 'Seat shampoo', price: 55 },
  { id: 'addon-sub-carpet-shampoo', name: 'Carpet shampoo', price: 55 },
  { id: 'addon-sub-pet-hair', name: 'Pet hair removal', price: 55 },
]

const SUB_ADDON_LIST = [...subAddonsExterior, ...subAddonsInterior]

export const SUB_ADDON_ID_SET = new Set(SUB_ADDON_LIST.map((a) => a.id))

export function getSubAddonsForPackage(packageId: string): Addon[] {
  if (packageId === 'exterior-detail') return [...subAddonsExterior]
  if (packageId === 'interior-detail') return [...subAddonsInterior]
  if (packageId === 'full-detail' || packageId === 'full-everything') {
    return [...subAddonsExterior, ...subAddonsInterior]
  }
  return []
}

export function packageUsesTwoPhaseSubAddons(packageId: string): boolean {
  return packageId === 'full-detail' || packageId === 'full-everything'
}

/** Punch-card copy: interior/exterior packages → "cleaning"; full packages → "detail". */
export function loyaltyDiscountScopeWord(packageId: string): 'cleaning' | 'detail' {
  if (packageId === 'interior-detail' || packageId === 'exterior-detail') return 'cleaning'
  return 'detail'
}

export const premiumUpsells: PremiumUpsell[] = [
  {
    id: 'premium-ceramic',
    title: 'Ceramic coating',
    subtitle: 'Ceramic cleaning & prep',
    price: 899,
    description:
      'Long-term gloss, slick water behavior, and easier washes — the crown jewel of paint protection.',
    durationMinutes: 960,
    durationLabel: 'Typically 1–2 days (prep, apply, cure & handoff)',
    image: '/addons/ceramic.png',
    cta: 'Lock in the mirror finish',
    addonId: 'addon-ceramic-3yr',
    processSteps: [
      {
        title: 'Preparation',
        body: 'Before applying the paint protection coating, I decontaminate your vehicle with an exterior contact wash, clay bar, and iron remover — so contaminants are fully removed before coating begins.',
      },
      {
        title: 'Application',
        body: 'I apply a 3-year ceramic coating using specialized techniques and tools for even, thorough coverage. The coating bonds to your paint, creating a strong, durable barrier.',
      },
      {
        title: 'Inspection',
        body: 'After application, I carefully inspect the entire vehicle to ensure a flawless finish.',
      },
    ],
  },
  {
    id: 'premium-interior',
    title: 'Interior refresh',
    subtitle: 'Steam, shampoo, like new',
    price: 125,
    description:
      'Deeper than the standard vacuum — seats, console, and doors get the full spa treatment.',
    durationMinutes: 120,
    durationLabel: 'Roughly 2–3 hours',
    image: '/addons/interior.png',
    cta: 'Upgrade the cabin',
    addonId: 'addon-interior-deep',
  },
  {
    id: 'premium-engine',
    title: 'Engine bay glow-up',
    subtitle: 'Show-ready bay',
    price: 85,
    description:
      'Safe wipe-down and dress so plastics look rich — great for leases, shows, or peace of mind.',
    durationMinutes: 60,
    durationLabel: '~1 hour',
    image: '/addons/engine.png',
    cta: 'Open the hood with pride',
    addonId: 'addon-engine',
  },
  {
    id: 'premium-headlight',
    title: 'Headlight restoration',
    subtitle: 'See and be seen',
    price: 99,
    description:
      'Clarify yellowed lenses for safer night driving and a fresher front end.',
    durationMinutes: 90,
    durationLabel: '~1–1.5 hours',
    image: '/addons/headlight.png',
    cta: 'Brighten the road ahead',
    addonId: 'addon-headlight',
  },
  {
    id: 'premium-odor',
    title: 'Odor elimination',
    subtitle: 'Fresh cabin reset',
    price: 95,
    description:
      'Target stubborn smells so your interior feels clean, not masked.',
    durationMinutes: 75,
    durationLabel: '~1 hour',
    image: '/addons/odor.png',
    cta: 'Breathe easy again',
    addonId: 'addon-odor',
  },
]

/** Glow-up card addon IDs — punch-card % off applies to package + add-ons outside this set only. */
export const PREMIUM_UPSELL_ADDON_ID_SET = new Set(premiumUpsells.map((u) => u.addonId))

/** Premium-only addon not listed in main ala carte checklist */
export const premiumOnlyAddons: Addon[] = [
  {
    id: 'addon-ceramic-3yr',
    name: 'Ceramic coating (3-year program)',
    price: 899,
    description: 'Includes full decon, application, and inspection per process below.',
  },
]

export function getAddonById(id: string): Addon | undefined {
  const base =
    addons.find((a) => a.id === id) ??
    premiumOnlyAddons.find((a) => a.id === id) ??
    SUB_ADDON_LIST.find((a) => a.id === id)
  const o = getClientAddonOverride(id)
  if (!base && !o) return undefined
  if (!base) {
    return { id, name: o!.name, price: o!.price }
  }
  if (!o) return base
  return { ...base, name: o.name || base.name, price: o.price }
}

export function getPackageById(id: string): ServicePackage | undefined {
  return packages.find((p) => p.id === id)
}

/**
 * Package amount from the Pricing sheet (via /api/pricing) when loaded; otherwise built-in matrix
 * in `pricingConstants`. Vehicle-specific rows need `vehicleType`.
 */
export function resolvePackagePrice(
  packageId: string,
  vehicleType: VehicleType | '',
): number | null {
  if (!getPackageById(packageId)) return null
  if (vehicleType) {
    const v = getClientPackagePrice(packageId, vehicleType)
    if (v != null) return v
  }
  const anyV = getClientPackagePriceAnyVehicle(packageId)
  if (anyV != null) return anyV
  if (!vehicleType) return null
  return getPackageById(packageId)?.price ?? null
}

const ALL_VEHICLE_TYPES: VehicleType[] = [
  'car',
  'truck',
  'minivan',
  'suv-compact',
  'suv-fullsize',
]

/** When vehicle type is not chosen yet, show min–max from the active pricing matrix. */
export function getFullDetailPriceRangeLabel(): string {
  const prices = ALL_VEHICLE_TYPES.map((t) => getClientPackagePrice('full-detail', t)).filter(
    (n): n is number => n != null,
  )
  if (!prices.length) return 'Quote'
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  return lo === hi ? `$${lo}` : `$${lo}–$${hi}`
}
