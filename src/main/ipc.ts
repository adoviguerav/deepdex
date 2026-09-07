import { BrowserWindow, ipcMain } from 'electron'
import type { CompletionResult, SessionState, Settings } from '../shared/types'
import type { SessionEngine } from './session'
import type { Store } from './store'

export function registerIpc(store: Store, engine: SessionEngine, getWindow: () => BrowserWindow | null): void {
  ipcMain.handle('session:start', (_event, durationMin: number) => engine.start(durationMin))
  ipcMain.handle('session:abort', () => engine.abort())
  ipcMain.handle('session:get', () => engine.getState())
  ipcMain.handle('data:get', () => store.data)
  ipcMain.handle('companion:set', (_event, pokemonId: number | null) => {
    store.data.companionId =
      pokemonId !== null && store.data.caught[pokemonId] ? pokemonId : null
    store.save()
    return store.data
  })
  ipcMain.handle('settings:update', (_event, partial: Partial<Settings>) => {
    const settings = store.data.settings
    if (Array.isArray(partial.blocklistApps)) {
      settings.blocklistApps = partial.blocklistApps.map((s) => String(s).trim()).filter(Boolean)
    }
    if (Array.isArray(partial.blocklistDomains)) {
      settings.blocklistDomains = partial.blocklistDomains
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    }
    if (typeof partial.customDurationMin === 'number' && Number.isFinite(partial.customDurationMin)) {
      settings.customDurationMin = Math.max(10, Math.min(240, Math.round(partial.customDurationMin)))
    }
    store.save()
    return store.data
  })

  engine.on('update', (state: SessionState) => {
    getWindow()?.webContents.send('session:update', state)
  })
  engine.on('completed', (result: CompletionResult) => {
    getWindow()?.webContents.send('session:completed', result)
  })
}
