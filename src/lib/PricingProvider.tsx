import { type ReactNode, useEffect, useState } from 'react'
import { type PricingPayload, clearPricingSnapshot, hydratePricing } from './pricingClientStore'

export function PricingProvider({ children }: { children: ReactNode }) {
  const [, setPricingEpoch] = useState(0)

  useEffect(() => {
    let cancelled = false
    clearPricingSnapshot()
    fetch('/api/pricing', { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PricingPayload | null) => {
        if (cancelled || !data?.packages || !data?.addons) return
        hydratePricing({
          packages: data.packages,
          addons: data.addons,
        })
        setPricingEpoch((n) => n + 1)
      })
      .catch(() => {
        /* keep fallbacks in services / pricingConstants */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return <>{children}</>
}
