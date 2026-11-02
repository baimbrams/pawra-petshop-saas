import { AppProviders } from './app/providers/AppProviders'
import { AppRouter } from './app/routes/AppRouter'
import { ErrorBoundary } from './components/feedback/ErrorBoundary'
import { SecurityConfigScreen } from './components/feedback/SecurityConfigScreen'
import { getEnvironment } from './lib/config/env'

export function App() {
  const env = getEnvironment()

  if (env.status === 'security_error') {
    return <SecurityConfigScreen problems={env.problems} />
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </ErrorBoundary>
  )
}
