import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { app, BrowserWindow, ipcMain } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { mergeGameData } from '../shared/merge'
import type { GameData } from '../shared/types'
import type { Store } from './store'

export interface SyncStatus {
  /** A Supabase project URL and key have been entered. */
  configured: boolean
  url: string | null
  /** Signed-in account, or null. */
  email: string | null
  syncing: boolean
  lastSyncAt: number | null
  error: string | null
}

interface SyncConfig {
  url?: string
  anonKey?: string
  lastSyncAt?: number
}

const TABLE = 'deepdex_saves'
const PERIOD_MS = 10 * 60 * 1000
const DEBOUNCE_MS = 3000

function userFile(name: string): string {
  return join(app.getPath('userData'), name)
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf-8')) as T) : fallback
  } catch {
    return fallback
  }
}

/** Keeps the Supabase login across restarts, next to the app's data file. */
class FileAuthStorage {
  private path = userFile('deepdex-auth.json')
  private items: Record<string, string> = readJson(this.path, {})

  getItem(key: string): string | null {
    return this.items[key] ?? null
  }
  setItem(key: string, value: string): void {
    this.items[key] = value
    writeFileSync(this.path, JSON.stringify(this.items), 'utf-8')
  }
  removeItem(key: string): void {
    delete this.items[key]
    writeFileSync(this.path, JSON.stringify(this.items), 'utf-8')
  }
}

function friendlyError(err: unknown): string {
  const message = String((err as { message?: string })?.message ?? err)
  if (/invalid login credentials/i.test(message)) return 'Email o contraseña incorrectos.'
  if (/email not confirmed/i.test(message)) return 'Confirma tu email (revisa tu bandeja) y vuelve a entrar.'
  if (/already registered/i.test(message)) return 'Ese email ya tiene cuenta: usa «Entrar».'
  if (/password should be/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.'
  if (/relation .* does not exist|deepdex_saves/i.test(message))
    return 'Falta la tabla deepdex_saves en Supabase: ejecuta el SQL del README.'
  if (/fetch failed|network|ENOTFOUND|ECONNREFUSED|ETIMEDOUT/i.test(message))
    return 'Sin conexión. Se sincronizará en cuanto vuelva.'
  if (/invalid api key|jwt/i.test(message)) return 'La clave de Supabase no es válida: revisa la URL y la anon key.'
  return message
}

/**
 * Two-way sync of the whole progress with one row per account in Supabase.
 * Every sync downloads the remote copy, merges it with the local one (union
 * of session logs, see shared/merge.ts) and uploads the result, so two
 * computers converge even after working offline.
 */
export class SyncService {
  private config: SyncConfig = readJson(userFile('deepdex-sync.json'), {})
  private client: SupabaseClient | null = null
  private email: string | null = null
  private syncing = false
  private pendingAgain = false
  private error: string | null = null
  private debounce: ReturnType<typeof setTimeout> | null = null

  constructor(
    private store: Store,
    private getWindow: () => BrowserWindow | null
  ) {}

  async init(): Promise<void> {
    this.connectClient()
    if (this.client) {
      const { data } = await this.client.auth.getSession()
      this.email = data.session?.user.email ?? null
    }
    this.emitStatus()
    setInterval(() => void this.syncNow(), PERIOD_MS)
    void this.syncNow()
  }

  status(): SyncStatus {
    return {
      configured: Boolean(this.config.url && this.config.anonKey),
      url: this.config.url ?? null,
      email: this.email,
      syncing: this.syncing,
      lastSyncAt: this.config.lastSyncAt ?? null,
      error: this.error
    }
  }

  async configure(url: string, anonKey: string): Promise<SyncStatus> {
    const cleanUrl = String(url).trim().replace(/\/+$/, '')
    const cleanKey = String(anonKey).trim()
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleanUrl)) {
      this.error = 'La URL debe ser como https://xxxx.supabase.co'
      return this.emitStatus()
    }
    if (cleanKey.length < 20) {
      this.error = 'Pega la clave «anon public» completa.'
      return this.emitStatus()
    }
    this.config = { url: cleanUrl, anonKey: cleanKey }
    this.saveConfig()
    this.email = null
    this.error = null
    this.connectClient()
    return this.emitStatus()
  }

  async signIn(email: string, password: string): Promise<SyncStatus> {
    if (!this.client) return this.emitStatus()
    const { data, error } = await this.client.auth.signInWithPassword({ email: email.trim(), password })
    this.email = data.session?.user.email ?? null
    this.error = error ? friendlyError(error) : null
    this.emitStatus()
    if (this.email) await this.syncNow()
    return this.status()
  }

  async signUp(email: string, password: string): Promise<SyncStatus> {
    if (!this.client) return this.emitStatus()
    const { data, error } = await this.client.auth.signUp({ email: email.trim(), password })
    if (error) {
      this.error = friendlyError(error)
    } else if (!data.session) {
      this.error = 'Cuenta creada. Confirma el email que te ha llegado y luego pulsa «Entrar».'
    } else {
      this.error = null
      this.email = data.session.user.email ?? null
    }
    this.emitStatus()
    if (this.email) await this.syncNow()
    return this.status()
  }

  async signOut(): Promise<SyncStatus> {
    await this.client?.auth.signOut()
    this.email = null
    this.error = null
    return this.emitStatus()
  }

  /** Coalesces bursts of local edits into one sync. */
  schedule(): void {
    if (this.debounce) clearTimeout(this.debounce)
    this.debounce = setTimeout(() => void this.syncNow(), DEBOUNCE_MS)
  }

  async syncNow(): Promise<SyncStatus> {
    if (!this.client || !this.email) return this.status()
    if (this.syncing) {
      this.pendingAgain = true
      return this.status()
    }
    this.syncing = true
    this.emitStatus()
    try {
      const { data: auth, error: authError } = await this.client.auth.getUser()
      if (authError || !auth.user) throw authError ?? new Error('Sesión caducada: vuelve a entrar.')
      const { data: row, error: readError } = await this.client
        .from(TABLE)
        .select('data')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (readError) throw readError

      let merged: GameData = this.store.data
      if (row?.data) {
        merged = mergeGameData(this.store.data, row.data as GameData)
        this.store.replaceData(merged)
        this.getWindow()?.webContents.send('data:changed')
      }
      const { error: writeError } = await this.client
        .from(TABLE)
        .upsert({ user_id: auth.user.id, data: merged, updated_at: new Date().toISOString() })
      if (writeError) throw writeError

      this.config.lastSyncAt = Date.now()
      this.saveConfig()
      this.error = null
    } catch (err) {
      this.error = friendlyError(err)
      console.error('Sync failed:', err)
    } finally {
      this.syncing = false
      this.emitStatus()
    }
    if (this.pendingAgain) {
      this.pendingAgain = false
      return this.syncNow()
    }
    return this.status()
  }

  private connectClient(): void {
    this.client =
      this.config.url && this.config.anonKey
        ? createClient(this.config.url, this.config.anonKey, {
            auth: {
              storage: new FileAuthStorage(),
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: false
            }
          })
        : null
  }

  private saveConfig(): void {
    writeFileSync(userFile('deepdex-sync.json'), JSON.stringify(this.config, null, 2), 'utf-8')
  }

  private emitStatus(): SyncStatus {
    const status = this.status()
    this.getWindow()?.webContents.send('sync:status', status)
    return status
  }
}

export function registerSyncIpc(sync: SyncService): void {
  ipcMain.handle('sync:status', () => sync.status())
  ipcMain.handle('sync:configure', (_e, url: string, key: string) => sync.configure(url, key))
  ipcMain.handle('sync:signIn', (_e, email: string, password: string) => sync.signIn(email, password))
  ipcMain.handle('sync:signUp', (_e, email: string, password: string) => sync.signUp(email, password))
  ipcMain.handle('sync:signOut', () => sync.signOut())
  ipcMain.handle('sync:now', () => sync.syncNow())
}
