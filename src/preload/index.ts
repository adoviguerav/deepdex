import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { CompletionResult, GameData, SessionState, Settings } from '../shared/types'

export interface DeepdexApi {
  startSession(durationMin: number): Promise<SessionState>
  abortSession(): Promise<SessionState>
  getSession(): Promise<SessionState>
  getData(): Promise<GameData>
  updateSettings(partial: Partial<Settings>): Promise<GameData>
  setCompanion(pokemonId: number | null): Promise<GameData>
  onSessionUpdate(cb: (state: SessionState) => void): () => void
  onSessionCompleted(cb: (result: CompletionResult) => void): () => void
}

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: DeepdexApi = {
  startSession: (durationMin) => ipcRenderer.invoke('session:start', durationMin),
  abortSession: () => ipcRenderer.invoke('session:abort'),
  getSession: () => ipcRenderer.invoke('session:get'),
  getData: () => ipcRenderer.invoke('data:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),
  setCompanion: (pokemonId) => ipcRenderer.invoke('companion:set', pokemonId),
  onSessionUpdate: (cb) => subscribe('session:update', cb),
  onSessionCompleted: (cb) => subscribe('session:completed', cb)
}

contextBridge.exposeInMainWorld('deepdex', api)
