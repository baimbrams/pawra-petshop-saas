import { Suspense, lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { FullPageLoader } from '@/components/feedback/FullPageLoader'
import {
  RequireAnonymous,
  RequireAuth,
  RequireOrganization,
  RequirePermission,
} from './guards'
import { paths } from './paths'

const AppShell = lazy(() =>
  import('@/components/layout/AppShell').then((m) => ({ default: m.AppShell })),
)
const MarketingHomePage = lazy(() =>
  import('@/pages/marketing/MarketingHomePage').then((m) => ({ default: m.MarketingHomePage })),
)
const SignInPage = lazy(() =>
  import('@/pages/auth/SignInPage').then((m) => ({ default: m.SignInPage })),
)
const SignUpPage = lazy(() =>
  import('@/pages/auth/SignUpPage').then((m) => ({ default: m.SignUpPage })),
)
const CreateShopPage = lazy(() =>
  import('@/pages/onboarding/CreateShopPage').then((m) => ({ default: m.CreateShopPage })),
)
const OverviewPage = lazy(() =>
  import('@/pages/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const PosPage = lazy(() =>
  import('@/pages/pos/PosPage').then((m) => ({ default: m.PosPage })),
)
const ProductsPage = lazy(() =>
  import('@/pages/products/ProductsPage').then((m) => ({ default: m.ProductsPage })),
)
const GroomingPage = lazy(() =>
  import('@/pages/grooming/GroomingPage').then((m) => ({ default: m.GroomingPage })),
)
const BoardingPage = lazy(() =>
  import('@/pages/boarding/BoardingPage').then((m) => ({ default: m.BoardingPage })),
)
const KennelsPage = lazy(() =>
  import('@/pages/kennels/KennelsPage').then((m) => ({ default: m.KennelsPage })),
)
const CalendarPage = lazy(() =>
  import('@/pages/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })),
)
const CustomersPage = lazy(() =>
  import('@/pages/customers/CustomersPage').then((m) => ({ default: m.CustomersPage })),
)
const CustomerDetailPage = lazy(() =>
  import('@/pages/customers/CustomerDetailPage').then((m) => ({ default: m.CustomerDetailPage })),
)
const ExpensesPage = lazy(() =>
  import('@/pages/expenses/ExpensesPage').then((m) => ({ default: m.ExpensesPage })),
)
const ReportsPage = lazy(() =>
  import('@/pages/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
)
const TeamPage = lazy(() =>
  import('@/pages/team/TeamPage').then((m) => ({ default: m.TeamPage })),
)
const BillingPage = lazy(() =>
  import('@/pages/billing/BillingPage').then((m) => ({ default: m.BillingPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)
const NotificationsPage = lazy(() =>
  import('@/pages/notifications/NotificationsPage').then((m) => ({
    default: m.NotificationsPage,
  })),
)
const NotFoundPage = lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
)

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          {/* Public SaaS landing page always reachable at /landing */}
          <Route path={paths.landing} element={<MarketingHomePage />} />

          {/* Anonymous-only auth screens */}
          <Route element={<RequireAnonymous />}>
            <Route path={paths.signIn} element={<SignInPage />} />
            <Route path={paths.signUp} element={<SignUpPage />} />
          </Route>

          {/* Authenticated routes (with MarketingHomePage rendered at '/' when signed out) */}
          <Route element={<RequireAuth publicHome={<MarketingHomePage />} />}>
            <Route path={paths.createShop} element={<CreateShopPage />} />

            <Route element={<RequireOrganization />}>
              <Route element={<AppShell />}>
                <Route path={paths.overview} element={<OverviewPage />} />
                <Route path={paths.notifications} element={<NotificationsPage />} />
                <Route path={paths.settings} element={<SettingsPage />} />

                <Route element={<RequirePermission permission="pos.view" />}>
                  <Route path={paths.pos} element={<PosPage />} />
                </Route>

                <Route element={<RequirePermission permission="products.view" />}>
                  <Route path={paths.products} element={<ProductsPage />} />
                </Route>

                <Route element={<RequirePermission permission="grooming.view" />}>
                  <Route path={paths.grooming} element={<GroomingPage />} />
                </Route>

                <Route element={<RequirePermission permission="boarding.view" />}>
                  <Route path={paths.boarding} element={<BoardingPage />} />
                  <Route path={paths.calendar} element={<CalendarPage />} />
                </Route>

                <Route element={<RequirePermission permission="kennels.view" />}>
                  <Route path={paths.kennels} element={<KennelsPage />} />
                </Route>

                <Route element={<RequirePermission permission="customers.view" />}>
                  <Route path={paths.customers} element={<CustomersPage />} />
                  <Route path={paths.customerDetail} element={<CustomerDetailPage />} />
                </Route>

                <Route element={<RequirePermission permission="expenses.view" />}>
                  <Route path={paths.expenses} element={<ExpensesPage />} />
                </Route>

                <Route element={<RequirePermission permission="reports.view" />}>
                  <Route path={paths.reports} element={<ReportsPage />} />
                </Route>

                <Route element={<RequirePermission permission="team.view" />}>
                  <Route path={paths.team} element={<TeamPage />} />
                </Route>

                <Route element={<RequirePermission permission="billing.manage" />}>
                  <Route path={paths.billing} element={<BillingPage />} />
                </Route>

                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
