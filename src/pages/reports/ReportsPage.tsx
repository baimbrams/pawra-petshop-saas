import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { Button, Card, CardBody, CardHeader, MetricTile, PageHeader } from '@/components/ui'
import { useOrganization } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/data/labels'
import { formatMoney, toMajorUnits } from '@/lib/money/money'
import { buildCsv, downloadCsv } from '@/lib/utils/csv'
import type { ExpenseCategory } from '@/types/domain'

export function ReportsPage() {
  const organization = useOrganization()
  const currency = organization.default_currency
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const { data: orders = [] } = useQuery({
    queryKey: ['pos-orders', organization.id],
    queryFn: () => api.listPosOrders(organization.id),
  })

  const { data: grooming = [] } = useQuery({
    queryKey: ['grooming', organization.id],
    queryFn: () => api.listGrooming(organization.id),
  })

  const { data: boarding = [] } = useQuery({
    queryKey: ['boarding', organization.id],
    queryFn: () => api.listBoardingStays(organization.id),
  })

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', organization.id],
    queryFn: () => api.listExpenses(organization.id),
  })

  const posTotal = orders.reduce((acc, o) => acc + o.total_minor, 0)
  const groomingTotal = grooming
    .filter((g) => g.status !== 'cancelled')
    .reduce((acc, g) => acc + g.paid_minor, 0)
  const boardingTotal = boarding
    .filter((b) => b.status !== 'cancelled')
    .reduce((acc, b) => acc + b.total_paid_minor, 0)
  const totalRevenue = posTotal + groomingTotal + boardingTotal
  const totalExpenses = expenses
    .filter((e) => !e.is_voided)
    .reduce((acc, e) => acc + e.amount_minor, 0)

  const topProducts = useMemo(() => {
    const map = new Map<string, { sku: string; name: string; qty: number; revenue: number }>()
    for (const order of orders) {
      for (const item of order.items) {
        const cur = map.get(item.product_id) ?? {
          sku: item.sku,
          name: item.product_name,
          qty: 0,
          revenue: 0,
        }
        cur.qty += item.qty
        cur.revenue += item.subtotal_minor
        map.set(item.product_id, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 6)
  }, [orders])

  const expenseByCategory = useMemo(() => {
    const map = new Map<ExpenseCategory, number>()
    for (const e of expenses.filter((x) => !x.is_voided)) {
      map.set(e.category, (map.get(e.category) ?? 0) + e.amount_minor)
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1])
  }, [expenses])

  const exportFinancialCsv = () => {
    const csv = buildCsv(
      ['Sumber / Kategori', 'Tipe', 'Nominal', 'Mata Uang'],
      [
        ['Penjualan Ritel POS', 'Pendapatan', toMajorUnits(posTotal, currency), currency],
        ['Layanan Grooming', 'Pendapatan', toMajorUnits(groomingTotal, currency), currency],
        ['Layanan Pet Hotel', 'Pendapatan', toMajorUnits(boardingTotal, currency), currency],
        ...expenseByCategory.map(([cat, amt]) => [
          EXPENSE_CATEGORY_LABELS[cat],
          'Pengeluaran',
          -toMajorUnits(amt, currency),
          currency,
        ]),
        [
          'Hasil Operasional Bersih',
          'Ringkasan',
          toMajorUnits(totalRevenue - totalExpenses, currency),
          currency,
        ],
      ],
    )
    downloadCsv(`laporan-keuangan-${organization.slug}.csv`, csv)
  }

  const pct = (part: number) =>
    totalRevenue > 0 ? `${Math.round((part / totalRevenue) * 100)}%` : '0%'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Laporan & Analitik Bisnis"
        description={`Evaluasi kontribusi pendapatan POS, Grooming, dan Pet Hotel terhadap biaya operasional ${organization.name}.`}
        actions={
          <Button variant="secondary" leadingIcon={<Download />} onClick={exportFinancialCsv}>
            Unduh Laporan CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="Total Pendapatan Masuk"
          value={money(totalRevenue)}
          caption="Gabungan 3 lini bisnis"
          emphasis="strong"
        />
        <MetricTile
          label="Kontribusi Kasir POS"
          value={money(posTotal)}
          caption={`${pct(posTotal)} dari total omzet`}
        />
        <MetricTile
          label="Kontribusi Jasa (Grooming + Hotel)"
          value={money(groomingTotal + boardingTotal)}
          caption={`Grooming ${money(groomingTotal)} · Hotel ${money(boardingTotal)}`}
        />
        <MetricTile
          label="Hasil Operasional Bersih"
          value={money(totalRevenue - totalExpenses)}
          caption={`Setelah dikurangi biaya ${money(totalExpenses)}`}
          emphasis="strong"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Produk Terlaris (Top Selling SKU)"
            description="Diurutkan berdasarkan nilai penjualan pada kasir POS"
          />
          <CardBody>
            {topProducts.length === 0 ? (
              <p className="text-ink-muted text-xs">Belum ada data penjualan produk.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {topProducts.map((item) => (
                  <div
                    key={item.sku}
                    className="border-line flex items-center justify-between border-b pb-2.5 last:border-none"
                  >
                    <div className="min-w-0 pr-3">
                      <p className="truncate font-semibold">{item.name}</p>
                      <p className="identifier text-ink-subtle text-[0.6875rem]">
                        {item.sku} · {item.qty} terjual
                      </p>
                    </div>
                    <span data-numeric className="shrink-0 font-semibold">
                      {money(item.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Rincian Pengeluaran per Kategori"
            description="Distribusi pos biaya operasional toko"
          />
          <CardBody>
            {expenseByCategory.length === 0 ? (
              <p className="text-ink-muted text-xs">Belum ada pengeluaran tercatat.</p>
            ) : (
              <div className="space-y-3 text-xs">
                {expenseByCategory.map(([cat, amount]) => {
                  const width =
                    totalExpenses > 0 ? Math.max(4, Math.round((amount / totalExpenses) * 100)) : 0
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                        <span data-numeric className="font-semibold">
                          {money(amount)}
                        </span>
                      </div>
                      <div className="bg-surface-inset h-2 w-full overflow-hidden rounded-full">
                        <div
                          className="h-full bg-[var(--color-chart-expenses)]"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
