import type {
  BoardingStatus,
  ExpenseCategory,
  GroomingStatus,
  KennelOperationalStatus,
  KennelSize,
  PaymentMethod,
  PetSpecies,
  ProductCategory,
  VaccineStatus,
} from '@/types/domain'

export const SPECIES_LABELS: Readonly<Record<PetSpecies, string>> = {
  cat: 'Kucing',
  dog: 'Anjing',
  rabbit: 'Kelinci',
  bird: 'Burung',
  hamster: 'Hamster',
  other: 'Lainnya',
}

export const PRODUCT_CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  cat_food: 'Makanan Kucing',
  dog_food: 'Makanan Anjing',
  vitamins_meds: 'Vitamin & Obat',
  litter_hygiene: 'Pasir & Kebersihan',
  accessories: 'Aksesoris & Mainan',
  treats: 'Snack & Treats',
}

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  qris: 'QRIS',
  cash: 'Tunai',
  bank_transfer: 'Transfer Bank',
  card: 'Kartu Debit/Kredit',
}

export const GROOMING_STATUS_LABELS: Readonly<Record<GroomingStatus, string>> = {
  scheduled: 'Terjadwal',
  checked_in: 'Sudah Datang',
  in_progress: 'Sedang Grooming',
  ready_pickup: 'Siap Dijemput',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const BOARDING_STATUS_LABELS: Readonly<Record<BoardingStatus, string>> = {
  reserved: 'Dipesan (Reservasi)',
  checked_in: 'Sedang Menginap',
  checked_out: 'Sudah Check-Out',
  cancelled: 'Dibatalkan',
}

export const KENNEL_STATUS_LABELS: Readonly<Record<KennelOperationalStatus, string>> = {
  active: 'Aktif Beroperasi',
  maintenance: 'Sterilisasi / Perawatan',
  inactive: 'Nonaktif',
}

export const KENNEL_SIZE_LABELS: Readonly<Record<KennelSize, string>> = {
  small: 'Small (S)',
  medium: 'Medium (M)',
  large: 'Large (L)',
  vip: 'VIP Suite',
}

export const EXPENSE_CATEGORY_LABELS: Readonly<Record<ExpenseCategory, string>> = {
  inventory_restock: 'Belanja Stok & Supplier',
  staff_payroll: 'Gaji & Komisi Groomer',
  utilities: 'Listrik, Air & Internet',
  rent: 'Sewa Tempat / Ruko',
  hygiene_supplies: 'Shampo, Disinfektan & Kebersihan',
  equipment_maintenance: 'Perawatan Alat & Kandang',
  marketing_other: 'Promosi & Operasional Lain',
}

export const VACCINE_STATUS_LABELS: Readonly<Record<VaccineStatus, string>> = {
  valid: 'Vaksin Aktif',
  expiring_soon: 'Segera Kedaluwarsa',
  expired: 'Vaksin Kedaluwarsa',
  unvaccinated: 'Belum Vaksin',
}

export const GROOMING_PACKAGES = [
  { name: 'Basic Healthy Bath', duration: 60, defaultPriceIdr: 85_000 },
  { name: 'Full Grooming & Styling', duration: 120, defaultPriceIdr: 165_000 },
  { name: 'Medicated Anti-Kutu & Jamur', duration: 90, defaultPriceIdr: 145_000 },
  { name: 'Luxury Spa & Deshedding', duration: 120, defaultPriceIdr: 210_000 },
  { name: 'Nail Trim, Ear & Paw Care', duration: 30, defaultPriceIdr: 45_000 },
] as const
