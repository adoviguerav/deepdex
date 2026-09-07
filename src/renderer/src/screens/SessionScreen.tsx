import type { SessionState } from '../../../shared/types'
import Egg from '../components/Egg'

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function SessionScreen({
  session,
  onAborted
}: {
  session: SessionState
  onAborted: () => void
}): JSX.Element {
  const progress =
    session.durationMin > 0 ? 1 - session.remainingSec / (session.durationMin * 60) : 0

  const abort = (): void => {
    // Phase 2 replaces this with the full emergency flow (phrase + 30s wait).
    void window.deepdex.abortSession().then(onAborted)
  }

  return (
    <div className="app session-screen">
      <div className="session-top">MODO FOCO</div>
      <div className="timer">{formatTime(session.remainingSec)}</div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {session.eggTier && (
        <div className="session-egg">
          <Egg tier={session.eggTier} wobble />
          <div className="egg-hint">El huevo se incuba con tu foco…</div>
        </div>
      )}
      <div className="blocked-counter">
        {session.blockedAttempts > 0
          ? `INTENTOS BLOQUEADOS: ${session.blockedAttempts}`
          : 'TODO EN CALMA'}
      </div>
      <button className="emergency-btn" onClick={abort}>
        ⚠ EMERGENCIA
      </button>
    </div>
  )
}
