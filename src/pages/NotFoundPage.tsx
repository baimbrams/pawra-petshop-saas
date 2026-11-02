import { paths } from '@/app/routes/paths'
import { ButtonLink, Card, EmptyState } from '@/components/ui'

export function NotFoundPage() {
  return (
    <Card>
      <EmptyState
        title="Halaman tidak ditemukan (404)"
        description="Alamat rute yang Anda tuju tidak tersedia di ruang kerja ini."
        action={
          <ButtonLink variant="primary" size="sm" to={paths.overview}>
            Kembali ke Ringkasan
          </ButtonLink>
        }
      />
    </Card>
  )
}
