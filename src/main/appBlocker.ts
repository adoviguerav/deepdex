import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileP = promisify(execFile)

/** Apps we refuse to kill no matter what the blocklist says. */
const PROTECTED = new Set(['deepdex', 'electron', 'finder', 'systemuiserver', 'dock'])

const POLL_MS = 2000
/** How long an app gets to quit politely before it is killed. */
const GRACE_MS = 6000
const OSASCRIPT_TIMEOUT_MS = 5000

/**
 * While engaged, polls the visible macOS application processes every couple
 * of seconds and quits any that match the blocklist: a polite AppleScript
 * quit first (without waiting for the app to answer), then a hard kill by PID
 * if it is still running after a few seconds.
 */
export class AppBlocker {
  private interval: ReturnType<typeof setInterval> | null = null
  private apps: string[] = []
  private quitRequestedAt = new Map<string, number>()
  private polling = false

  constructor(
    private onBlocked: () => void,
    /** Called with true when System Events can't be queried (missing permission). */
    private onPermissionIssue: (failing: boolean) => void
  ) {}

  engage(apps: string[]): void {
    this.release()
    if (process.platform !== 'darwin') return
    this.apps = apps.map((a) => a.trim()).filter((a) => a && !PROTECTED.has(a.toLowerCase()))
    if (this.apps.length === 0) return
    this.interval = setInterval(() => void this.poll(), POLL_MS)
    void this.poll()
  }

  release(): void {
    if (this.interval) {
      clearInterval(this.interval)
      this.interval = null
    }
    this.apps = []
    this.quitRequestedAt.clear()
  }

  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const { stdout } = await execFileP(
        'osascript',
        [
          '-e',
          'tell application "System Events" to get {name, unix id} of every application process whose background only is false'
        ],
        { timeout: OSASCRIPT_TIMEOUT_MS }
      )
      this.onPermissionIssue(false)
      const tokens = stdout.trim().split(', ')
      const half = tokens.length / 2
      if (!Number.isInteger(half)) return
      const names = tokens.slice(0, half).map((n) => n.trim())
      const pids = tokens.slice(half).map(Number)
      const now = Date.now()
      for (let i = 0; i < names.length; i++) {
        const name = names[i]
        if (!this.apps.some((app) => app.toLowerCase() === name.toLowerCase())) continue
        const requested = this.quitRequestedAt.get(name)
        if (requested === undefined) {
          this.quitRequestedAt.set(name, now)
          this.requestQuit(name)
          this.onBlocked()
        } else if (now - requested >= GRACE_MS && Number.isInteger(pids[i])) {
          this.kill(pids[i], name)
          this.quitRequestedAt.delete(name)
        }
      }
      for (const name of [...this.quitRequestedAt.keys()]) {
        if (!names.includes(name)) this.quitRequestedAt.delete(name)
      }
    } catch (err) {
      // -1743: the user hasn't allowed DeepDex to control System Events.
      const message = String((err as Error)?.message ?? err)
      if (message.includes('-1743') || message.includes('not allowed')) this.onPermissionIssue(true)
      console.error('App poll failed:', err)
    } finally {
      this.polling = false
    }
  }

  private requestQuit(name: string): void {
    const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    execFile(
      'osascript',
      ['-e', `ignoring application responses\ntell application "${escaped}" to quit\nend ignoring`],
      { timeout: OSASCRIPT_TIMEOUT_MS },
      (err) => {
        if (err) console.error(`Failed to ask ${name} to quit:`, err)
      }
    )
  }

  private kill(pid: number, name: string): void {
    try {
      process.kill(pid, 'SIGKILL')
    } catch (err) {
      console.error(`Failed to kill ${name} (${pid}):`, err)
    }
  }
}
