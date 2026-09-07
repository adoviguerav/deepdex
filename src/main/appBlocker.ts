import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileP = promisify(execFile)

/** Apps we refuse to kill no matter what the blocklist says. */
const PROTECTED = new Set(['deepdex', 'electron', 'finder', 'systemuiserver', 'dock'])

const POLL_MS = 2000

/**
 * While engaged, polls the visible macOS application processes every couple
 * of seconds and quits any that match the blocklist. A polite AppleScript
 * quit first; if the app is still there on the next poll (e.g. it showed a
 * "save changes?" dialog), a hard kill.
 */
export class AppBlocker {
  private interval: ReturnType<typeof setInterval> | null = null
  private apps: string[] = []
  private pendingHardKill = new Set<string>()
  private polling = false

  constructor(private onBlocked: () => void) {}

  engage(apps: string[]): void {
    this.release()
    if (process.platform !== 'darwin') return
    this.apps = apps.filter((a) => !PROTECTED.has(a.toLowerCase()))
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
    this.pendingHardKill.clear()
  }

  private async poll(): Promise<void> {
    if (this.polling) return
    this.polling = true
    try {
      const { stdout } = await execFileP('osascript', [
        '-e',
        'tell application "System Events" to get name of every application process whose background only is false'
      ])
      const running = stdout
        .trim()
        .split(', ')
        .map((name) => name.trim())
        .filter(Boolean)
      for (const name of running) {
        const match = this.apps.find((app) => app.toLowerCase() === name.toLowerCase())
        if (!match) continue
        await this.quit(name)
        this.onBlocked()
      }
    } catch (err) {
      console.error('App poll failed:', err)
    } finally {
      this.polling = false
    }
  }

  private async quit(name: string): Promise<void> {
    const escaped = name.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
    try {
      if (this.pendingHardKill.has(name)) {
        await execFileP('pkill', ['-9', '-x', name])
        this.pendingHardKill.delete(name)
      } else {
        this.pendingHardKill.add(name)
        await execFileP('osascript', ['-e', `tell application "${escaped}" to quit`])
      }
    } catch (err) {
      console.error(`Failed to quit ${name}:`, err)
    }
  }
}
