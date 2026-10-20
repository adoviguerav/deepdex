const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

/**
 * Turns user input like "https://www.Twitter.com/home" or "*.reddit.com" into
 * a bare domain ("twitter.com", "reddit.com"), or null when it isn't one.
 */
export function normalizeDomain(raw: string): string | null {
  const domain = String(raw)
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[/?#].*$/, '')
    .replace(/:\d+$/, '')
    .replace(/^\*\./, '')
    .replace(/^www\./, '')
    .replace(/\.$/, '')
  return DOMAIN_RE.test(domain) ? domain : null
}

/** Subdomains that serve the same distraction under another name. */
const KNOWN_EXTRAS: Record<string, string[]> = {
  'reddit.com': ['old.reddit.com', 'new.reddit.com', 'np.reddit.com'],
  'youtube.com': ['music.youtube.com', 'youtu.be'],
  'twitter.com': ['mobile.twitter.com'],
  'x.com': ['mobile.x.com'],
  'facebook.com': ['m.facebook.com', 'web.facebook.com'],
  'instagram.com': ['l.instagram.com'],
  'tiktok.com': ['vm.tiktok.com'],
  'discord.com': ['discordapp.com']
}

/** Every hostname to block for one normalized domain. */
export function expandDomain(domain: string): string[] {
  const hosts = [domain, `www.${domain}`, `m.${domain}`, `mobile.${domain}`, ...(KNOWN_EXTRAS[domain] ?? [])]
  return [...new Set(hosts)]
}
