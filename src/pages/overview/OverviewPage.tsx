import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Banknote,
  BedDouble,
  CheckCircle2,
  Package,
  Plus,
  Scissors,
  ShoppingCart,
  UserPlus,
} from 'lucide-react'
import { useState } from 'react'
import { paths } from '@/app/routes/paths'
import {
  Alert,
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  MetricTile,
  PageHeader,
  Select,
} from '@/components/ui'
import { useOrganization, usePermission } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { formatMoney } from '@/lib/money/money'

const PERIOD_OPTIONS = [
  { value: '7', label: '7 Hari Terakhir' },
  { value: '14', label: '14 Hari Terakhir' },
  { value: '30', label: '30 Hari Terakhir' },
  { value: '90', label: '90 Hari Terakhir' },
] as const

export function OverviewPage() {
  const organization = useOrganization()
  const [daysWindow, setDaysWindow] = useState(30)

  const canCheckoutPos = usePermission('pos.checkout')
  const canCreateProducts = usePermission('products.create')
  const canCreateCustomers = usePermission('customers.create')
  const canCreateExpenses = usePermission('expenses.create')

  const { data, isLoading } = useQuery({
    queryKey: ['overview', organization.id, daysWindow],
    queryFn: () => api.getOverview(organization.id, daysWindow),
  })

  const summary = data?.summary
  const series = data?.series ?? []
  const currency = summary?.currency ?? organization.default_currency
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const maxChartVal = Math.max(
    1,
    ...series.map((pt) => Math.max(pt.pos_minor + pt.services_minor, pt.expenses_minor)),
  )

  const kennelTotal = Math.max(1, summary?.kennels_total ?? 0)
  const pct = (n: number) => `${Math.round((n / kennelTotal) * 100)}%`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ringkasan Operasional"
        description={`Pantauan langsung aktivitas ritel, grooming, dan Pet Hotel di ${organization.name}.`}
        actions={
          <>
            <div className="w-44">
              <Select
                aria-label="Periode laporan"
                value={String(daysWindow)}
                onChange={(e) => setDaysWindow(Number(e.target.value))}
                options={PERIOD_OPTIONS}
              />
            </div>
            {canCheckoutPos ? (
              <ButtonLink variant="primary" leadingIcon={<ShoppingCart />} to={paths.pos}>
                Buka Kasir POS
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {/* First-run setup checklist for brand-new Pet Shops */}
      {summary && summary.products_total === 0 ? (
        <Alert
          tone="info"
          title="Selamat datang di ruang kerja Pet Shop baru Anda!"
          actions={
            canCreateProducts ? (
              <ButtonLink variant="primary" size="sm" to={paths.products}>
                Tambah Produk Pertama
              </ButtonLink>
            ) : undefined
          }
        >
          Toko <strong>{organization.name}</strong> sudah siap dengan 2 kandang awal. Tambahkan
          katalog produk pakan/vitamin serta profil pelanggan untuk mulai mencatat transaksi.
        </Alert>
      ) : null}

      {/* Urgent stock or expiry alert banner */}
      {summary && (summary.low_stock_count > 0 || summary.expiring_products_count > 0) ? (
        <Alert
          tone="caution"
          title="Perhatian Gudang & Inventori Hari Ini"
          actions={
            <ButtonLink variant="secondary" size="sm" to={paths.products}>
              Periksa Stok
            </ButtonLink>
          }
        >
          Terdapat <strong>{summary.low_stock_count} produk stok menipis</strong> dan{' '}
          <strong>{summary.expiring_products_count} produk mendekati/melewati kedaluwarsa</strong>{' '}
          yang memerlukan tindak lanjut staf gudang.
        </Alert>
      ) : null}

      {/* Today's Operational Strip */}
      <section aria-label="Operasional Hari Ini" className="grid gap-4 sm:grid-cols-3">
        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="eyebrow">Antrean Grooming Hari Ini</p>
            <p data-numeric className="mt-1 text-lg font-semibold">
              {isLoading ? '...' : `${summary?.grooming_today_total ?? 0} Jadwal`}
            </p>
            <p className="text-ink-muted mt-0.5 text-xs">
              {summary?.grooming_today_active ?? 0} masih berlangsung / menunggu
            </p>
          </div>
          <ButtonLink variant="secondary" size="xs" to={paths.grooming}>
            Buka Antrean
          </ButtonLink>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="eyebrow">Check-In &amp; Check-Out Hotel</p>
            <p data-numeric className="mt-1 text-lg font-semibold">
              {isLoading
                ? '...'
                : `${summary?.boarding_checkins_today ?? 0} Masuk · ${summary?.boarding_checkouts_today ?? 0} Pulang`}
            </p>
            <p className="text-ink-muted mt-0.5 text-xs">
              {summary?.boarding_active_count ?? 0} hewan sedang menginap
            </p>
          </div>
          <ButtonLink variant="secondary" size="xs" to={paths.boarding}>
            Kontrak Hotel
          </ButtonLink>
        </Card>

        <Card className="flex items-center justify-between p-4">
          <div>
            <p className="eyebrow">Transaksi Kasir ({daysWindow} Hari)</p>
            <p data-numeric className="mt-1 text-lg font-semibold">
              {isLoading ? '...' : `${summary?.pos_orders_count ?? 0} Nota POS`}
            </p>
            <p className="text-ink-muted mt-0.5 text-xs">
              Omzet ritel {money(summary?.revenue_pos_minor ?? 0)}
            </p>
          </div>
          <ButtonLink variant="secondary" size="xs" to={paths.pos}>
            Kasir
          </ButtonLink>
        </Card>
      </section>

      {/* Financial Summary Tiles */}
      <section aria-label="Ringkasan Keuangan" className="space-y-2">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile
            label="Pendapatan Masuk"
            value={isLoading ? '...' : money(summary?.revenue_total_minor ?? 0)}
            caption={`POS ${money(summary?.revenue_pos_minor ?? 0)} + Jasa ${money((summary?.revenue_grooming_minor ?? 0) + (summary?.revenue_boarding_minor ?? 0))}`}
            emphasis="strong"
            badge={<Badge tone="positive">{daysWindow}H</Badge>}
          />
          <MetricTile
            label="Pengeluaran Tercatat"
            value={isLoading ? '...' : money(summary?.expenses_minor ?? 0)}
            caption="Belanja stok, utilitas & operasional"
            emphasis="strong"
          />
          <MetricTile
            label="Hasil Operasional"
            value={isLoading ? '...' : money(summary?.operating_result_minor ?? 0)}
            caption="Pendapatan masuk dikurangi biaya tercatat"
            emphasis="strong"
          />
          <MetricTile
            label="Piutang Layanan Aktif"
            value={isLoading ? '...' : money(summary?.outstanding_minor ?? 0)}
            caption="Sisa pelunasan Pet Hotel & Grooming"
            emphasis="strong"
            badge={
              (summary?.outstanding_minor ?? 0) > 0 ? (
                <Badge tone="caution">Belum Lunas</Badge>
              ) : (
                <Badge tone="neutral">Lunas</Badge>
              )
            }
          />
        </div>
        <p className="text-ink-subtle text-xs">
          Hasil operasional menghitung kas masuk dari nota POS, Grooming, dan pembayaran Pet Hotel
          dikurangi pengeluaran yang dicatat pada periode terpilih.
        </p>
      </section>

      {/* Kennel Fleet Occupancy + Companion Tiles (Direct adaptation of Atlas FleetStrip) */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="flex flex-col">
          <CardHeader
            title="Status Okupansi Kandang Pet Hotel"
            description={`${summary?.kennels_total ?? 0} unit ruang/kandang terdaftar di cabang ini`}
            actions={
              <ButtonLink variant="secondary" size="xs" to={paths.calendar}>
                Lihat Kalender Kandang
              </ButtonLink>
            }
          />
          <CardBody className="flex flex-1 flex-col justify-center space-y-4">
            {(summary?.kennels_total ?? 0) === 0 ? (
              <p className="text-ink-muted text-xs">Belum ada kandang terdaftar.</p>
            ) : (
              <>
                <div className="bg-surface-inset flex h-3 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-brand-600 transition-all"
                    style={{ width: pct(summary?.kennels_available ?? 0) }}
                    title="Tersedia"
                  />
                  <div
                    className="bg-info-600 transition-all"
                    style={{ width: pct(summary?.kennels_occupied ?? 0) }}
                    title="Terisi (Menginap)"
                  />
                  <div
                    className="bg-caution-600 transition-all"
                    style={{ width: pct(summary?.kennels_reserved_today ?? 0) }}
                    title="Dipesan Hari Ini"
                  />
                  <div
                    className="bg-[#b6bbc2] transition-all"
                    style={{ width: pct(summary?.kennels_maintenance ?? 0) }}
                    title="Sterilisasi / Perawatan"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                  <div className="border-line rounded-md border p-2.5">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <span className="bg-brand-600 size-2 rounded-full" /> Tersedia
                    </span>
                    <p data-numeric className="mt-1 text-base font-semibold">
                      {summary?.kennels_available ?? 0}
                    </p>
                  </div>
                  <div className="border-line rounded-md border p-2.5">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <span className="bg-info-600 size-2 rounded-full" /> Menginap
                    </span>
                    <p data-numeric className="mt-1 text-base font-semibold">
                      {summary?.kennels_occupied ?? 0}
                    </p>
                  </div>
                  <div className="border-line rounded-md border p-2.5">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <span className="bg-caution-600 size-2 rounded-full" /> Reservasi
                    </span>
                    <p data-numeric className="mt-1 text-base font-semibold">
                      {summary?.kennels_reserved_today ?? 0}
                    </p>
                  </div>
                  <div className="border-line rounded-md border p-2.5">
                    <span className="text-ink-muted flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#b6bbc2]" /> Sterilisasi
                    </span>
                    <p data-numeric className="mt-1 text-base font-semibold">
                      {summary?.kennels_maintenance ?? 0}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          <MetricTile
            label="Pelanggan Terdaftar"
            value={summary?.customers_total ?? 0}
            caption={`${summary?.pets_total ?? 0} profil hewan peliharaan aktif`}
          />
          <MetricTile
            label="Katalog Produk"
            value={summary?.products_total ?? 0}
            caption={
              (summary?.low_stock_count ?? 0) > 0 ? (
                <span className="text-caution-700 inline-flex items-center gap-1 font-medium">
                  <AlertTriangle className="size-3" /> {summary?.low_stock_count} perlu restock
                </span>
              ) : (
                <span className="text-positive-700 inline-flex items-center gap-1 font-medium">
                  <CheckCircle2 className="size-3" /> Semua stok aman
                </span>
              )
            }
          />
        </div>
      </div>

      {/* Revenue vs Expenses SVG Chart */}
      <Card>
        <CardHeader
          title="Tren Pendapatan (POS + Layanan) vs Pengeluaran"
          description="Perbandingan kas harian 14 hari terakhir dalam mata uang toko"
          actions={
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[var(--color-chart-revenue)]" /> POS Ritel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[var(--color-chart-service)]" /> Grooming &amp; Hotel
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-[var(--color-chart-expenses)]" /> Pengeluaran
              </span>
            </div>
          }
        />
        <CardBody>
          <div className="overflow-x-auto">
            <div className="grid min-w-[640px] grid-cols-14 items-end gap-2 pt-4 pb-1" style={{ height: 210 }}>
              {series.map((pt) => {
                const totalRev = pt.pos_minor + pt.services_minor
                const revHeightPct = Math.round((totalRev / maxChartVal) * 145)
                const posHeightPx =
                  totalRev > 0 ? Math.round((pt.pos_minor / totalRev) * revHeightPct) : 0
                const svcHeightPx = Math.max(0, revHeightPct - posHeightPx)
                const expHeightPx = Math.round((pt.expenses_minor / maxChartVal) * 145)

                return (
                  <div
                    key={pt.date_key}
                    className="group flex h-full flex-col items-center justify-end"
                    title={`${pt.bucket_label}\nPOS: ${money(pt.pos_minor)}\nJasa: ${money(pt.services_minor)}\nBiaya: ${money(pt.expenses_minor)}`}
                  >
                    <div className="flex w-full items-end justify-center gap-1">
                      <div className="flex w-3 flex-col justify-end overflow-hidden rounded-t-sm bg-[var(--color-surface-inset)]">
                        {svcHeightPx > 0 ? (
                          <div
                            style={{ height: svcHeightPx }}
                            className="w-full bg-[var(--color-chart-service)]"
                          />
                        ) : null}
                        {posHeightPx > 0 ? (
                          <div
                            style={{ height: posHeightPx }}
                            className="w-full bg-[var(--color-chart-revenue)]"
                          />
                        ) : null}
                        {totalRev === 0 ? <div className="h-[2px] w-full bg-[var(--color-line-strong)]" /> : null}
                      </div>
                      <div className="flex w-2.5 flex-col justify-end overflow-hidden rounded-t-sm">
                        {expHeightPx > 0 ? (
                          <div
                            style={{ height: expHeightPx }}
                            className="w-full rounded-t-sm bg-[var(--color-chart-expenses)]"
                          />
                        ) : (
                          <div className="h-[2px] w-full bg-[var(--color-line)]" />
                        )}
                      </div>
                    </div>
                    <span className="text-ink-subtle mt-2 text-[0.65rem] whitespace-nowrap">
                      {pt.bucket_label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Quick Actions */}
      <section aria-label="Aksi Cepat" className="flex flex-wrap items-center gap-2">
        <span className="eyebrow me-1">Mulai Cepat</span>
        {canCheckoutPos ? (
          <ButtonLink size="sm" leadingIcon={<Plus />} to={paths.pos}>
            Transaksi Kasir Baru
          </ButtonLink>
        ) : null}
        <ButtonLink size="sm" leadingIcon={<Scissors />} to={paths.grooming}>
          Jadwalkan Grooming
        </ButtonLink>
        <ButtonLink size="sm" leadingIcon={<BedDouble />} to={paths.boarding}>
          Check-In Pet Hotel
        </ButtonLink>
        {canCreateCustomers ? (
          <ButtonLink size="sm" leadingIcon={<UserPlus />} to={paths.customers}>
            Tambah Pelanggan &amp; Hewan
          </ButtonLink>
        ) : null}
        {canCreateProducts ? (
          <ButtonLink size="sm" leadingIcon={<Package />} to={paths.products}>
            Kelola Stok Produk
          </ButtonLink>
        ) : null}
        {canCreateExpenses ? (
          <ButtonLink size="sm" leadingIcon={<Banknote />} to={paths.expenses}>
            Catat Pengeluaran
          </ButtonLink>
        ) : null}
      </section>
    </div>
  )
}
