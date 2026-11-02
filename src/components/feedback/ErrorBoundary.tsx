import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from '@/components/ui'

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="bg-canvas flex min-h-dvh items-center justify-center p-6">
          <Card className="max-w-lg p-6">
            <p className="eyebrow text-critical-600">Gangguan Aplikasi</p>
            <h1 className="mt-1 text-lg font-semibold">Terjadi kesalahan tak terduga</h1>
            <p className="text-ink-muted mt-2 text-xs leading-relaxed">
              {this.state.error.message}
            </p>
            <div className="mt-5 flex gap-2">
              <Button variant="primary" onClick={() => window.location.assign('/')}>
                Muat Ulang Beranda
              </Button>
            </div>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
