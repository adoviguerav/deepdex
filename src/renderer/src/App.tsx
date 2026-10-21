import { useCallback, useEffect, useState } from 'react'
import type { CompletionResult, GameData, SessionState } from '../../shared/types'
import ScreenBoundary from './components/ScreenBoundary'
import CompletedScreen from './screens/CompletedScreen'
import Home from './screens/Home'
import HoursScreen from './screens/HoursScreen'
import PokedexScreen from './screens/PokedexScreen'
import SessionScreen from './screens/SessionScreen'
import SettingsScreen from './screens/SettingsScreen'
import TrainerScreen from './screens/TrainerScreen'

export type View = 'home' | 'hours' | 'pokedex' | 'trainer' | 'settings'

const NAV: { view: View; label: string }[] = [
  { view: 'home', label: 'Inicio' },
  { view: 'hours', label: 'Horas' },
  { view: 'pokedex', label: 'Pokédex' },
  { view: 'trainer', label: 'Ficha' },
  { view: 'settings', label: 'Ajustes' }
]

export default function App(): JSX.Element {
  const [data, setData] = useState<GameData | null>(null)
  const [session, setSession] = useState<SessionState | null>(null)
  const [result, setResult] = useState<CompletionResult | null>(null)
  const [view, setView] = useState<View>('home')

  useEffect(() => {
    void window.deepdex.getData().then(setData)
    void window.deepdex.getSession().then(setSession)
    // A session may have finished while the window was closed.
    void window.deepdex.getPendingResult().then((pending) => {
      if (pending) {
        setResult(pending)
        setData(pending.data)
      }
    })
    const offUpdate = window.deepdex.onSessionUpdate(setSession)
    // Progress merged from the other computer.
    const offData = window.deepdex.onDataChanged(() => void window.deepdex.getData().then(setData))
    const offCompleted = window.deepdex.onSessionCompleted((res) => {
      setResult(res)
      setData(res.data)
    })
    return () => {
      offUpdate()
      offData()
      offCompleted()
    }
  }, [])

  const refreshData = useCallback((): void => {
    void window.deepdex.getData().then(setData)
  }, [])

  const dismissResult = useCallback((): void => {
    setResult(null)
    void window.deepdex.ackResult()
  }, [])

  if (!data || !session) {
    return <div className="app loading">Cargando…</div>
  }

  if (result) {
    return <CompletedScreen result={result} onDismiss={dismissResult} />
  }

  if (session.phase === 'running') {
    return <SessionScreen session={session} onAborted={refreshData} />
  }

  return (
    <div className="app">
      <header className="topbar">
        <span className="lens" aria-hidden="true" />
        <span className="wordmark">DeepDex</span>
        <span className="topbar-meta">
          {Object.keys(data.caught).length} registrados
        </span>
      </header>
      <main className="app-content">
        <ScreenBoundary key={view}>
          {view === 'home' && <Home data={data} onDataChanged={setData} />}
          {view === 'hours' && <HoursScreen data={data} onDataChanged={setData} />}
          {view === 'pokedex' && <PokedexScreen data={data} onDataChanged={setData} />}
          {view === 'trainer' && <TrainerScreen data={data} />}
          {view === 'settings' && <SettingsScreen data={data} onDataChanged={setData} />}
        </ScreenBoundary>
      </main>
      <nav className="tabbar">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? 'tab active' : 'tab'}
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => setView(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
