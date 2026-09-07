import type { CompletionResult } from '../../../shared/types'

export default function CompletedScreen({
  result,
  onDismiss
}: {
  result: CompletionResult
  onDismiss: () => void
}): JSX.Element {
  const leveledUp = result.levelAfter > result.levelBefore
  return (
    <div className="app completed-screen">
      <div className="completed-title">¡SESIÓN COMPLETADA!</div>
      <div className="completed-xp">+{result.xpGained} XP</div>
      {leveledUp && (
        <div className="level-up">
          ¡SUBES A NIVEL {result.levelAfter}!
        </div>
      )}
      <div className="completed-stats">
        RACHA: {result.data.streak.current} DÍA{result.data.streak.current === 1 ? '' : 'S'}
      </div>
      <button className="start-btn" onClick={onDismiss}>
        CONTINUAR
      </button>
    </div>
  )
}
