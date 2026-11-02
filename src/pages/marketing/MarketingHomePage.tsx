import {
  ArrowRight,
  BedDouble,
  CheckCircle2,
  Database,
  Layers,
  Lock,
  Package,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { paths } from '@/app/routes/paths'
import { Wordmark } from '@/components/brand/Wordmark'
import { Badge, Button, ButtonLink, Card } from '@/components/ui'
import { useWorkspace } from '@/features/workspace/workspace-context'

const CAPABILITIES = [
  'Kasir POS',
  'Stok & Expired',
  'Booking Grooming',
  'Pet Hotel & Kandang',
  'Profil & Vaksin Hewan',
  'Keuangan Multi-Cabang',
]

const MODULES = [
  {
    icon: ShoppingCart,
    title: 'Kasir POS Cepat & Struk Digital',
    desc: 'Pencarian SKU/barcode instan, dukungan QRIS, Tunai, Transfer & Kartu, kalkulasi PPN otomatis, pemotongan stok langsung, dan poin loyalti pelanggan.',
  },
  {
    icon: Scissors,
    title: 'Antrean & Paket Grooming',
    desc: 'Kelola jadwal kedatangan, penugasan groomer, catatan alergi sampo atau perilaku hewan, serta pantau tahapan dari Check-in hingga Siap Dijemput.',
  },
  {
    icon: BedDouble,
    title: 'Pet Hotel Anti-Bentrok Jadwal',
    desc: 'Okupansi kandang dihitung langsung dari kontrak aktif dan reservasi (GiST overlap protection) lengkap dengan Daily Care Log makan & mood harian.',
  },
  {
    icon: Package,
    title: 'Inventori, Batch & Peringatan Expired',
    desc: 'Pantau stok makanan hewan, vitamin, dan pasir kucing dengan ambang minimum restock serta deteksi produk yang mendekati tanggal kedaluwarsa.',
  },
  {
    icon: Users,
    title: 'CRM Pemilik & Rekam Vaksin Hewan',
    desc: 'Satu pelanggan dapat memiliki banyak profil hewan lengkap dengan ras, berat, status steril, dan masa berlaku vaksin sebelum diizinkan menginap.',
  },
  {
    icon: TrendingUp,
    title: 'KeuanganMinor-Unit & Multi-Tenant',
    desc: 'Setiap cabang Pet Shop terisolasi penuh dengan Row Level Security (RLS), hirarki 4 role staf, laporan margin operasional, dan ekspor CSV.',
  },
]

export function MarketingHomePage() {
  const { user, mode, signInDemoOwner } = useWorkspace()
  const navigate = useNavigate()

  const handleInstantDemo = () => {
    signInDemoOwner()
    navigate(paths.overview)
  }

  return (
    <div className="bg-canvas min-h-dvh text-ink">
      {/* Header */}
      <header className="border-line bg-canvas/90 sticky top-0 z-30 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1220px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link to={paths.overview} aria-label="Beranda Pawra">
              <Wordmark size="md" />
            </Link>
            <nav className="hidden items-center gap-6 text-[0.8125rem] text-ink-muted md:flex">
              <a href="#modul" className="hover:text-ink transition-colors">
                Modul Lengkap
              </a>
              <a href="#arsitektur" className="hover:text-ink transition-colors">
                Multi-Tenant & Keamanan
              </a>
              <a href="#paket" className="hover:text-ink transition-colors">
                Model SaaS
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {user ? (
              <ButtonLink variant="primary" to={paths.overview}>
                Buka Dashboard Toko <ArrowRight className="size-3.5" />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink variant="ghost" to={paths.signIn} className="hidden sm:inline-flex">
                  Masuk
                </ButtonLink>
                {mode === 'demo' ? (
                  <Button variant="secondary" onClick={handleInstantDemo}>
                    <Sparkles className="size-3.5 text-brand-600" />
                    Demo Instan
                  </Button>
                ) : null}
                <ButtonLink variant="primary" to={paths.signUp}>
                  Daftar Pet Shop
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <section className="mx-auto max-w-[1220px] px-4 pt-12 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12">
            <div>
              <Badge tone="brand">Multi-Tenant Pet Shop, Grooming &amp; Pet Hotel SaaS</Badge>
              <h1 className="mt-4 text-[2.125rem] leading-[1.12] font-semibold tracking-tight sm:text-[2.75rem] lg:text-[3.1rem]">
                Kelola seluruh operasional Pet Shop Anda dari satu ruang kerja.
              </h1>
              <p className="text-ink-muted mt-4 max-w-xl text-base leading-7">
                Mulai dari kasir POS ritel pakan, antrean grooming harian, reservasi kandang Pet
                Hotel bebas bentrok, pemantauan vaksin hewan, hingga laporan keuangan multi-cabang.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                {user ? (
                  <ButtonLink variant="primary" to={paths.overview} className="h-10 px-5">
                    Kembali ke Ruang Kerja <ArrowRight className="size-4" />
                  </ButtonLink>
                ) : mode === 'demo' ? (
                  <>
                    <Button
                      variant="primary"
                      onClick={handleInstantDemo}
                      className="h-10 px-5 font-semibold"
                    >
                      <Sparkles className="size-4" />
                      Coba Dashboard Demo Instan
                    </Button>
                    <ButtonLink variant="secondary" to={paths.signUp} className="h-10 px-4">
                      Buat Toko Baru
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <ButtonLink variant="primary" to={paths.signUp} className="h-10 px-5">
                      Mulai Gratis Sekarang
                    </ButtonLink>
                    <ButtonLink variant="secondary" to={paths.signIn} className="h-10 px-4">
                      Masuk ke Akun
                    </ButtonLink>
                  </>
                )}
              </div>

              <p className="text-ink-subtle mt-7 text-xs font-medium tracking-wide">
                {CAPABILITIES.join('  ·  ')}
              </p>
            </div>

            {/* Crisp Product UI Mockup */}
            <Card className="overflow-hidden border-[var(--color-line-strong)] bg-[var(--color-surface)] p-0 shadow-[var(--shadow-overlay)]">
              <div className="border-line bg-surface-muted flex items-center justify-between border-b px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-[#d9d9d4]" />
                  <span className="size-2.5 rounded-full bg-[#d9d9d4]" />
                  <span className="size-2.5 rounded-full bg-[#d9d9d4]" />
                  <span className="text-ink-subtle ms-2 font-mono text-[0.6875rem]">
                    Pawra Pet Care Kemang · Hari Ini
                  </span>
                </div>
                <Badge tone="positive">6 Kandang Aktif</Badge>
              </div>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="border-line bg-surface-muted rounded-md border p-3">
                    <p className="eyebrow">Omzet Bulan Ini</p>
                    <p data-numeric className="mt-1 text-base font-semibold sm:text-lg">
                      Rp4.701.040
                    </p>
                    <p className="text-positive-600 mt-0.5 text-[0.6875rem] font-medium">
                      POS + Grooming + Hotel
                    </p>
                  </div>
                  <div className="border-line bg-surface-muted rounded-md border p-3">
                    <p className="eyebrow">Pet Hotel</p>
                    <p data-numeric className="mt-1 text-base font-semibold sm:text-lg">
                      2 Menginap
                    </p>
                    <p className="text-ink-subtle mt-0.5 text-[0.6875rem]">1 Check-in hari ini</p>
                  </div>
                  <div className="border-line bg-surface-muted rounded-md border p-3">
                    <p className="eyebrow">Grooming</p>
                    <p data-numeric className="mt-1 text-base font-semibold sm:text-lg">
                      3 Jadwal
                    </p>
                    <p className="text-info-600 mt-0.5 text-[0.6875rem]">1 Sedang dikerjakan</p>
                  </div>
                </div>

                {/* Kennel Strip Preview */}
                <div className="border-line rounded-md border p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">Status Okupansi Kandang Pet Hotel</span>
                    <span className="text-ink-subtle">7 Unit Terdaftar</span>
                  </div>
                  <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-[var(--color-surface-inset)]">
                    <div className="bg-brand-600 w-[43%]" title="Tersedia" />
                    <div className="bg-info-600 w-[28%]" title="Terisi" />
                    <div className="bg-caution-600 w-[15%]" title="Reservasi" />
                    <div className="w-[14%] bg-[#b8bcc2]" title="Sterilisasi" />
                  </div>
                  <div className="text-ink-muted mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-brand-600 size-2 rounded-full" /> 3 Tersedia
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-info-600 size-2 rounded-full" /> 2 Menginap
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="bg-caution-600 size-2 rounded-full" /> 1 Reservasi
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-[#b8bcc2]" /> 1 Sterilisasi UV
                    </span>
                  </div>
                </div>

                {/* Live Queue Preview */}
                <div className="border-line divide-line divide-y rounded-md border text-xs">
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div>
                      <span className="font-semibold">Luna</span>
                      <span className="text-ink-muted"> · British Shorthair · Full Grooming</span>
                    </div>
                    <Badge tone="info">Sedang Grooming</Badge>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div>
                      <span className="font-semibold">Bruno</span>
                      <span className="text-ink-muted"> · Golden Retriever · DOG-LRG-01</span>
                    </div>
                    <Badge tone="positive">Menginap (H-2)</Badge>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-2.5">
                    <div>
                      <span className="font-semibold">Royal Canin Persian 2kg</span>
                      <span className="text-ink-muted"> · Sisa 4 sak</span>
                    </div>
                    <Badge tone="caution">Stok Menipis</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Modules Grid */}
        <section id="modul" className="border-line bg-surface border-y py-16">
          <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="eyebrow">All-in-One Pet Care Suite</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Dirancang khusus untuk alur kerja Pet Shop di dunia nyata
              </h2>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                Tidak perlu lagi menggabungkan aplikasi kasir terpisah, spreadsheet stok gudang, dan
                buku tulis jadwal grooming/penitipan.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {MODULES.map((m) => (
                <Card key={m.title} className="bg-canvas/40 p-5">
                  <div className="bg-brand-50 text-brand-700 border-brand-200 inline-flex size-9 items-center justify-center rounded-lg border">
                    <m.icon className="size-4" />
                  </div>
                  <h3 className="mt-3.5 text-[0.9375rem] font-semibold">{m.title}</h3>
                  <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">{m.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Architecture & Multi-Tenancy Section */}
        <section id="arsitektur" className="mx-auto max-w-[1220px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="eyebrow">Fondasi Engineering Setara Enterprise</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Arsitektur Multi-Tenant murni dengan isolasi tingkat database
              </h2>
              <p className="text-ink-muted mt-3 text-xs leading-relaxed">
                Terinspirasi dari standar ketat arsitektur SaaS modern: setiap toko adalah tenant
                terisolasi yang berbagi satu aplikasi dan satu skema PostgreSQL/Supabase tanpa
                risiko kebocoran data lintas toko.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Lock className="text-brand-600 size-4" />
                  Row Level Security &amp; Composite FK
                </div>
                <p className="text-ink-muted mt-2 text-xs leading-relaxed">
                  Setiap tabel memiliki <code>organization_id NOT NULL</code>, kebijakan RLS berbasis
                  <code> app.is_org_member()</code>, serta foreign key komposit agar kontrak toko A
                  mustahil menunjuk hewan atau kandang milik toko B.
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ShieldCheck className="text-brand-600 size-4" />
                  Hirarki 4 Role Terukur
                </div>
                <p className="text-ink-muted mt-2 text-xs leading-relaxed">
                  <code>Owner &gt; Admin &gt; Manager &gt; Staff</code>. Kasir &amp; groomer dapat
                  melayani transaksi harian tanpa bisa mengubah harga modal, menghapus produk, atau
                  membuka pengaturan langganan.
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Database className="text-brand-600 size-4" />
                  Akuntansi Uang Minor-Unit Integer
                </div>
                <p className="text-ink-muted mt-2 text-xs leading-relaxed">
                  Seluruh harga, diskon, PPN, dan pembayaran disimpan dalam bilangan bulat{' '}
                  <code>BIGINT</code> berdampingan dengan kode mata uang ISO-4217 (default{' '}
                  <code>IDR</code>) — bebas selisih pembulatan float.
                </p>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Layers className="text-brand-600 size-4" />
                  Dual-Engine: Demo Lokal &amp; Supabase Cloud
                </div>
                <p className="text-ink-muted mt-2 text-xs leading-relaxed">
                  Langsung berjalan instan di komputer Anda dengan Mode Demo Lokal, dan siap
                  dihubungkan ke Supabase produksi kapan saja cukup dengan mengisi 2 variabel
                  environment.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Open / SaaS Ready CTA */}
        <section id="paket" className="border-line bg-surface border-t py-14">
          <div className="mx-auto max-w-[1220px] px-4 sm:px-6 lg:px-8">
            <Card className="bg-canvas flex flex-col items-start justify-between gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="max-w-xl">
                <h2 className="text-xl font-semibold">
                  Semua modul terbuka penuh — siap dipakai maupun dijual sebagai SaaS
                </h2>
                <ul className="text-ink-muted mt-3 grid gap-1.5 text-xs sm:grid-cols-2">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="text-brand-600 size-3.5 shrink-0" /> Multi-cabang /
                    multi-organisasi
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="text-brand-600 size-3.5 shrink-0" /> Skema migrasi SQL
                    Supabase siap push
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="text-brand-600 size-3.5 shrink-0" /> Kasir POS + Struk
                    siap cetak
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="text-brand-600 size-3.5 shrink-0" /> Pet Hotel &amp;
                    Grooming terintegrasi
                  </li>
                </ul>
              </div>
              <div className="flex flex-wrap gap-3">
                {mode === 'demo' && !user ? (
                  <Button variant="primary" onClick={handleInstantDemo} className="h-10 px-5">
                    Buka Demo Pet Shop Sekarang
                  </Button>
                ) : (
                  <ButtonLink variant="primary" to={user ? paths.overview : paths.signUp} className="h-10 px-5">
                    {user ? 'Buka Dashboard' : 'Mulai Sekarang'}
                  </ButtonLink>
                )}
              </div>
            </Card>
          </div>
        </section>
      </main>

      <footer className="border-line border-t py-8">
        <div className="text-ink-subtle mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-4 px-4 text-xs sm:px-6 lg:px-8">
          <Wordmark size="sm" />
          <p>Pawra Pet Shop SaaS · React 19 + TypeScript + Tailwind v4 + Supabase RLS</p>
        </div>
      </footer>
    </div>
  )
}
