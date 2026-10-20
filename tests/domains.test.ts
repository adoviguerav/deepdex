import { describe, expect, it } from 'vitest'
import { blockLines } from '../src/main/hostsBlocker'
import { expandDomain, normalizeDomain } from '../src/shared/domains'

describe('normalizeDomain', () => {
  it('cleans up what people paste', () => {
    expect(normalizeDomain('https://www.Twitter.com/home')).toBe('twitter.com')
    expect(normalizeDomain('*.reddit.com')).toBe('reddit.com')
    expect(normalizeDomain('youtube.com:443')).toBe('youtube.com')
    expect(normalizeDomain(' web.whatsapp.com ')).toBe('web.whatsapp.com')
  })

  it('rejects anything that is not a domain', () => {
    for (const bad of ['', 'localhost', 'evil.com\n10.0.0.1 bank.com', "a.com'; rm -rf /", 'a b.com', '..', 'ünï.com']) {
      expect(normalizeDomain(bad)).toBeNull()
    }
  })
})

describe('blockLines', () => {
  it('blocks known subdomains too', () => {
    expect(expandDomain('reddit.com')).toEqual(expect.arrayContaining(['old.reddit.com', 'www.reddit.com', 'm.reddit.com']))
  })

  it('only ever emits lines that are safe inside single quotes in a root shell', () => {
    const lines = blockLines(['twitter.com', "x.com'; touch /tmp/pwned; '", 'evil.com\n1.2.3.4 bank.com', 'youtube.com'])
    expect(lines[0]).toBe('#DEEPDEX-BLOCK-START')
    expect(lines[lines.length - 1]).toBe('#DEEPDEX-BLOCK-END')
    for (const line of lines.slice(1, -1)) {
      expect(line).toMatch(/^(127\.0\.0\.1|::1) [a-z0-9.-]+$/)
    }
    expect(lines.some((l) => l.includes('bank.com'))).toBe(false)
    expect(lines).toContain('127.0.0.1 music.youtube.com')
  })
})
