import { EventEmitter } from 'events'
import type { CompletionResult, SessionState, WebBlockState } from '../shared/types'
import { eggTierForDuration } from '../shared/types'
import { grantCompletion, recordAbort } from './game'
import type { Store } from './store'

export interface SessionHooks {
  /** Called when a session starts; engages the blockers. */
  engage: () => Promise<void>
  /** Called when a session ends (completed or aborted); releases the blockers. */
  release: () => Promise<void>
}

function idleState(): SessionState {
  return {
    phase: 'idle',
    durationMin: 0,
    startedAt: null,
    remainingSec: 0,
    blockedAttempts: 0,
    eggTier: null,
    webBlock: 'none',
    appBlockIssue: false,
    topicId: null,
    topicName: null
  }
}

/**
 * The session timer lives here, in the main process, so it keeps running if
 * the window reloads and can drive the tray title.
 *
 * Events: 'update' (SessionState), 'completed' (CompletionResult)
 */
export class SessionEngine extends EventEmitter {
  private timer: ReturnType<typeof setInterval> | null = null
  private state: SessionState = idleState()

  constructor(
    private store: Store,
    private hooks: SessionHooks
  ) {
    super()
  }

  getState(): SessionState {
    return { ...this.state }
  }

  get isRunning(): boolean {
    return this.state.phase === 'running'
  }

  /** Counts a session killed by a crash/force-quit (found on startup) as aborted. */
  recoverOrphanSession(): boolean {
    const orphan = this.store.activeSession
    if (!orphan) return false
    recordAbort(this.store.data, {
      startedAt: orphan.startedAt,
      elapsedMin: Math.min(
        orphan.durationMin,
        Math.round((Date.now() - orphan.startedAt) / 60000)
      ),
      topicId: orphan.topicId
    })
    this.store.setActiveSession(null)
    return true
  }

  start(durationMin: number, topicId: string | null = null): SessionState {
    if (this.isRunning) return this.getState()
    if (!Number.isFinite(durationMin)) return this.getState()
    const minutes = Math.max(10, Math.min(240, Math.round(durationMin)))
    const topic = this.store.data.topics.find((t) => t.id === topicId) ?? null
    this.state = {
      phase: 'running',
      durationMin: minutes,
      startedAt: Date.now(),
      remainingSec: minutes * 60,
      blockedAttempts: 0,
      eggTier: eggTierForDuration(minutes),
      webBlock: 'pending',
      appBlockIssue: false,
      topicId: topic?.id ?? null,
      topicName: topic?.name ?? null
    }
    this.store.setActiveSession({
      startedAt: this.state.startedAt!,
      durationMin: minutes,
      topicId: topic?.id ?? null
    })
    void this.hooks.engage()
    this.timer = setInterval(() => this.tick(), 1000)
    this.emitUpdate()
    return this.getState()
  }

  abort(): SessionState {
    if (!this.isRunning) return this.getState()
    this.stopTimer()
    recordAbort(this.store.data, this.elapsedInfo())
    this.store.setActiveSession(null)
    this.store.save()
    void this.hooks.release()
    this.state = idleState()
    this.emitUpdate()
    return this.getState()
  }

  setWebBlock(webBlock: WebBlockState): void {
    if (!this.isRunning) return
    this.state.webBlock = webBlock
    this.emitUpdate()
  }

  setAppBlockIssue(failing: boolean): void {
    if (!this.isRunning || this.state.appBlockIssue === failing) return
    this.state.appBlockIssue = failing
    this.emitUpdate()
  }

  reportBlockedAttempt(): void {
    if (!this.isRunning) return
    this.state.blockedAttempts += 1
    this.emitUpdate()
  }

  /** Release blockers without touching state; used on app quit. */
  async shutdown(): Promise<void> {
    if (this.isRunning) {
      this.stopTimer()
      recordAbort(this.store.data, this.elapsedInfo())
      this.store.setActiveSession(null)
      this.store.save()
      await this.hooks.release()
    }
  }

  private tick(): void {
    // Recompute from the wall clock so sleep/lid-close doesn't stretch the session.
    const elapsedSec = Math.floor((Date.now() - (this.state.startedAt ?? Date.now())) / 1000)
    this.state.remainingSec = Math.max(0, this.state.durationMin * 60 - elapsedSec)
    if (this.state.remainingSec <= 0) {
      this.complete()
    } else {
      this.emitUpdate()
    }
  }

  private elapsedInfo(): { startedAt: number; elapsedMin: number; topicId: string | null } {
    const startedAt = this.state.startedAt ?? Date.now()
    return {
      startedAt,
      elapsedMin: Math.min(
        this.state.durationMin,
        Math.round((Date.now() - startedAt) / 60000)
      ),
      topicId: this.state.topicId
    }
  }

  private complete(): void {
    this.stopTimer()
    const { durationMin, eggTier, topicId, startedAt } = this.state
    const result: CompletionResult = grantCompletion(this.store.data, {
      durationMin,
      eggTier: eggTier!,
      topicId,
      startedAt: startedAt ?? Date.now()
    })
    this.store.setActiveSession(null)
    this.store.save()
    void this.hooks.release()
    this.state = idleState()
    this.emitUpdate()
    this.emit('completed', result)
  }

  private stopTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private emitUpdate(): void {
    this.emit('update', this.getState())
  }
}
