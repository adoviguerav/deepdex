import { Component, type ReactNode } from 'react'

/** Keeps one broken screen from blanking the whole window: the tab bar stays usable. */
export default class ScreenBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error }
  }

  componentDidCatch(error: Error): void {
    console.error('Screen crashed:', error)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <section className="card">
        <h2 className="card-title">Algo ha fallado</h2>
        <p className="settings-hint">
          Esta pantalla no se ha podido mostrar. Tu progreso sigue guardado: prueba otra pestaña o reinicia la app.
        </p>
        <p className="field-hint">{this.state.error.message}</p>
      </section>
    )
  }
}
