import { execFile } from 'child_process'
import { app } from 'electron'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

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

function stripCmd(): string {
  return `/usr/bin/sed -i '' '/${START}/,/${END}/d' ${HOSTS}`
}

function flushCmd(): string {
  return `/usr/bin/dscacheutil -flushcache; /usr/bin/killall -HUP mDNSResponder || true`
}

function blockLines(domains: string[]): string {
  const lines: string[] = [START]
  for (const raw of domains) {
    const domain = raw.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim()
    if (!domain) continue
    const variants = domain.startsWith('www.') ? [domain] : [domain, `www.${domain}`]
    for (const v of variants) {
      lines.push(`127.0.0.1 ${v}`)
      lines.push(`::1 ${v}`)
    }
  }
  lines.push(END)
  return lines.join('\n') + '\n'
}

/**
 * Blocks domains system-wide by appending a marked section to /etc/hosts and
 * flushing the DNS cache. Engage/release each show one admin prompt. Note:
 * already-open connections survive until the page reloads.
 */
export class HostsBlocker {
  /** True when the hosts file currently carries our block (best effort). */
  active = false

  async engage(domains: string[]): Promise<boolean> {
    if (process.platform !== 'darwin' || domains.length === 0) return false
    const tmpFile = join(app.getPath('temp'), 'deepdex-hosts-block.txt')
    writeFileSync(tmpFile, blockLines(domains), 'utf-8')
    try {
      await adminShell(`${stripCmd()}; /bin/cat '${tmpFile}' >> ${HOSTS}; ${flushCmd()}`)
      this.active = true
      return true
    } catch (err) {
      // Most likely the user cancelled the password dialog.
      console.error('Hosts block failed:', err)
      return false
    }
  }

  async release(): Promise<void> {
    if (process.platform !== 'darwin') return
    if (!this.active && !this.hasOrphanBlock()) return
    try {
      await adminShell(`${stripCmd()}; ${flushCmd()}`)
      this.active = false
    } catch (err) {
      console.error('Hosts release failed (will be cleaned on next launch):', err)
    }
  }

  /** A block left behind by a crash/cancelled release. */
  hasOrphanBlock(): boolean {
    try {
      return readFileSync(HOSTS, 'utf-8').includes(START)
    } catch {
      return false
    }
  }

  async cleanupOrphan(): Promise<void> {
    if (process.platform === 'darwin' && this.hasOrphanBlock()) {
      console.warn('Found leftover hosts block from a previous run; removing it.')
      await this.release()
    }
  }
}
