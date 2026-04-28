import { useEffect, useState } from 'react'

export type PremiumImageMap = Record<string, string[]>

type PremiumImagesResponse = {
  byAddon?: PremiumImageMap
  maxPerAddon?: number
}

export function usePremiumUpgradeImages() {
  const [byAddon, setByAddon] = useState<PremiumImageMap>({})
  const [maxPerAddon, setMaxPerAddon] = useState(5)

  useEffect(() => {
    let cancelled = false
    fetch('/api/premium-upgrade-images', { credentials: 'omit' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PremiumImagesResponse | null) => {
        if (cancelled || !data) return
        setByAddon(data.byAddon ?? {})
        setMaxPerAddon(typeof data.maxPerAddon === 'number' ? data.maxPerAddon : 5)
      })
      .catch(() => {
        /* keep defaults */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return { byAddon, maxPerAddon }
}
