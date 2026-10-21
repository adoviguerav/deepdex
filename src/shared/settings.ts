import { normalizeDomain } from './domains'
import type { Settings } from './types'

/**
 * Applies whatever valid fields `partial` carries on top of `base`. Used both
 * for edits from the settings screen and for settings imported from a file,
 * since both end up in osascript and /etc/hosts.
 */
export function cleanSettings(partial: unknown, base: Settings): Settings {
  const p = (typeof partial === 'object' && partial !== null ? partial : {}) as Record<string, unknown>
  const out: Settings = { ...base }
  if (Array.isArray(p.blocklistApps)) {
    out.blocklistApps = [...new Set(p.blocklistApps.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean))]
  }
  if (Array.isArray(p.blocklistDomains)) {
    const valid = p.blocklistDomains.map((d) => (typeof d === 'string' ? normalizeDomain(d) : null))
    out.blocklistDomains = [...new Set(valid.filter((d): d is string => d !== null))]
  }
  if (typeof p.customDurationMin === 'number' && Number.isFinite(p.customDurationMin)) {
    out.customDurationMin = Math.max(10, Math.min(240, Math.round(p.customDurationMin)))
  }
  return out
}
