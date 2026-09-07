import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpc } from './ipc'
import { SessionEngine } from './session'
import { Store } from './store'

let mainWindow: BrowserWindow | null = null
let store: Store
let engine: SessionEngine

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 820,
    minWidth: 440,
    minHeight: 680,
    title: 'DeepDex',
    backgroundColor: '#f8f0d8',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  store = new Store()
  engine = new SessionEngine(store, {
    // Blockers are wired in phase 2; for now sessions run without blocking.
    engage: async () => {},
    release: async () => {}
  })
  if (engine.recoverOrphanSession()) {
    console.warn('Found a session killed mid-run; counted as aborted.')
  }
  registerIpc(store, engine, () => mainWindow)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

let quitting = false
app.on('before-quit', (event) => {
  if (quitting) return
  if (engine?.isRunning) {
    // Quitting DeepDex mid-session counts as an abort and must release blockers.
    event.preventDefault()
    quitting = true
    void engine.shutdown().finally(() => app.quit())
  }
})

app.on('window-all-closed', () => {
  // Keep running in the background during a session (tray lands in phase 4);
  // otherwise follow the platform convention.
  if (!engine?.isRunning && process.platform !== 'darwin') {
    app.quit()
  }
})
