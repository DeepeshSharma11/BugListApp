/**
 * Device Performance Tier Detection
 * Returns 'low' | 'mid' | 'high'
 * Memoized — computed once, never re-evaluated.
 */
export type DeviceTier = 'low' | 'mid' | 'high'

let _cached: DeviceTier | null = null

export function getDeviceTier(): DeviceTier {
  if (_cached) return _cached

  const nav = navigator as any
  const cores: number = nav.hardwareConcurrency ?? 4
  const memGB: number = nav.deviceMemory ?? 4    // undefined on Firefox → fallback 4
  const conn = nav.connection?.effectiveType ?? '4g'

  const isSlow = conn === 'slow-2g' || conn === '2g'
  const isLowMem = memGB <= 2
  const isLowCore = cores <= 2

  // Low: <= 2 cores AND (<= 2 GB RAM OR slow network)
  if ((isLowCore && isLowMem) || (isLowCore && isSlow)) {
    _cached = 'low'
  }
  // Mid: <= 4 cores AND <= 4 GB RAM
  else if (cores <= 4 && memGB <= 4) {
    _cached = 'mid'
  }
  // High: everything else
  else {
    _cached = 'high'
  }

  return _cached
}

/** Returns true if the device should skip heavy animations */
export const skipAnimations = (): boolean => getDeviceTier() === 'low'

/** Returns transition duration string based on tier */
export const tierDuration = (): string => {
  const t = getDeviceTier()
  if (t === 'low') return '0ms'
  if (t === 'mid') return '150ms'
  return '220ms'
}
