import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowUpDown, Download, Edit3, Package, Plus, Search } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
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
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { PRODUCT_CATEGORY_LABELS } from '@/lib/data/labels'
import { evaluateExpiryStatus, formatDateId, todayIsoDate } from '@/lib/datetime/dates'
import { formatMoney, toMajorUnits, toMinorUnits } from '@/lib/money/money'
import { buildCsv, downloadCsv } from '@/lib/utils/csv'
import type { Product, ProductCategory, StockMovement } from '@/types/domain'

export function ProductsPage() {
  const organization = useOrganization()
  const { user } = useWorkspace()
  const canManage = usePermission('products.create')
  const canAdjust = usePermission('products.adjustStock')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const [search, setSearch] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'low_stock' | 'expiring'>('all')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null)

  // Form state
  const [sku, setSku] = useState('')
  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState<ProductCategory>('cat_food')
  const [unit, setUnit] = useState('sak')
  const [costMajor, setCostMajor] = useState('0')
  const [priceMajor, setPriceMajor] = useState('0')
  const [stockQty, setStockQty] = useState('10')
  const [minStockQty, setMinStockQty] = useState('5')
  const [expiresOn, setExpiresOn] = useState('')

  // Stock adjust state
  const [adjustDelta, setAdjustDelta] = useState('10')
  const [adjustReason, setAdjustReason] = useState<StockMovement['reason']>('restock')
  const [adjustNote, setAdjustNote] = useState('')

  const currency = organization.default_currency
  const today = todayIsoDate(organization.time_zone)
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const { data: products = [] } = useQuery({
    queryKey: ['products', organization.id],
    queryFn: () => api.listProducts(organization.id),
  })

  const openCreate = () => {
    setEditingProduct(null)
    setSku(`SKU-${Math.floor(100 + Math.random() * 900)}`)
    setBarcode('')
    setName('')
    setBrand('')
    setCategory('cat_food')
    setUnit('pcs')
    setCostMajor('50000')
    setPriceMajor('75000')
    setStockQty('12')
    setMinStockQty('5')
    setExpiresOn('')
    setIsFormOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditingProduct(p)
    setSku(p.sku)
    setBarcode(p.barcode)
    setName(p.name)
    setBrand(p.brand)
    setCategory(p.category)
    setUnit(p.unit)
    setCostMajor(String(toMajorUnits(p.cost_minor, currency)))
    setPriceMajor(String(toMajorUnits(p.price_minor, currency)))
    setStockQty(String(p.stock_qty))
    setMinStockQty(String(p.min_stock_qty))
    setExpiresOn(p.expires_on ?? '')
    setIsFormOpen(true)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (filterMode === 'low_stock' && p.stock_qty > p.min_stock_qty) return false
      if (filterMode === 'expiring') {
        if (!p.expires_on) return false
        const st = evaluateExpiryStatus(p.expires_on, today, 30)
        if (st !== 'expired' && st !== 'expiring_soon') return false
      }
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      )
    })
  }, [products, search, filterMode, today])

  const inventoryValueMinor = products.reduce((acc, p) => acc + p.cost_minor * p.stock_qty, 0)
  const lowStockCount = products.filter((p) => p.stock_qty <= p.min_stock_qty).length
  const expiringCount = products.filter((p) => {
    if (!p.expires_on) return false
    const st = evaluateExpiryStatus(p.expires_on, today, 30)
    return st === 'expired' || st === 'expiring_soon'
  }).length

  const saveMutation = useMutation({
    mutationFn: () =>
      api.upsertProduct(organization.id, {
        id: editingProduct?.id,
        sku,
        barcode,
        name,
        brand,
        category,
        unit,
        cost_minor: toMinorUnits(costMajor, currency),
        price_minor: toMinorUnits(priceMajor, currency),
        stock_qty: Number(stockQty) || 0,
        min_stock_qty: Number(minStockQty) || 0,
        expires_on: expiresOn || null,
      }),
    onSuccess: (saved) => {
      setIsFormOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['products', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: editingProduct ? 'Produk diperbarui' : 'Produk baru ditambahkan',
        description: `${saved.name} (${saved.sku}) tersimpan.`,
      })
    },
    onError: (err) => {
      pushToast({
        title: 'Gagal menyimpan produk',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        tone: 'critical',
      })
    },
  })

  const adjustMutation = useMutation({
    mutationFn: () => {
      if (!adjustTarget) throw new Error('Produk belum dipilih.')
      const rawQty = Math.abs(Number(adjustDelta) || 0)
      const signedDelta = adjustReason === 'damaged_or_expired' ? -rawQty : Number(adjustDelta) || 0
      return api.adjustProductStock(organization.id, {
        product_id: adjustTarget.id,
        delta_qty: signedDelta,
        reason: adjustReason,
        note: adjustNote,
        actor_name: user?.full_name ?? 'Manajer',
      })
    },
    onSuccess: (updated) => {
      setAdjustTarget(null)
      setAdjustNote('')
      void queryClient.invalidateQueries({ queryKey: ['products', organization.id] })
      pushToast({
        title: 'Stok berhasil disesuaikan',
        description: `Stok ${updated.name} kini ${updated.stock_qty} ${updated.unit}.`,
      })
    },
    onError: (err) => {
      pushToast({
        title: 'Penyesuaian stok ditolak',
        description: err instanceof Error ? err.message : 'Periksa jumlah stok.',
        tone: 'critical',
      })
    },
  })

  const handleExportCsv = () => {
    const csv = buildCsv(
      ['SKU', 'Barcode', 'Nama Produk', 'Merek', 'Kategori', 'Stok', 'Satuan', 'HPP', 'Harga Jual', 'Kedaluwarsa'],
      products.map((p) => [
        p.sku,
        p.barcode,
        p.name,
        p.brand,
        PRODUCT_CATEGORY_LABELS[p.category],
        p.stock_qty,
        p.unit,
        toMajorUnits(p.cost_minor, p.currency),
        toMajorUnits(p.price_minor, p.currency),
        p.expires_on ?? '',
      ]),
    )
    downloadCsv(`produk-${organization.slug}.csv`, csv)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produk & Inventori Gudang"
        description="Katalog pakan, vitamin, pasir, aksesoris, serta pantauan ambang restock dan tanggal kedaluwarsa."
        actions={
          <>
            <Button variant="secondary" leadingIcon={<Download />} onClick={handleExportCsv}>
              Ekspor CSV
            </Button>
            {canManage ? (
              <Button variant="primary" leadingIcon={<Plus />} onClick={openCreate}>
                Tambah Produk
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Total SKU Aktif" value={products.length} caption="Terdaftar di kasir POS" />
        <MetricTile
          label="Nilai Persediaan (HPP)"
          value={money(inventoryValueMinor)}
          caption="Total modal stok tersedia"
        />
        <MetricTile
          label="Stok Menipis"
          value={lowStockCount}
          caption="Di bawah batas minimum"
          badge={lowStockCount > 0 ? <Badge tone="caution">Restock</Badge> : undefined}
        />
        <MetricTile
          label="Peringatan Kedaluwarsa"
          value={expiringCount}
          caption="Expired dalam ≤ 30 hari"
          badge={expiringCount > 0 ? <Badge tone="critical">Periksa Rak</Badge> : undefined}
        />
      </div>

      {/* Filter Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="text-ink-subtle pointer-events-none absolute top-2.5 left-3 size-4" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama produk, merek, atau SKU..."
              className="ps-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['all', `Semua (${products.length})`],
                ['low_stock', `Stok Menipis (${lowStockCount})`],
                ['expiring', `Mendekati Expired (${expiringCount})`],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                size="xs"
                variant={filterMode === key ? 'primary' : 'secondary'}
                onClick={() => setFilterMode(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            icon={<Package className="size-5" />}
            title="Tidak ada produk yang cocok"
            description="Tambahkan produk baru atau ubah filter pencarian di atas."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-line bg-surface-muted border-b">
                  <th className="eyebrow px-4 py-2.5 text-start">SKU</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Produk &amp; Merek</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Kategori</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Harga Modal</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Harga Jual</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Stok</th>
                  <th className="eyebrow px-4 py-2.5 text-start">Kedaluwarsa</th>
                  <th className="eyebrow px-4 py-2.5 text-end">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-line divide-y">
                {filtered.map((p) => {
                  const isLow = p.stock_qty <= p.min_stock_qty
                  const expStatus = p.expires_on
                    ? evaluateExpiryStatus(p.expires_on, today, 30)
                    : null

                  return (
                    <tr key={p.id} className="hover:bg-surface-muted/60">
                      <td className="identifier px-4 py-3 font-medium">{p.sku}</td>
                      <td className="px-4 py-3">
                        <p className="text-ink font-semibold">{p.name}</p>
                        <p className="text-ink-subtle text-[0.6875rem]">{p.brand}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="neutral">{PRODUCT_CATEGORY_LABELS[p.category]}</Badge>
                      </td>
                      <td data-numeric className="text-ink-muted px-4 py-3 text-end">
                        {money(p.cost_minor)}
                      </td>
                      <td data-numeric className="px-4 py-3 text-end font-semibold">
                        {money(p.price_minor)}
                      </td>
                      <td data-numeric className="px-4 py-3 text-end">
                        <span className={isLow ? 'text-critical-600 font-bold' : 'font-semibold'}>
                          {p.stock_qty} {p.unit}
                        </span>
                        <span className="text-ink-subtle block text-[0.65rem]">
                          min. {p.min_stock_qty}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {!p.expires_on ? (
                          <span className="text-ink-subtle">Non-expired</span>
                        ) : expStatus === 'expired' ? (
                          <Badge tone="critical">Expired {formatDateId(p.expires_on)}</Badge>
                        ) : expStatus === 'expiring_soon' ? (
                          <Badge tone="caution">Segera ({formatDateId(p.expires_on)})</Badge>
                        ) : (
                          <span className="text-ink-muted">{formatDateId(p.expires_on)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <div className="inline-flex items-center gap-1.5">
                          {canAdjust ? (
                            <Button
                              variant="secondary"
                              size="xs"
                              leadingIcon={<ArrowUpDown />}
                              onClick={() => {
                                setAdjustTarget(p)
                                setAdjustDelta('10')
                                setAdjustReason('restock')
                              }}
                            >
                              Stok
                            </Button>
                          ) : null}
                          {canManage ? (
                            <Button
                              variant="ghost"
                              size="xs"
                              leadingIcon={<Edit3 />}
                              onClick={() => openEdit(p)}
                            >
                              Ubah
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        title={editingProduct ? `Ubah Produk ${editingProduct.sku}` : 'Tambah Produk Baru'}
        description="Simpan informasi SKU, harga modal (HPP), harga jual POS, dan ambang stok."
        size="lg"
      >
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            saveMutation.mutate()
          }}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kode SKU" required>
              <Input required value={sku} onChange={(e) => setSku(e.target.value)} />
            </Field>
            <Field label="Barcode EAN/UPC (Opsional)">
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} />
            </Field>
          </div>

          <Field label="Nama Lengkap Produk" required>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Royal Canin Kitten 2kg"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Merek" required>
              <Input required value={brand} onChange={(e) => setBrand(e.target.value)} />
            </Field>
            <Field label="Kategori">
              <Select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                options={Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </Field>
            <Field label="Satuan Jual" required>
              <Input
                required
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="sak / pcs / pipet"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={`Harga Modal / HPP (${currency})`} required>
              <Input
                type="number"
                min={0}
                required
                value={costMajor}
                onChange={(e) => setCostMajor(e.target.value)}
              />
            </Field>
            <Field label={`Harga Jual Kasir (${currency})`} required>
              <Input
                type="number"
                min={0}
                required
                value={priceMajor}
                onChange={(e) => setPriceMajor(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stok Saat Ini" required>
              <Input
                type="number"
                min={0}
                required
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
              />
            </Field>
            <Field label="Batas Minimum Stok" required>
              <Input
                type="number"
                min={0}
                required
                value={minStockQty}
                onChange={(e) => setMinStockQty(e.target.value)}
              />
            </Field>
            <Field label="Tanggal Kedaluwarsa">
              <Input
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Produk'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        open={Boolean(adjustTarget)}
        onOpenChange={(open) => {
          if (!open) setAdjustTarget(null)
        }}
        title={adjustTarget ? `Penyesuaian Stok: ${adjustTarget.name}` : 'Penyesuaian Stok'}
        description="Setiap perubahan stok tercatat otomatis dalam riwayat mutasi gudang."
      >
        {adjustTarget ? (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              adjustMutation.mutate()
            }}
            className="space-y-4"
          >
            <div className="bg-surface-muted border-line rounded-lg border p-3 text-xs">
              Stok saat ini:{' '}
              <strong>
                {adjustTarget.stock_qty} {adjustTarget.unit}
              </strong>
            </div>

            <Field label="Jenis Mutasi">
              <Select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value as StockMovement['reason'])}
                options={[
                  { value: 'restock', label: 'Barang Masuk (Restock Supplier) [+]' },
                  { value: 'damaged_or_expired', label: 'Barang Rusak / Kedaluwarsa [-]' },
                  { value: 'manual_adjustment', label: 'Koreksi Stock Opname (+/-)' },
                ]}
              />
            </Field>

            <Field
              label="Jumlah Perubahan"
              hint={
                adjustReason === 'damaged_or_expired'
                  ? 'Akan mengurangi stok secara otomatis.'
                  : 'Gunakan angka positif untuk menambah (atau negatif saat koreksi opname).'
              }
              required
            >
              <Input
                type="number"
                required
                value={adjustDelta}
                onChange={(e) => setAdjustDelta(e.target.value)}
              />
            </Field>

            <Field label="Catatan / Referensi Surat Jalan">
              <Input
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                placeholder="Contoh: Surat Jalan Supplier #SJ-882"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setAdjustTarget(null)}>
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={adjustMutation.isPending}>
                Simpan Mutasi Stok
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  )
}
