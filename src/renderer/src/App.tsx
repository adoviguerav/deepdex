import { useCallback, useEffect, useState } from 'react'
import type { CompletionResult, GameData, SessionState } from '../../shared/types'
import CompletedScreen from './screens/CompletedScreen'
import Home from './screens/Home'
import HoursScreen from './screens/HoursScreen'
import PokedexScreen from './screens/PokedexScreen'
import SessionScreen from './screens/SessionScreen'
import SettingsScreen from './screens/SettingsScreen'
import TrainerScreen from './screens/TrainerScreen'

export type View = 'home' | 'hours' | 'pokedex' | 'trainer' | 'settings'

const NAV: { view: View; label: string }[] = [
  { view: 'home', label: 'INICIO' },
  { view: 'hours', label: 'HORAS' },
  { view: 'pokedex', label: 'POKÉDEX' },
  { view: 'trainer', label: 'ENTRENA.' },
  { view: 'settings', label: 'AJUSTES' }
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
    const offCompleted = window.deepdex.onSessionCompleted((res) => {
      setResult(res)
      setData(res.data)
    })
    return () => {
      offUpdate()
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
    return <div className="app loading">CARGANDO…</div>
  }

  if (result) {
    return <CompletedScreen result={result} onDismiss={dismissResult} />
  }

  if (session.phase === 'running') {
    return <SessionScreen session={session} onAborted={refreshData} />
  }

  return (
    <div className="app">
      <main className="app-content">
        {view === 'home' && <Home data={data} onDataChanged={setData} />}
        {view === 'hours' && <HoursScreen data={data} onDataChanged={setData} />}
        {view === 'pokedex' && <PokedexScreen data={data} onDataChanged={setData} />}
        {view === 'trainer' && <TrainerScreen data={data} />}
        {view === 'settings' && <SettingsScreen data={data} onDataChanged={setData} />}
      </main>
      <nav className="tabbar">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={view === item.view ? 'tab active' : 'tab'}
            onClick={() => setView(item.view)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
