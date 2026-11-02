import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, CreditCard } from 'lucide-react'
import { Alert, Badge, Button, Card, PageHeader, useToast } from '@/components/ui'
import { useOrganization, useWorkspace } from '@/features/workspace/workspace-context'
import { api } from '@/lib/data/api'
import type { Organization } from '@/types/domain'

const PLANS: {
  tier: Organization['plan_tier']
  name: string
  priceLabel: string
  desc: string
  features: string[]
}[] = [
  {
    tier: 'free',
    name: 'Starter (Free Build)',
    priceLabel: 'Rp0 / selamanya',
    desc: 'Untuk 1 toko Pet Shop mandiri dengan seluruh modul inti terbuka penuh.',
    features: [
      'Kasir POS + Cetak Struk Tanpa Batas',
      'Katalog Produk & Peringatan Expired',
      'Antrean Grooming & Pet Hotel',
      'Hingga 5 Anggota Staf',
    ],
  },
  {
    tier: 'pro',
    name: 'Pawra Pro',
    priceLabel: 'Rp249.000 / bulan',
    desc: 'Untuk Pet Shop ramai dengan Pet Hotel berkapasitas besar & analitik lengkap.',
    features: [
      'Semua fitur Starter tanpa batasan SKU',
      'Unit Kandang Pet Hotel Tanpa Batas',
      'Daily Care Log & Riwayat Vaksin Pelanggan',
      'Anggota Tim & Groomer Tanpa Batas',
    ],
  },
  {
    tier: 'multi_branch',
    name: 'Multi-Cabang Enterprise',
    priceLabel: 'Rp599.000 / bulan',
    desc: 'Untuk jaringan Pet Shop dengan banyak cabang terisolasi di berbagai kota.',
    features: [
      'Multi-Tenant Cabang Tanpa Batas',
      'Laporan Ekspor CSV Lintas Periode',
      'Audit Keanggotaan & Proteksi RLS Penuh',
      'Prioritas Dukungan Integrasi Webhook',
    ],
  },
]

export function BillingPage() {
  const organization = useOrganization()
  const { refreshSession } = useWorkspace()
  const { pushToast } = useToast()

  const planMutation = useMutation({
    mutationFn: (tier: Organization['plan_tier']) =>
      api.updateOrganization(organization.id, { plan_tier: tier }),
    onSuccess: (updated) => {
      refreshSession()
      pushToast({
        title: `Paket langganan diperbarui ke ${updated.plan_tier.toUpperCase()}`,
        description: 'Perubahan status paket langsung tercatat pada profil tenant.',
      })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Langganan & Paket SaaS"
        description="Halaman khusus Owner untuk mengatur paket langganan tenant dan integrasi payment gateway SaaS."
      />

      <Alert tone="info" title="Tidak Ada Fitur yang Dikunci pada Build Ini">
        Selaras dengan filosofi <em>Free Build</em> Atlas: apabila kunci rahasia Stripe Edge
        Function (<code>BILLING_STRIPE_SECRET_KEY</code>) belum dikonfigurasi pada server Supabase,
        seluruh modul tetap terbuka tanpa batasan buatan. Anda dapat mengaktifkan katalog penagihan
        otomatis kapan saja saat siap menjual SaaS ini ke publik.
      </Alert>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = organization.plan_tier === plan.tier
          return (
            <Card
              key={plan.tier}
              className={`flex flex-col justify-between p-6 ${
                isCurrent ? 'border-brand-600 ring-brand-600/20 ring-2' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{plan.name}</h2>
                  {isCurrent ? <Badge tone="brand">Paket Aktif</Badge> : null}
                </div>
                <p data-numeric className="mt-3 text-2xl font-semibold tracking-tight">
                  {plan.priceLabel}
                </p>
                <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">{plan.desc}</p>

                <ul className="mt-5 space-y-2 text-xs">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckCircle2 className="text-brand-600 mt-0.5 size-3.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-2">
                <Button
                  variant={isCurrent ? 'secondary' : 'primary'}
                  className="w-full"
                  disabled={isCurrent || planMutation.isPending}
                  leadingIcon={<CreditCard />}
                  onClick={() => planMutation.mutate(plan.tier)}
                >
                  {isCurrent ? 'Sedang Digunakan' : `Pilih ${plan.name}`}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
