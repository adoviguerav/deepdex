import { app, BrowserWindow, dialog, powerMonitor, powerSaveBlocker, shell } from 'electron'
import { join } from 'path'
import { AppBlocker } from './appBlocker'
import { HostsBlocker } from './hostsBlocker'
import { registerIpc } from './ipc'
import { SessionEngine } from './session'
import { Store } from './store'
import { createTray } from './tray'

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
    if (url.startsWith('https:')) void shell.openExternal(url)
    return { action: 'deny' }
  })
  // A dropped file or link must never replace the app page (it would get window.deepdex).
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault())

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function showWindow(): BrowserWindow {
  if (!mainWindow) createWindow()
  mainWindow!.show()
  mainWindow!.focus()
  return mainWindow!
}

let quitting = false
let systemShutdown = false

app.whenReady().then(() => {
  store = new Store()
  const appBlocker = new AppBlocker(
    () => engine.reportBlockedAttempt(),
    (failing) => engine.setAppBlockIssue(failing)
  )
  const hostsBlocker = new HostsBlocker()
  // Bumped on every engage/release so a password dialog answered late can
  // tell that its session is already over.
  let generation = 0
  let suspensionBlocker: number | null = null

  const engageWeb = async (): Promise<void> => {
    const gen = ++generation
    const domains = store.data.settings.blocklistDomains
    if (process.platform !== 'darwin' || domains.length === 0) {
      engine.setWebBlock('none')
      return
    }
    engine.setWebBlock('pending')
    const ok = await hostsBlocker.engage(domains)
    if (gen !== generation || !engine.isRunning) {
      await hostsBlocker.release()
      return
    }
    engine.setWebBlock(ok ? 'on' : 'off')
  }

  engine = new SessionEngine(store, {
    engage: async () => {
      // Keep macOS from throttling the timers that close apps while DeepDex sits in the background.
      suspensionBlocker = powerSaveBlocker.start('prevent-app-suspension')
      appBlocker.engage(store.data.settings.blocklistApps)
      await engageWeb()
    },
    release: async () => {
      generation++
      if (suspensionBlocker !== null) {
        powerSaveBlocker.stop(suspensionBlocker)
        suspensionBlocker = null
      }
      appBlocker.release()
      await hostsBlocker.release()
      mainWindow?.webContents.send('hosts:changed')
    }
  })
  if (engine.recoverOrphanSession()) {
    console.warn('Found a session killed mid-run; counted as aborted.')
  }
  if (hostsBlocker.hasBlock()) {
    console.warn('Found leftover hosts block from a previous run; removing it.')
    void hostsBlocker.release().then(() => mainWindow?.webContents.send('hosts:changed'))
  }
  registerIpc({ store, engine, hostsBlocker, getWindow: () => mainWindow, showWindow, retryWeb: engageWeb })
  createWindow()
  createTray(engine, showWindow, () => app.quit())

  powerMonitor.on('shutdown', () => {
    systemShutdown = true
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', (event) => {
  if (quitting || !engine?.isRunning) return
  event.preventDefault()
  if (!systemShutdown) {
    // Quitting must not be a shortcut around the emergency exit.
    const choice = dialog.showMessageBoxSync({
      type: 'warning',
      message: 'Hay una sesión de foco en curso',
      detail: 'Para salir antes de tiempo usa la salida de emergencia de la sesión.',
      buttons: ['Seguir en foco', 'Ir a la salida de emergencia'],
      defaultId: 0,
      cancelId: 0
    })
    if (choice === 1) showWindow().webContents.send('session:open-emergency')
    return
  }
  // Logging out or shutting down: count the session as aborted and clean up.
  quitting = true
  void engine.shutdown().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  // On macOS the app lives on in the menu bar; elsewhere close unless a session runs.
  if (!engine?.isRunning && process.platform !== 'darwin') {
    app.quit()
  }
})
