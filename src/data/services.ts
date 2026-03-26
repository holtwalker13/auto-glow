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
    price: 230,
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
  return (
    addons.find((a) => a.id === id) ?? premiumOnlyAddons.find((a) => a.id === id)
  )
}

export function getPackageById(id: string): ServicePackage | undefined {
  return packages.find((p) => p.id === id)
}
