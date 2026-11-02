# Diagram Alur Sistem — Pawra Pet Shop SaaS

Dokumen ini memetakan alur kerja bisnis dan arsitektur teknis pada aplikasi **Pawra Pet Shop, Grooming & Pet Hotel SaaS**.

---

## 1. Alur Arsitektur Multi-Tenant, Autentikasi & Hak Akses (RBAC)

```mermaid
flowchart TD
    Visitor["Pengunjung / Staf Buka Aplikasi (/)"] --> EnvCheck{"Cek Konfigurasi Environment"}
    EnvCheck -->|"Terdeteksi service_role / sb_secret_"| BlockScreen["Layar Proteksi Keamanan (Tolak Startup)"]
    EnvCheck -->|"Variabel Kosong"| DemoEngine["Mode Demo Lokal (localStorage Persisten)"]
    EnvCheck -->|"URL + Publishable Key Valid"| SupaEngine["Mode Supabase Cloud (PostgreSQL + RLS)"]

    DemoEngine --> SessionCheck{"Sudah Login?"}
    SupaEngine --> SessionCheck

    SessionCheck -->|"Belum"| Landing["Marketing Landing Page (/ atau /landing)"]
    Landing -->|"Klik Demo Instan"| DemoOwner["Masuk Otomatis Owner (2 Cabang)"]
    Landing -->|"Masuk / Daftar"| AuthPages["Sign In (/sign-in) atau Sign Up (/sign-up)"]

    DemoOwner --> OrgCheck{"Punya Cabang / Tenant?"}
    AuthPages --> OrgCheck
    SessionCheck -->|"Sudah"| OrgCheck

    OrgCheck -->|"Belum"| Onboarding["Buat Pet Shop Pertama (/welcome)"]
    Onboarding --> Workspace["AppShell + Active Tenant (organization_id)"]
    OrgCheck -->|"Sudah"| Workspace

    Workspace --> RoleGate{"Evaluasi Role RBAC"}
    RoleGate -->|"Staff (Rank 10)"| StaffAccess["Kasir POS, Grooming, Pet Hotel, Pelanggan & Hewan"]
    RoleGate -->|"Manager (Rank 20)"| ManagerAccess["Semua Akses Staff + Produk/Stok, Kandang, Biaya & Laporan"]
    RoleGate -->|"Admin (Rank 30)"| AdminAccess["Semua Akses Manager + Undang Tim, Ubah Role & Pengaturan Toko"]
    RoleGate -->|"Owner (Rank 40)"| OwnerAccess["Kendali Penuh + Paket Langganan SaaS (/billing) & Multi-Cabang"]
```

---

## 2. Alur Transaksi Kasir (POS) & Pemotongan Stok Atomik

```mermaid
sequenceDiagram
    actor Kasir as Staf Kasir
    participant POS as Terminal POS (/pos)
    participant Store as Engine Transaksi (API / DB)
    participant Stok as Inventori & Mutasi Stok
    participant CRM as Profil Pelanggan

    Kasir->>POS: Cari produk (Nama / SKU / Barcode) & klik tambah
    POS->>POS: Validasi qty <= stock_qty tersedia
    Kasir->>POS: Pilih Pelanggan (atau Walk-in), Diskon, PPN & Metode Bayar
    POS->>POS: Hitung Subtotal, Diskon, PPN (basis points) & Kembalian Tunai
    Kasir->>POS: Klik Selesaikan & Cetak Struk

    POS->>Store: createPosOrder(organization_id, cart, payment)
    Store->>Stok: Cek ulang ketersediaan stok semua item

    alt Stok Mencukupi & Pembayaran Valid
        Store->>Stok: Kurangi stock_qty tiap produk secara atomik
        Store->>Stok: Catat riwayat stock_movements (alasan: pos_sale)
        opt Pelanggan Member Terpilih
            Store->>CRM: Tambah loyalty_points (1 poin tiap Rp10.000)
        end
        Store-->>POS: Kembalikan Invoice (INV-YYMM-XXX)
        POS-->>Kasir: Tampilkan Modal Struk Digital Siap Cetak
    else Stok Kurang / Tunai Kurang
        Store-->>POS: Batalkan transaksi & kirim pesan error
        POS-->>Kasir: Tampilkan Toast Peringatan
    end
```

---

## 3. Siklus Status Layanan & Antrean Grooming

```mermaid
stateDiagram-v2
    [*] --> Terjadwal : Booking Grooming Baru (Pilih Pemilik, Hewan, Paket & Jam)

    state "Terjadwal (scheduled)" as Terjadwal
    state "Sudah Datang (checked_in)" as Datang
    state "Sedang Grooming (in_progress)" as Proses
    state "Siap Dijemput (ready_pickup)" as Siap
    state "Selesai & Lunas (completed)" as Selesai
    state "Dibatalkan (cancelled)" as Batal

    Terjadwal --> Datang : Hewan tiba di toko
    Terjadwal --> Proses : Langsung masuk ruang mandi/meja
    Datang --> Proses : Groomer cek alergi & mulai perawatan
    Proses --> Siap : Mandi, blow-dry & styling selesai
    Proses --> Selesai : Selesai & pelunasan langsung
    Siap --> Selesai : Pemilik jemput & lunasi pembayaran (QRIS/Tunai/Kartu)
    Terjadwal --> Batal : Pembatalan jadwal
    Selesai --> [*]
    Batal --> [*]
```

---

## 4. Alur Kontrak Pet Hotel (Penitipan) & Proteksi Anti-Bentrok Kandang

```mermaid
flowchart TD
    StartHotel["Buat Kontrak Penitipan Baru (/boarding)"] --> PickPet["Pilih Pemilik & Hewan Peliharaan"]
    PickPet --> VaxCheck{"Cek Masa Berlaku Vaksin Hewan"}

    VaxCheck -->|"Expired / Belum Vaksin"| VaxWarn["Tampilkan Peringatan Vaksin (Konfirmasi Buku Vaksin / Ruang Isolasi)"]
    VaxCheck -->|"Vaksin Aktif"| PickDates["Input Tanggal Check-In & Check-Out"]
    VaxWarn --> PickDates

    PickDates --> AvailCheck{"Validasi Ketersediaan Kandang [Check-In, Check-Out)"}
    AvailCheck -->|"Kandang Sedang Sterilisasi / Nonaktif"| Reject["Tolak: Unit Tidak Beroperasi"]
    AvailCheck -->|"Bentrok Kontrak Lain (GiST Overlap)"| RejectOverlap["Tolak: Kandang Sudah Dipesan/Terisi"]
    AvailCheck -->|"Tersedia"| CalcBill["Hitung Malam x Tarif Harian + Add-on - Deposit (DP)"]

    CalcBill --> SaveContract{"Status Kedatangan"}
    SaveContract -->|"Tanggal Mendatang"| Reserved["Status: Reservasi (Kandang Dikunci di Kalender)"]
    SaveContract -->|"Langsung Masuk"| CheckedIn["Status: Sedang Menginap (checked_in)"]
    Reserved -->|"Hewan Tiba pada Hari-H"| CheckedIn

    CheckedIn --> DailyLog["Staf Mencatat Daily Care Log (Nafsu Makan, Mood, Catatan WA Pemilik)"]
    DailyLog --> CheckedIn
    CheckedIn --> Checkout["Pemilik Menjemput Hewan"]
    Checkout --> Settle{"Ada Sisa Tagihan?"}
    Settle -->|"Ya"| PayRest["Lunasi Sisa Pembayaran"]
    Settle -->|"Sudah Lunas"| DoneStay["Status: Sudah Check-Out (Kandang Kembali Tersedia)"]
    PayRest --> DoneStay
```

---

## 5. Alur Konsolidasi Keuangan & Engine Notifikasi Pintar

```mermaid
flowchart LR
    subgraph Operasional["Sumber Aktivitas Harian"]
        POS["Nota Kasir POS (Lunas)"]
        GRM["Pembayaran Grooming"]
        HTL["DP & Pelunasan Pet Hotel"]
        EXP["Pengeluaran Toko (Non-Void)"]
        PRD["Stok & Tanggal Expired Produk"]
        PET["Tanggal Vaksinasi Hewan"]
    end

    subgraph Analitik["Agregasi Keuangan & Dashboard"]
        REV["Total Pendapatan Masuk"]
        NET["Hasil Operasional Bersih (Pendapatan - Biaya)"]
        OUT["Piutang Layanan Aktif (Belum Lunas)"]
        CSV["Laporan Analitik & Ekspor CSV (/reports)"]
    end

    subgraph Peringatan["Notifikasi Pintar Otomatis (/notifications)"]
        N1["Peringatan Stok <= Minimum"]
        N2["Peringatan Produk Expired <= 30 Hari"]
        N3["Peringatan Vaksin Hewan <= 21 Hari"]
        N4["Pengingat Check-In & Check-Out Hari Ini"]
    end

    POS --> REV
    GRM --> REV
    HTL --> REV
    GRM --> OUT
    HTL --> OUT
    REV --> NET
    EXP --> NET
    NET --> CSV

    PRD --> N1
    PRD --> N2
    PET --> N3
    HTL --> N4
```

---

## 6. Entity-Relationship Diagram (ERD) Skema Database Multi-Tenant

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ ORGANIZATION_MEMBERS : "memiliki anggota"
    USERS ||--o{ ORGANIZATION_MEMBERS : "tergabung di"
    ORGANIZATIONS ||--o{ CUSTOMERS : "menaungi"
    CUSTOMERS ||--o{ PETS : "memiliki hewan"
    ORGANIZATIONS ||--o{ PRODUCTS : "menyimpan katalog"
    PRODUCTS ||--o{ STOCK_MOVEMENTS : "mencatat mutasi"
    ORGANIZATIONS ||--o{ POS_ORDERS : "menerbitkan nota"
    CUSTOMERS ||--o{ POS_ORDERS : "berbelanja"
    POS_ORDERS ||--|{ POS_ORDER_ITEMS : "berisi item"
    PRODUCTS ||--o{ POS_ORDER_ITEMS : "terjual pada"
    ORGANIZATIONS ||--o{ KENNELS : "memiliki kandang"
    KENNELS ||--o{ BOARDING_STAYS : "ditempati kontrak"
    CUSTOMERS ||--o{ BOARDING_STAYS : "menitipkan"
    PETS ||--o{ BOARDING_STAYS : "menginap"
    BOARDING_STAYS ||--o{ BOARDING_LOGS : "memiliki care log"
    CUSTOMERS ||--o{ GROOMING_APPOINTMENTS : "memesan"
    PETS ||--o{ GROOMING_APPOINTMENTS : "dirawat di"
    ORGANIZATIONS ||--o{ EXPENSES : "mencatat biaya"
```
