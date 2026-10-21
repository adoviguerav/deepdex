import { app } from 'electron'
import {
  closeSync,
  copyFileSync,
  existsSync,
  fsyncSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  writeSync
} from 'fs'
import { join } from 'path'
import type { GameData } from '../shared/types'

export const DEFAULT_APPS = ['WhatsApp', 'Telegram', 'Discord']

export const DEFAULT_DOMAINS = [
  'web.whatsapp.com',
  'web.telegram.org',
  'discord.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'reddit.com',
  'tiktok.com',
  'facebook.com'
]

export function defaultData(): GameData {
  return {
    xp: 0,
    totalFocusMin: 0,
    sessionsCompleted: 0,
    sessionsAborted: 0,
    streak: { current: 0, best: 0, lastDay: null, shields: 0 },
    caught: {},
    badges: [],
    companionId: null,
    topics: [],
    sessionLog: [],
    settings: {
      blocklistApps: [...DEFAULT_APPS],
      blocklistDomains: [...DEFAULT_DOMAINS],
      customDurationMin: 60
    }
  }
}

/**
 * Extra persisted state outside the game data: lets us detect a session that
 * was killed mid-run (app crash or force quit) and count it as aborted.
 */
export interface PersistedState {
  data: GameData
  activeSession: { startedAt: number; durationMin: number; topicId: string | null } | null
}

function dataPath(): string {
  return join(app.getPath('userData'), 'deepdex-data.json')
}

export class Store {
  private state: PersistedState

  constructor() {
    this.state = { data: defaultData(), activeSession: null }
    this.load()
  }

  private load(): void {
    const file = dataPath()
    if (!existsSync(file)) return
    const parsed = this.parse(file)
    if (parsed) {
      this.state = parsed
      return
    }
    // Never overwrite a file we couldn't read: set it aside and fall back to
    // the backup written before the last successful save.
    const aside = file.replace(/\.json$/, `.corrupt-${Date.now()}.json`)
    try {
      renameSync(file, aside)
      console.error(`Data file unreadable; moved to ${aside}`)
    } catch (err) {
      console.error('Could not move unreadable data file:', err)
    }
    const backup = existsSync(file + '.bak') ? this.parse(file + '.bak') : null
    if (backup) {
      this.state = backup
      console.warn('Restored data from backup.')
    }
  }

  private parse(path: string): PersistedState | null {
    try {
      const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<PersistedState>
      const defaults = defaultData()
      return {
        data: {
          ...defaults,
          ...raw.data,
          streak: { ...defaults.streak, ...raw.data?.streak },
          settings: { ...defaults.settings, ...raw.data?.settings },
          caught: raw.data?.caught ?? {},
          sessionLog: (raw.data?.sessionLog ?? []).map((e) => ({ ...e, topicId: e.topicId ?? null }))
        },
        activeSession: raw.activeSession ?? null
      }
    } catch (err) {
      console.error(`Failed to read ${path}:`, err)
      return null
    }
  }

  save(): void {
    const file = dataPath()
    const tmp = file + '.tmp'
    const fd = openSync(tmp, 'w')
    try {
      writeSync(fd, JSON.stringify(this.state, null, 2))
      fsyncSync(fd)
    } finally {
      closeSync(fd)
    }
    if (existsSync(file)) copyFileSync(file, file + '.bak')
    renameSync(tmp, file)
  }

  get data(): GameData {
    return this.state.data
  }

  /** Swaps in progress merged from another computer. */
  replaceData(data: GameData): void {
    this.state.data = data
    this.save()
  }

  /**
   * Writes a full copy of the current progress next to the data file (for
   * example before an import) and keeps only the latest few of that kind.
   */
  snapshot(label: string): void {
    const dir = app.getPath('userData')
    const prefix = `deepdex-data.${label}-`
    writeFileSync(join(dir, `${prefix}${Date.now()}.json`), JSON.stringify(this.state, null, 2))
    const old = readdirSync(dir).filter((f) => f.startsWith(prefix)).sort().slice(0, -5)
    for (const f of old) unlinkSync(join(dir, f))
  }

  get activeSession(): PersistedState['activeSession'] {
    return this.state.activeSession
  }

  setActiveSession(session: PersistedState['activeSession']): void {
    this.state.activeSession = session
    this.save()
  }
}
