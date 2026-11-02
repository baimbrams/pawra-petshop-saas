import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import { PAYMENT_METHOD_LABELS, PRODUCT_CATEGORY_LABELS } from '@/lib/data/labels'
import { formatDateId } from '@/lib/datetime/dates'
import { applyBasisPoints, formatMoney, toMinorUnits } from '@/lib/money/money'
import type { PaymentMethod, PosOrder, Product, ProductCategory } from '@/types/domain'

interface CartLine {
  product: Product
  qty: number
}

export function PosPage() {
  const organization = useOrganization()
  const { user } = useWorkspace()
  const canCheckout = usePermission('pos.checkout')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const [activeTab, setActiveTab] = useState<'terminal' | 'history'>('terminal')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | ProductCategory>('all')

  const [cart, setCart] = useState<CartLine[]>([])
  const [customerId, setCustomerId] = useState<string>('')
  const [discountInput, setDiscountInput] = useState<string>('0')
  const [applyTax, setApplyTax] = useState<boolean>(organization.tax_rate_bps > 0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris')
  const [cashReceivedInput, setCashReceivedInput] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [receiptOrder, setReceiptOrder] = useState<PosOrder | null>(null)

  const currency = organization.default_currency
  const money = (minor: number) => formatMoney(minor, currency, { locale: organization.locale })

  const { data: products = [] } = useQuery({
    queryKey: ['products', organization.id],
    queryFn: () => api.listProducts(organization.id),
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', organization.id],
    queryFn: () => api.listCustomers(organization.id),
  })

  const { data: orders = [] } = useQuery({
    queryKey: ['pos-orders', organization.id],
    queryFn: () => api.listPosOrders(organization.id),
  })

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase()
    return products.filter((p) => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false
      if (!q) return true
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q)
      )
    })
  }, [products, search, categoryFilter])

  const addToCart = (product: Product) => {
    if (product.stock_qty <= 0) {
      pushToast({
        title: 'Stok habis',
        description: `${product.name} sedang kosong di gudang.`,
        tone: 'critical',
      })
      return
    }
    setCart((prev) => {
      const idx = prev.findIndex((item) => item.product.id === product.id)
      if (idx < 0) return [...prev, { product, qty: 1 }]
      const nextQty = prev[idx].qty + 1
      if (nextQty > product.stock_qty) {
        pushToast({
          title: 'Batas stok tercapai',
          description: `Stok tersedia hanya ${product.stock_qty} ${product.unit}.`,
          tone: 'critical',
        })
        return prev
      }
      const copy = [...prev]
      copy[idx] = { ...copy[idx], qty: nextQty }
      return copy
    })
  }

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product.id !== productId) return line
          const next = line.qty + delta
          if (next > line.product.stock_qty) return line
          return { ...line, qty: next }
        })
        .filter((line) => line.qty > 0),
    )
  }

  const subtotalMinor = cart.reduce((acc, l) => acc + l.product.price_minor * l.qty, 0)
  const discountMinor = Math.min(toMinorUnits(discountInput, currency), subtotalMinor)
  const taxableMinor = Math.max(0, subtotalMinor - discountMinor)
  const taxMinor = applyTax ? applyBasisPoints(taxableMinor, organization.tax_rate_bps) : 0
  const totalMinor = taxableMinor + taxMinor
  const cashPaidMinor =
    paymentMethod === 'cash'
      ? toMinorUnits(cashReceivedInput || String(totalMinor), currency)
      : totalMinor

  const checkoutMutation = useMutation({
    mutationFn: () =>
      api.createPosOrder(organization.id, {
        customer_id: customerId || null,
        cart: cart.map((l) => ({ product_id: l.product.id, qty: l.qty })),
        discount_minor: discountMinor,
        apply_tax: applyTax,
        payment_method: paymentMethod,
        paid_minor: cashPaidMinor,
        cashier_name: user?.full_name ?? 'Kasir',
        notes,
      }),
    onSuccess: (created) => {
      setCart([])
      setDiscountInput('0')
      setCashReceivedInput('')
      setNotes('')
      setReceiptOrder(created)
      void queryClient.invalidateQueries({ queryKey: ['products', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['pos-orders', organization.id] })
      void queryClient.invalidateQueries({ queryKey: ['overview', organization.id] })
      pushToast({
        title: `Transaksi ${created.invoice_number} berhasil`,
        description: `Total ${money(created.total_minor)} via ${PAYMENT_METHOD_LABELS[created.payment_method]}.`,
      })
    },
    onError: (err) => {
      pushToast({
        title: 'Gagal memproses transaksi',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan.',
        tone: 'critical',
      })
    },
  })

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kasir Point of Sale (POS)"
        description="Penjualan cepat produk ritel Pet Shop dengan pemotongan stok & struk otomatis."
        actions={
          <div className="bg-surface border-line inline-flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setActiveTab('terminal')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'terminal'
                  ? 'bg-brand-600 text-ink-inverse'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Terminal Kasir
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-brand-600 text-ink-inverse'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Riwayat Nota ({orders.length})
            </button>
          </div>
        }
      />

      {activeTab === 'terminal' ? (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
          {/* Left: Product Picker */}
          <div className="space-y-4">
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="text-ink-subtle pointer-events-none absolute top-2.5 left-3 size-4" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari nama produk, merek, SKU, atau scan barcode..."
                    className="ps-9"
                  />
                </div>
                <div className="sm:w-52">
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as 'all' | ProductCategory)}
                    options={[
                      { value: 'all', label: 'Semua Kategori' },
                      ...Object.entries(PRODUCT_CATEGORY_LABELS).map(([value, label]) => ({
                        value,
                        label,
                      })),
                    ]}
                  />
                </div>
              </div>
            </Card>

            {filteredProducts.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<ShoppingCart className="size-5" />}
                  title="Produk tidak ditemukan"
                  description="Ubah kata kunci pencarian atau tambahkan produk baru pada menu Produk & Stok."
                />
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => {
                  const inCart = cart.find((c) => c.product.id === product.id)?.qty ?? 0
                  const isLow = product.stock_qty <= product.min_stock_qty

                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={!canCheckout || product.stock_qty <= 0}
                      onClick={() => addToCart(product)}
                      className="bg-surface border-line hover:border-brand-500 flex cursor-pointer flex-col justify-between rounded-lg border p-3.5 text-start shadow-raised transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="identifier text-ink-subtle text-[0.6875rem]">
                            {product.sku}
                          </span>
                          {inCart > 0 ? (
                            <Badge tone="brand">{inCart} di keranjang</Badge>
                          ) : product.stock_qty === 0 ? (
                            <Badge tone="critical">Habis</Badge>
                          ) : isLow ? (
                            <Badge tone="caution">Sisa {product.stock_qty}</Badge>
                          ) : (
                            <Badge tone="neutral">
                              Stok {product.stock_qty} {product.unit}
                            </Badge>
                          )}
                        </div>
                        <p className="text-ink mt-2 line-clamp-2 text-[0.8125rem] leading-snug font-semibold">
                          {product.name}
                        </p>
                        <p className="text-ink-subtle mt-1 text-[0.6875rem]">
                          {product.brand} · {PRODUCT_CATEGORY_LABELS[product.category]}
                        </p>
                      </div>
                      <div className="border-line mt-3 flex items-center justify-between border-t pt-2.5">
                        <span data-numeric className="text-brand-700 text-sm font-semibold">
                          {money(product.price_minor)}
                        </span>
                        <span className="text-ink-subtle text-[0.6875rem]">/{product.unit}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Active Cart & Payment */}
          <Card className="sticky top-6">
            <CardHeader
              title="Keranjang Kasir"
              description={
                cart.length === 0
                  ? 'Klik produk di sebelah kiri untuk menambahkan'
                  : `${cart.reduce((a, b) => a + b.qty, 0)} item siap dibayar`
              }
              actions={
                cart.length > 0 ? (
                  <Button variant="ghost" size="xs" onClick={() => setCart([])}>
                    Kosongkan
                  </Button>
                ) : null
              }
            />
            <CardBody className="space-y-4">
              <Field label="Pelanggan (Opsional — untuk Poin Loyalti)">
                <Select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={[
                    { value: '', label: 'Pelanggan Umum (Walk-in)' },
                    ...customers.map((c) => ({
                      value: c.id,
                      label: `${c.full_name} (${c.phone})`,
                    })),
                  ]}
                />
              </Field>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="bg-surface-muted border-line rounded-lg border border-dashed py-8 text-center">
                  <ShoppingCart className="text-ink-subtle mx-auto size-5" />
                  <p className="text-ink-muted mt-2 text-xs">Keranjang belanja masih kosong</p>
                </div>
              ) : (
                <div className="border-line divide-line max-h-64 divide-y overflow-y-auto rounded-lg border">
                  {cart.map((line) => (
                    <div
                      key={line.product.id}
                      className="flex items-center justify-between gap-2 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{line.product.name}</p>
                        <p data-numeric className="text-ink-subtle text-[0.6875rem]">
                          {money(line.product.price_minor)} × {line.qty} ={' '}
                          <strong className="text-ink">
                            {money(line.product.price_minor * line.qty)}
                          </strong>
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.product.id, -1)}
                          className="border-line hover:bg-surface-inset flex size-6 cursor-pointer items-center justify-center rounded border"
                          aria-label="Kurangi jumlah"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span data-numeric className="w-6 text-center text-xs font-semibold">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.product.id, 1)}
                          className="border-line hover:bg-surface-inset flex size-6 cursor-pointer items-center justify-center rounded border"
                          aria-label="Tambah jumlah"
                        >
                          <Plus className="size-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.product.id, -line.qty)}
                          className="text-ink-subtle hover:text-critical-600 ms-1 cursor-pointer p-1"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing & Payment Controls */}
              <div className="grid grid-cols-2 gap-3">
                <Field label={`Potongan Diskon (${currency})`}>
                  <Input
                    type="number"
                    min={0}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                  />
                </Field>
                <Field label="Metode Pembayaran">
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    options={Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({
                      value,
                      label,
                    }))}
                  />
                </Field>
              </div>

              {organization.tax_rate_bps > 0 ? (
                <label className="flex cursor-pointer items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={applyTax}
                    onChange={(e) => setApplyTax(e.target.checked)}
                    className="accent-brand-600 size-3.5 rounded"
                  />
                  <span>
                    Terapkan PPN Toko ({(organization.tax_rate_bps / 100).toFixed(1)}%)
                  </span>
                </label>
              ) : null}

              {paymentMethod === 'cash' && cart.length > 0 ? (
                <Field label={`Uang Tunai Diterima (${currency})`}>
                  <Input
                    type="number"
                    min={0}
                    placeholder={String(totalMinor)}
                    value={cashReceivedInput}
                    onChange={(e) => setCashReceivedInput(e.target.value)}
                  />
                </Field>
              ) : null}

              <Field label="Catatan Struk (Opsional)">
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Titip bungkus kado / pesanan kurir"
                />
              </Field>

              {/* Totals Summary */}
              <div className="bg-surface-muted border-line space-y-1.5 rounded-lg border p-3.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-ink-muted">Subtotal</span>
                  <span data-numeric>{money(subtotalMinor)}</span>
                </div>
                {discountMinor > 0 ? (
                  <div className="text-positive-700 flex justify-between">
                    <span>Diskon</span>
                    <span data-numeric>-{money(discountMinor)}</span>
                  </div>
                ) : null}
                {taxMinor > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-ink-muted">PPN</span>
                    <span data-numeric>{money(taxMinor)}</span>
                  </div>
                ) : null}
                <div className="border-line flex justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total Bayar</span>
                  <span data-numeric className="text-brand-700">
                    {money(totalMinor)}
                  </span>
                </div>
                {paymentMethod === 'cash' && cashPaidMinor > totalMinor ? (
                  <div className="text-info-700 flex justify-between pt-1 font-medium">
                    <span>Kembalian Tunai</span>
                    <span data-numeric>{money(cashPaidMinor - totalMinor)}</span>
                  </div>
                ) : null}
              </div>

              <Button
                variant="primary"
                className="h-10 w-full font-semibold"
                disabled={!canCheckout || cart.length === 0 || checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
              >
                <CheckCircle2 className="size-4" />
                {checkoutMutation.isPending
                  ? 'Memproses Pembayaran...'
                  : `Selesaikan & Cetak Struk (${money(totalMinor)})`}
              </Button>
            </CardBody>
          </Card>
        </div>
      ) : (
        /* Order History Table */
        <Card>
          <CardHeader
            title="Riwayat Transaksi Kasir POS"
            description="Klik Lihat Struk pada baris mana pun untuk menampilkan atau mencetak ulang nota."
          />
          {orders.length === 0 ? (
            <EmptyState
              icon={<Receipt className="size-5" />}
              title="Belum ada transaksi POS"
              description="Setiap transaksi yang diselesaikan di Terminal Kasir akan tercatat di sini."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-start text-xs">
                <thead>
                  <tr className="border-line bg-surface-muted border-b">
                    <th className="eyebrow px-4 py-2.5 text-start">No. Invoice</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Waktu</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Pelanggan</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Item</th>
                    <th className="eyebrow px-4 py-2.5 text-start">Metode</th>
                    <th className="eyebrow px-4 py-2.5 text-end">Total</th>
                    <th className="eyebrow px-4 py-2.5 text-end">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-line divide-y">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-surface-muted/60">
                      <td className="identifier px-4 py-3 font-medium">{order.invoice_number}</td>
                      <td className="text-ink-muted px-4 py-3">
                        {formatDateId(order.created_at, true)}
                      </td>
                      <td className="px-4 py-3 font-medium">{order.customer_name}</td>
                      <td className="text-ink-muted px-4 py-3">
                        {order.items.reduce((a, b) => a + b.qty, 0)} produk
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone="info">{PAYMENT_METHOD_LABELS[order.payment_method]}</Badge>
                      </td>
                      <td data-numeric className="px-4 py-3 text-end font-semibold">
                        {formatMoney(order.total_minor, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-end">
                        <Button variant="secondary" size="xs" onClick={() => setReceiptOrder(order)}>
                          Lihat Struk
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Printable Digital Receipt Modal */}
      <Modal
        open={Boolean(receiptOrder)}
        onOpenChange={(open) => {
          if (!open) setReceiptOrder(null)
        }}
        title={receiptOrder ? `Struk ${receiptOrder.invoice_number}` : 'Struk'}
        description="Nota resmi transaksi ritel Pet Shop"
        size="sm"
      >
        {receiptOrder ? (
          <div className="space-y-4">
            <div className="bg-surface-muted border-line rounded-lg border p-4 font-mono text-xs">
              <div className="border-line border-b border-dashed pb-3 text-center">
                <p className="text-sm font-bold">{organization.name}</p>
                <p className="text-ink-muted mt-0.5 text-[0.6875rem]">{organization.address}</p>
                <p className="text-ink-muted text-[0.6875rem]">Telp: {organization.phone}</p>
              </div>

              <div className="border-line space-y-1 border-b border-dashed py-2.5 text-[0.6875rem]">
                <div className="flex justify-between">
                  <span>No: {receiptOrder.invoice_number}</span>
                  <span>{formatDateId(receiptOrder.created_at, true)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Kasir: {receiptOrder.cashier_name}</span>
                  <span>{PAYMENT_METHOD_LABELS[receiptOrder.payment_method]}</span>
                </div>
                <div>Pelanggan: {receiptOrder.customer_name}</div>
              </div>

              <div className="border-line space-y-2 border-b border-dashed py-2.5">
                {receiptOrder.items.map((item) => (
                  <div key={item.id}>
                    <p className="font-semibold">{item.product_name}</p>
                    <div className="text-ink-muted flex justify-between text-[0.6875rem]">
                      <span>
                        {item.qty} x {formatMoney(item.unit_price_minor, receiptOrder.currency)}
                      </span>
                      <span>{formatMoney(item.subtotal_minor, receiptOrder.currency)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-2.5">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatMoney(receiptOrder.subtotal_minor, receiptOrder.currency)}</span>
                </div>
                {receiptOrder.discount_minor > 0 ? (
                  <div className="flex justify-between">
                    <span>Diskon</span>
                    <span>-{formatMoney(receiptOrder.discount_minor, receiptOrder.currency)}</span>
                  </div>
                ) : null}
                {receiptOrder.tax_minor > 0 ? (
                  <div className="flex justify-between">
                    <span>PPN</span>
                    <span>{formatMoney(receiptOrder.tax_minor, receiptOrder.currency)}</span>
                  </div>
                ) : null}
                <div className="flex justify-between pt-1 text-sm font-bold">
                  <span>TOTAL</span>
                  <span>{formatMoney(receiptOrder.total_minor, receiptOrder.currency)}</span>
                </div>
                <div className="text-ink-muted flex justify-between text-[0.6875rem]">
                  <span>Dibayar</span>
                  <span>{formatMoney(receiptOrder.paid_minor, receiptOrder.currency)}</span>
                </div>
                {receiptOrder.change_minor > 0 ? (
                  <div className="flex justify-between text-[0.6875rem]">
                    <span>Kembalian</span>
                    <span>{formatMoney(receiptOrder.change_minor, receiptOrder.currency)}</span>
                  </div>
                ) : null}
              </div>

              <p className="text-ink-subtle mt-4 text-center text-[0.6875rem]">
                {organization.receipt_footer}
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => window.print()} leadingIcon={<Printer />}>
                Cetak Nota
              </Button>
              <Button variant="primary" onClick={() => setReceiptOrder(null)}>
                Selesai
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
