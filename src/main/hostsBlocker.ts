import { execFile } from 'child_process'
import { readFileSync } from 'fs'
import { promisify } from 'util'
import { expandDomain, normalizeDomain } from '../shared/domains'

const execFileP = promisify(execFile)

const START = '#DEEPDEX-BLOCK-START'
const END = '#DEEPDEX-BLOCK-END'
const HOSTS = '/etc/hosts'

/** Runs a shell command as admin via the standard macOS password dialog. */
async function adminShell(cmd: string): Promise<void> {
  const escaped = cmd.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  await execFileP('osascript', [
    '-e',
    `do shell script "${escaped}" with administrator privileges with prompt "DeepDex va a actualizar el bloqueo de webs"`
  ])
}

const STRIP = `/usr/bin/sed -i '' '/${START}/,/${END}/d' ${HOSTS}`
const FLUSH = `{ /usr/bin/dscacheutil -flushcache; /usr/bin/killall -HUP mDNSResponder; true; }`

/**
 * The hosts lines for a blocklist. Every hostname is validated against a
 * strict pattern, so the lines are safe inside single quotes in a root shell.
 */
export function blockLines(domains: string[]): string[] {
  const lines = [START]
  const seen = new Set<string>()
  for (const raw of domains) {
    const domain = normalizeDomain(raw)
    if (!domain) continue
    for (const host of expandDomain(domain)) {
      if (seen.has(host)) continue
      seen.add(host)
      lines.push(`127.0.0.1 ${host}`, `::1 ${host}`)
    }
  }
  lines.push(END)
  return lines
}

/**
 * Blocks domains system-wide by appending a marked section to /etc/hosts and
 * flushing the DNS cache. Engage/release each show one admin prompt.
 * Operations run strictly one after another, so a slow password dialog can
 * never interleave an engage with a release. Already-open connections survive
 * until the page reloads.
 */
export class HostsBlocker {
  /** True when the hosts file carries our block (best effort). */
  active = false
  private queue: Promise<unknown> = Promise.resolve()

  private run<T>(op: () => Promise<T>): Promise<T> {
    const next = this.queue.then(op, op)
    this.queue = next.catch(() => undefined)
    return next
  }

  /** Resolves true when the block is in place, false if cancelled or failed. */
  engage(domains: string[]): Promise<boolean> {
    return this.run(async () => {
      const lines = blockLines(domains)
      if (process.platform !== 'darwin' || lines.length <= 2) return false
      const quoted = lines.map((l) => `'${l}'`).join(' ')
      try {
        await adminShell(`${STRIP} && /usr/bin/printf '%s\\n' ${quoted} >> ${HOSTS} && ${FLUSH}`)
        this.active = true
        return true
      } catch (err) {
        // Most likely the user cancelled the password dialog.
        console.error('Hosts block failed:', err)
        return false
      }
    })
  }

  /** Resolves true when no block remains afterwards. */
  release(): Promise<boolean> {
    return this.run(async () => {
      if (process.platform !== 'darwin') return true
      if (!this.active && !this.hasBlock()) return true
      try {
        await adminShell(`${STRIP} && ${FLUSH}`)
        this.active = false
        return true
      } catch (err) {
        console.error('Hosts release failed:', err)
        return !this.hasBlock()
      }
    })
  }

  /** Whether /etc/hosts currently contains a DeepDex section. */
  hasBlock(): boolean {
    try {
      return readFileSync(HOSTS, 'utf-8').includes(START)
    } catch {
      return false
    }
  }
}
