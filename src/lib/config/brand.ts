export const BRAND = {
  name: (import.meta.env.VITE_APP_NAME as string | undefined)?.trim() || 'Pawra',
  tagline: 'Sistem Operasional Pet Shop, Grooming & Pet Hotel Multi-Cabang',
  version: '1.0.0',
} as const
