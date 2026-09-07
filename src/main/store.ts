import { app } from 'electron'
import { existsSync, readFileSync, writeFileSync, renameSync } from 'fs'
import { join } from 'path'
import type { GameData } from '../shared/types'

export const DEFAULT_APPS = ['WhatsApp', 'Telegram', 'Discord']

export const DEFAULT_DOMAINS = [
  'web.whatsapp.com',
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
    streak: { current: 0, best: 0, lastDay: null },
    caught: {},
    badges: [],
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
  activeSession: { startedAt: number; durationMin: number } | null
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
    try {
      const raw = JSON.parse(readFileSync(file, 'utf-8')) as Partial<PersistedState>
      const defaults = defaultData()
      this.state = {
        data: {
          ...defaults,
          ...raw.data,
          streak: { ...defaults.streak, ...raw.data?.streak },
          settings: { ...defaults.settings, ...raw.data?.settings },
          caught: raw.data?.caught ?? {}
        },
        activeSession: raw.activeSession ?? null
      }
    } catch (err) {
      console.error('Failed to load data file, starting fresh:', err)
    }
  }

  save(): void {
    const file = dataPath()
    const tmp = file + '.tmp'
    writeFileSync(tmp, JSON.stringify(this.state, null, 2), 'utf-8')
    renameSync(tmp, file)
  }

  get data(): GameData {
    return this.state.data
  }

  get activeSession(): PersistedState['activeSession'] {
    return this.state.activeSession
  }

  setActiveSession(session: PersistedState['activeSession']): void {
    this.state.activeSession = session
    this.save()
  }
}
