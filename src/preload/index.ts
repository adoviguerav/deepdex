import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { PokeType } from '../shared/pokedex'
import type { CompletionResult, GameData, SessionState, Settings } from '../shared/types'
import type { ExportResult, ImportResult, UndoResult } from '../main/transfer'

export type { ExportResult, ImportResult, UndoResult }

export interface HostsStatus {
  /** Websites still blocked although no session is running. */
  lingering: boolean
}

export interface DeepdexApi {
  startSession(durationMin: number, topicId: string | null): Promise<SessionState>
  abortSession(): Promise<SessionState>
  getSession(): Promise<SessionState>
  getData(): Promise<GameData>
  updateSettings(partial: Partial<Settings>): Promise<GameData>
  setCompanion(pokemonId: number | null): Promise<GameData>
  createTopic(name: string, type: PokeType): Promise<GameData>
  deleteTopic(topicId: string): Promise<GameData>
  exportTopics(): Promise<{ saved: boolean; path?: string }>
  getPendingResult(): Promise<CompletionResult | null>
  ackResult(): Promise<void>
  getHostsStatus(): Promise<HostsStatus>
  releaseHosts(): Promise<HostsStatus>
  retryWebBlock(): Promise<SessionState>
  exportProgress(): Promise<ExportResult>
  importProgress(): Promise<ImportResult>
  undoImport(): Promise<UndoResult>
  onDataChanged(cb: () => void): () => void
  onSessionUpdate(cb: (state: SessionState) => void): () => void
  onOpenEmergency(cb: () => void): () => void
  onHostsChanged(cb: () => void): () => void
  onSessionCompleted(cb: (result: CompletionResult) => void): () => void
}

function subscribe<T>(channel: string, cb: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => cb(payload)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: DeepdexApi = {
  startSession: (durationMin, topicId) => ipcRenderer.invoke('session:start', durationMin, topicId),
  abortSession: () => ipcRenderer.invoke('session:abort'),
  getSession: () => ipcRenderer.invoke('session:get'),
  getData: () => ipcRenderer.invoke('data:get'),
  updateSettings: (partial) => ipcRenderer.invoke('settings:update', partial),
  setCompanion: (pokemonId) => ipcRenderer.invoke('companion:set', pokemonId),
  createTopic: (name, type) => ipcRenderer.invoke('topics:create', name, type),
  deleteTopic: (topicId) => ipcRenderer.invoke('topics:delete', topicId),
  exportTopics: () => ipcRenderer.invoke('topics:export'),
  getPendingResult: () => ipcRenderer.invoke('result:pending'),
  ackResult: () => ipcRenderer.invoke('result:ack'),
  getHostsStatus: () => ipcRenderer.invoke('hosts:status'),
  releaseHosts: () => ipcRenderer.invoke('hosts:release'),
  retryWebBlock: () => ipcRenderer.invoke('hosts:retry'),
  exportProgress: () => ipcRenderer.invoke('progress:export'),
  importProgress: () => ipcRenderer.invoke('progress:import'),
  undoImport: () => ipcRenderer.invoke('progress:undo-import'),
  onDataChanged: (cb) => subscribe('data:changed', cb),
  onSessionUpdate: (cb) => subscribe('session:update', cb),
  onOpenEmergency: (cb) => subscribe('session:open-emergency', cb),
  onHostsChanged: (cb) => subscribe('hosts:changed', cb),
  onSessionCompleted: (cb) => subscribe('session:completed', cb)
}

contextBridge.exposeInMainWorld('deepdex', api)
