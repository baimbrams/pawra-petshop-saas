# Pawra — Multi-Tenant Pet Shop, Grooming & Pet Hotel SaaS

Platform SaaS B2B modern yang terinspirasi langsung dari arsitektur engineering **Atlas SaaS**, dirancang khusus dari nol untuk operasional **Pet Shop, Layanan Grooming, dan Pet Hotel (Penitipan Hewan)** multi-cabang.

Setiap toko/cabang adalah **tenant terisolasi** yang berbagi satu aplikasi dan satu skema database PostgreSQL/Supabase dengan proteksi **Row Level Security (RLS)**.

---

## Fitur Utama (All-in-One)

1. **Ringkasan Eksekutif & Operasional (`/`)**
   - Pemantauan antrean grooming hari ini, jadwal check-in/out Pet Hotel, peringatan stok menipis & produk mendekati expired, strip okupansi kandang real-time, serta grafik tren kas harian.
2. **Kasir Point of Sale / POS (`/pos`)**
   - Pencarian cepat nama produk/SKU/barcode, filter kategori, kalkulasi diskon & PPN otomatis, pembayaran `QRIS`, `Tunai` (hitung kembalian), `Transfer`, `Kartu`, pemotongan stok otomatis, poin loyalti pelanggan, dan **Struk Digital Siap Cetak**.
3. **Layanan & Antrean Grooming (`/grooming`)**
   - Penjadwalan paket mandi/styling/anti-kutu, penugasan groomer, peringatan alergi sampo atau sifat hewan, dan tahapan status (`Terjadwal` → `Sedang Grooming` → `Siap Jemput` → `Selesai`).
4. **Pet Hotel & Kontrak Penitipan (`/boarding`)**
   - Reservasi dan check-in kandang dengan **proteksi anti-bentrok jadwal** (*GiST overlap protection*), pemeriksaan masa berlaku vaksin hewan, manajemen deposit/pelunasan, serta **Daily Care Log** (nafsu makan, mood, catatan WhatsApp pemilik).
5. **Kalender Okupansi & Kandang (`/calendar` & `/kennels`)**
   - Matriks visual ketersediaan unit kandang 12 hari ke depan serta pemisahan tegas antara *Status Operasional* (Aktif / Sterilisasi UV) dan *Status Okupansi* aktual.
6. **Produk, Stok & Peringatan Expired (`/products`)**
   - Manajemen HPP, harga jual, mutasi restock/barang rusak, deteksi produk kedaluwarsa ≤ 30 hari, serta ekspor CSV.
7. **CRM Pelanggan & Profil Hewan (`/customers`)**
   - Satu pemilik dapat memiliki banyak profil hewan lengkap dengan ras, usia, berat, status steril, masa berlaku vaksin, serta riwayat belanja/grooming/hotel terpadu.
8. **Keuangan, Laporan, Tim Multi-Role & Billing SaaS (`/expenses`, `/reports`, `/team`, `/billing`, `/settings`)**
   - Buku besar pengeluaran dengan fitur *Void*, analitik produk terlaris, hirarki 4 role (`Owner > Admin > Manager > Staff`), tautan undangan sekali pakai, switcher multi-cabang, dan simulasi hak akses.

---

## Cara Menjalankan Langsung (Mode Demo Lokal Instan)

Aplikasi dilengkapi **Dual-Backend Engine**: Anda dapat langsung menjalankan dan mencoba seluruh fitur multi-tenant (lengkap dengan 2 cabang Pet Shop contoh: *Pawra Kemang* & *Pawra Dago Bandung*) **tanpa perlu setup server terlebih dahulu**:

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`, lalu klik **"Coba Dashboard Demo Instan"** pada halaman utama.

---

## Menghubungkan ke Supabase Produksi

Saat siap online ke produksi multi-tenant sesungguhnya:

1. Buat proyek baru di [Supabase](https://supabase.com).
2. Terapkan migrasi SQL berurutan di folder `supabase/migrations/`:
   ```bash
   npx supabase login
   npx supabase link --project-ref <project-ref-anda>
   npx supabase db push
   ```
3. Salin `.env.example` menjadi `.env.local` dan isi 2 variabel publik:
   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-atau-anon-key-anda>
   ```
   *(Jangan pernah menaruh `service_role` atau `sb_secret_` di variabel `VITE_`; aplikasi memiliki penjaga keamanan startup yang akan menolak kunci berbahaya secara otomatis).*

---

## Perintah Pengembangan & Pengujian

| Perintah | Fungsi |
| :--- | :--- |
| `npm run dev` | Menjalankan server pengembangan Vite |
| `npm run typecheck` | Memeriksa keamanan tipe TypeScript secara menyeluruh |
| `npm run test` | Menjalankan suite pengujian unit & invariant domain dengan Vitest |
| `npm run build` | Membangun bundle produksi statis ke folder `dist/` |
| `npm run verify` | Menjalankan `typecheck` + `test` + `build` sekaligus |
