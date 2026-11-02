import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Ban, Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  MetricTile,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { EXPENSE_CATEGORY_LABELS } from '@/lib/data/labels'
import { formatDateId, todayIsoDate } from '@/lib/datetime/dates'
import { formatMoney, toMinorUnits } from '@/lib/money/money'
import type { ExpenseCategory } from '@/types/domain'

export function ExpensesPage() {
  const organization = useOrganization()
  const { user } = useWorkspace()
  const canCreate = usePermission('expenses.create')
  const canVoid = usePermission('expenses.void')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const currency = organization.default_currency
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const [isOpen, setIsOpen] = useState(false)
  const [expenseDate, setExpenseDate] = useState(today)
  const [category, setCategory] = useState<ExpenseCategory>('inventory_restock')
  const [vendorName, setVendorName] = useState('')
  const [description, setDescription] = useState('')
  const [amountMajor, setAmountMajor] = useState('')

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', organization.id],
    queryFn: () => api.listExpenses(organization.id),
  })

  const activeExpenses = expenses.filter((e) => !e.is_voided)
  const totalSpent = activeExpenses.reduce((acc, e) => acc + e.amount_minor, 0)

  const createMutation = useMutation({
    mutationFn: () =>
      api.createExpense(organization.id, {
        expense_date: expenseDate,
        category,
        vendor_name: vendorName,
        description,
        amount_minor: toMinorUnits(amountMajor, currency),
        recorded_by: user?.full_name ?? 'Manajer',
      }),
    onSuccess: (created) => {
      setIsOpen(false)
      setVendorName('')
      setDescription('')
      setAmountMajor('')
      void queryClient.invalidateQueries({ queryKey: ['expenses', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Pengeluaran ${created.reference_code} dicatat`,
        description: money(created.amount_minor),
      })
    },
  })

  const voidMutation = useMutation({
    mutationFn: (id: string) => api.voidExpense(organization.id, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['expenses', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: 'Catatan pengeluaran dibatalkan (Void)',
        description: 'Baris tetap disimpan untuk jejak audit tetapi dikeluarkan dari total biaya.',
        tone: 'info',
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buku Besar Pengeluaran Toko"
        description="Catat belanja stok supplier, listrik AC ruang Pet Hotel, gaji groomer, hingga perlengkapan kebersihan."
        actions={
          canCreate ? (
            <Button variant="primary" leadingIcon={<Plus />} onClick={() => setIsOpen(true)}>
              Catat Pengeluaran
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricTile
          label="Total Pengeluaran Aktif"
          value={money(totalSpent)}
          caption={`${activeExpenses.length} transaksi biaya aktif`}
          emphasis="strong"
        />
        <MetricTile
          label="Belanja Stok Supplier"
          value={money(
            activeExpenses
              .filter((e) => e.category === 'inventory_restock')
              .reduce((a, b) => a + b.amount_minor, 0),
          )}
          caption="Kategori pembelian produk"
        />
        <MetricTile
          label="Operasional & Utilitas"
          value={money(
            activeExpenses
              .filter((e) => e.category !== 'inventory_restock')
              .reduce((a, b) => a + b.amount_minor, 0),
          )}
          caption="Listrik, gaji, disinfektan & sewa"
        />
      </div>

      <Card>
        {expenses.length === 0 ? (
          <EmptyState
            icon={<Banknote className="size-5" />}
            title="Belum ada pengeluaran tercatat"
            description="Catat setiap nota pengeluaran operasional agar perhitungan hasil bersih di laporan tetap akurat."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-line bg-surface-muted border-b">
                  <th className="eyebrow px-4 py-2.5 text-start">Referensi</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Tanggal</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Kategori &amp; Vendor</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Keterangan</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Nominal</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Status / Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className={exp.is_voided ? 'opacity-50' : 'hover:bg-surface-muted/60'}
                  >
                    <td className="identifier px-4 py-3 font-medium">{exp.reference_code}</td>
                    <td className="text-ink-muted px-4 py-3">{formatDateId(exp.expense_date)}</td>
                    <td className="px-4 py-3">
                      <Badge tone="neutral">{EXPENSE_CATEGORY_LABELS[exp.category]}</Badge>
                      <p className="text-ink-muted mt-1 text-[0.6875rem]">{exp.vendor_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className={exp.is_voided ? 'line-through' : ''}>{exp.description}</p>
                      <p className="text-ink-subtle text-[0.6875rem]">Dicatat oleh {exp.recorded_by}</p>
                    </td>
                    <td data-numeric className="px-4 py-3 text-end font-semibold">
                      {money(exp.amount_minor)}
                    </td>
                    <td className="px-4 py-3 text-end">
                      {exp.is_voided ? (
                        <Badge tone="critical">VOID</Badge>
                      ) : canVoid ? (
                        <Button
                          variant="ghost"
                          size="xs"
                          leadingIcon={<Ban />}
                          onClick={() => voidMutation.mutate(exp.id)}
                        >
                          Void
                        </Button>
                      ) : (
                        <Badge tone="positive">Tercatat</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={isOpen}
        onOpenChange={setIsOpen}
        title="Catat Pengeluaran Operasional"
        description="Masukkan detail vendor, kategori biaya, dan nominal sesuai kuitansi."
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            createMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tanggal Nota" required>
              <Input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </Field>
            <Field label={`Nominal Biaya (${currency})`} required>
              <Input
                type="number"
                min={1}
                required
                value={amountMajor}
                onChange={(e) => setAmountMajor(e.target.value)}
                placeholder="250000"
              />
            </Field>
          </div>

          <Field label="Kategori Biaya">
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              options={Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
          </Field>

          <Field label="Nama Supplier / Penerima Pembayaran" required>
            <Input
              required
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="Contoh: PT Distribusi Pakan Nusantara"
            />
          </Field>

          <Field label="Rincian Keterangan" required>
            <Textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Pembelian 10 box pasir tofu & cairan disinfektan kandang"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createMutation.isPending}>
              Simpan Pengeluaran
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
