import { useEffect, useState } from 'react'
import type { SyncStatus } from '../../../preload/index'

function timeAgo(ts: number | null): string {
  if (!ts) return 'nunca'
  const min = Math.round((Date.now() - ts) / 60000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  return h < 24 ? `hace ${h} h` : new Date(ts).toLocaleDateString('es-ES')
}

/** Connects this computer to the shared Supabase save. */
export default function SyncCard(): JSX.Element {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [editingKeys, setEditingKeys] = useState(false)
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void window.deepdex.getSyncStatus().then(setStatus)
    return window.deepdex.onSyncStatus(setStatus)
  }, [])

  const run = (action: () => Promise<SyncStatus>): void => {
    setBusy(true)
    void action()
      .then((s) => {
        setStatus(s)
        if (s.configured) setEditingKeys(false)
      })
      .finally(() => setBusy(false))
  }

  if (!status) return <section className="card" />

  const showKeys = !status.configured || editingKeys

  return (
    <section className="card sync-card">
      <h2 className="card-title">Sincronización</h2>

      {status.email ? (
        <div className="sync-row">
          <span className={status.error ? 'status-dot warn' : 'status-dot ok'} aria-hidden="true" />
          <div className="sync-text">
            <div>
              Conectado como <strong>{status.email}</strong>
            </div>
            <div className="field-hint">
              {status.syncing ? 'Sincronizando…' : `Última sincronización: ${timeAgo(status.lastSyncAt)}`}
            </div>
          </div>
        </div>
      ) : (
        <p className="settings-hint">
          Comparte tu progreso entre tus ordenadores: los Pokémon, las horas y la racha se juntan en
          una cuenta. Los pasos para crearla están en el README.
        </p>
      )}

      {status.error && (
        <p className="sync-error" role="alert">
          {status.error}
        </p>
      )}

      {showKeys && (
        <form
          className="sync-form"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => window.deepdex.configureSync(url, anonKey))
          }}
        >
          <label className="field">
            <span className="field-label">URL del proyecto de Supabase</span>
            <input
              className="input"
              placeholder="https://xxxx.supabase.co"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">Clave anon public</span>
            <input className="input" value={anonKey} onChange={(e) => setAnonKey(e.target.value)} />
          </label>
          <div className="sync-actions">
            {status.configured && (
              <button type="button" className="btn btn-secondary" onClick={() => setEditingKeys(false)}>
                Cancelar
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy || !url || !anonKey}>
              Guardar proyecto
            </button>
          </div>
        </form>
      )}

      {status.configured && !status.email && !editingKeys && (
        <form
          className="sync-form"
          onSubmit={(e) => {
            e.preventDefault()
            run(() => window.deepdex.signIn(email, password))
          }}
        >
          <label className="field">
            <span className="field-label">Email</span>
            <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Contraseña</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="sync-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy || !email || password.length < 6}
              onClick={() => run(() => window.deepdex.signUp(email, password))}
            >
              Crear cuenta
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy || !email || !password}>
              Entrar
            </button>
          </div>
          <button type="button" className="link-quiet" onClick={() => setEditingKeys(true)}>
            Cambiar proyecto de Supabase
          </button>
        </form>
      )}

      {status.email && (
        <div className="sync-actions">
          <button className="btn btn-secondary" onClick={() => run(() => window.deepdex.signOut())} disabled={busy}>
            Cerrar sesión
          </button>
          <button className="btn btn-primary" onClick={() => run(() => window.deepdex.syncNow())} disabled={busy || status.syncing}>
            Sincronizar ahora
          </button>
        </div>
      )}
    </section>
  )
}
