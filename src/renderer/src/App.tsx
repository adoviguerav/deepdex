import { useEffect, useState } from 'react'
import type { CompletionResult, GameData, SessionState } from '../../shared/types'
import CompletedScreen from './screens/CompletedScreen'
import Home from './screens/Home'
import SessionScreen from './screens/SessionScreen'

export type View = 'home' | 'pokedex' | 'trainer' | 'settings'

const NAV: { view: View; label: string }[] = [
  { view: 'home', label: 'INICIO' },
  { view: 'pokedex', label: 'POKÉDEX' },
  { view: 'trainer', label: 'ENTRENADOR' },
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

  const refreshData = (): void => {
    void window.deepdex.getData().then(setData)
  }

  if (!data || !session) {
    return <div className="app loading">CARGANDO…</div>
  }

  if (result) {
    return <CompletedScreen result={result} onDismiss={() => setResult(null)} />
  }

  if (session.phase === 'running') {
    return <SessionScreen session={session} onAborted={refreshData} />
  }

  return (
    <div className="app">
      <main className="app-content">
        {view === 'home' && <Home data={data} />}
        {view === 'pokedex' && <div className="placeholder">POKÉDEX — fase 3</div>}
        {view === 'trainer' && <div className="placeholder">ENTRENADOR — fase 4</div>}
        {view === 'settings' && <div className="placeholder">AJUSTES — fase 2</div>}
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
