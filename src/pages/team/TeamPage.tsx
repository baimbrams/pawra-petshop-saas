import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Plus, ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  useToast,
} from '@/components/ui'
import { useOrganization, usePermission, useWorkspace } from '@/features/workspace/workspace-context'
import {
  type OrgRole,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from '@/lib/authz/permissions'
import { api } from '@/lib/data/api'
import { formatDateId } from '@/lib/datetime/dates'

export function TeamPage() {
  const organization = useOrganization()
  const { user } = useWorkspace()
  const canInvite = usePermission('team.invite')
  const canUpdate = usePermission('team.update')
  const queryClient = useQueryClient()
  const { pushToast } = useToast()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<Exclude<OrgRole, 'owner'>>('staff')
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  const { data } = useQuery({
    queryKey: ['team', organization.id],
    queryFn: () => api.listTeam(organization.id),
  })

  const members = data?.members ?? []
  const invitations = data?.invitations ?? []
  const auditEvents = data?.auditEvents ?? []

  const inviteMutation = useMutation({
    mutationFn: () =>
      api.inviteMember(organization.id, {
        email: inviteEmail,
        role: inviteRole,
        actorName: user?.full_name ?? 'Admin',
      }),
    onSuccess: (res) => {
      setInviteEmail('')
      setGeneratedLink(res.oneTimeLink)
      void queryClient.invalidateQueries({ queryKey: ['team', organization.id] })
      pushToast({
        title: 'Undangan berhasil dibuat',
        description: 'Salin tautan sekali pakai di bawah untuk dikirim ke calon staf.',
      })
    },
  })

  const roleMutation = useMutation({
    mutationFn: (input: { membershipId: string; role: Exclude<OrgRole, 'owner'> }) =>
      api.updateMemberRole(
        organization.id,
        input.membershipId,
        input.role,
        user?.full_name ?? 'Admin',
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', organization.id] })
      pushToast({ title: 'Role anggota berhasil diperbarui' })
    },
  })

  const revokeMutation = useMutation({
    mutationFn: (id: string) =>
      api.revokeInvitation(organization.id, id, user?.full_name ?? 'Admin'),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['team', organization.id] })
      pushToast({ title: 'Undangan dibatalkan', tone: 'info' })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tim & Hak Akses Cabang"
        description={`Atur wewenang kasir, groomer, manajer, dan administrator untuk ${organization.name}.`}
        actions={
          canInvite ? (
            <Button
              variant="primary"
              leadingIcon={<Plus />}
              onClick={() => {
                setGeneratedLink(null)
                setIsInviteOpen(true)
              }}
            >
              Undang Anggota Tim
            </Button>
          ) : null
        }
      />

      {/* Role Reference Strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(['owner', 'admin', 'manager', 'staff'] as const).map((r) => (
          <Card key={r} className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <ShieldCheck className="text-brand-600 size-3.5" />
              <span>{ROLE_LABELS[r]}</span>
            </div>
            <p className="text-ink-muted mt-1.5 text-[0.75rem] leading-relaxed">
              {ROLE_DESCRIPTIONS[r]}
            </p>
          </Card>
        ))}
      </div>

      {/* Active Members */}
      <Card>
        <CardHeader
          title={`Anggota Aktif (${members.length})`}
          description="Kepemilikan Owner dilindungi penuh agar cabang tidak pernah tanpa pemilik."
        />
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-line bg-surface-muted border-b">
                <th className="eyebrow px-4 py-2.5 text-start">Nama</th>
                <th className="eyebrow px-4 py-2.5 text-start">Email</th>
                <th className="eyebrow px-4 py-2.5 text-start">Bergabung</th>
                <th className="eyebrow px-4 py-2.5 text-end">Role Akses</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {members.map((m) => (
                <tr key={m.id}>
                  <td className="px-4 py-3 font-semibold">{m.user.full_name}</td>
                  <td className="text-ink-muted px-4 py-3">{m.user.email}</td>
                  <td className="text-ink-subtle px-4 py-3">{formatDateId(m.joined_at)}</td>
                  <td className="px-4 py-3 text-end">
                    {m.role === 'owner' || !canUpdate ? (
                      <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>
                        {ROLE_LABELS[m.role]}
                      </Badge>
                    ) : (
                      <div className="inline-block w-48 text-start">
                        <Select
                          value={m.role}
                          onChange={(e) =>
                            roleMutation.mutate({
                              membershipId: m.id,
                              role: e.target.value as Exclude<OrgRole, 'owner'>,
                            })
                          }
                          options={[
                            { value: 'admin', label: ROLE_LABELS.admin },
                            { value: 'manager', label: ROLE_LABELS.manager },
                            { value: 'staff', label: ROLE_LABELS.staff },
                          ]}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Invitations & Audit Log */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Undangan Tertunda" />
          <CardBody className="space-y-3 text-xs">
            {invitations.length === 0 ? (
              <p className="text-ink-muted">Tidak ada undangan aktif.</p>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="border-line flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-semibold">{inv.email}</p>
                    <p className="text-ink-subtle text-[0.6875rem]">
                      Role: {ROLE_LABELS[inv.role]} · Token: {inv.token_preview}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      tone={
                        inv.status === 'pending'
                          ? 'caution'
                          : inv.status === 'accepted'
                            ? 'positive'
                            : 'neutral'
                      }
                    >
                      {inv.status}
                    </Badge>
                    {inv.status === 'pending' && canInvite ? (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => revokeMutation.mutate(inv.id)}
                      >
                        Batalkan
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Riwayat Audit Keanggotaan" />
          <CardBody className="space-y-2.5 text-xs">
            {auditEvents.length === 0 ? (
              <p className="text-ink-muted">Belum ada catatan aktivitas tim.</p>
            ) : (
              auditEvents.map((ev) => (
                <div key={ev.id} className="border-line border-b pb-2 last:border-none">
                  <p>
                    <strong>{ev.actor_name}</strong> — {ev.action}:{' '}
                    <span className="text-brand-700 font-medium">{ev.target_label}</span>
                  </p>
                  <p className="text-ink-subtle text-[0.6875rem]">{formatDateId(ev.created_at, true)}</p>
                </div>
              ))
            )}
          </CardBody>
        </Card>
      </div>

      {/* Invite Modal */}
      <Modal
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Undang Anggota Tim Baru"
        description="Hasilkan tautan undangan aman sekali pakai (SHA-256 token) untuk dibagikan via WhatsApp atau email."
      >
        <div className="space-y-4">
          {generatedLink ? (
            <Alert tone="positive" title="Tautan Undangan Sekali Pakai Siap Dibagikan">
              <p className="mt-1 break-all font-mono text-[0.7rem]">{generatedLink}</p>
              <div className="mt-3">
                <Button
                  size="xs"
                  variant="secondary"
                  leadingIcon={<Copy />}
                  onClick={() => {
                    void navigator.clipboard?.writeText(generatedLink)
                    pushToast({ title: 'Tautan disalin ke clipboard' })
                  }}
                >
                  Salin Tautan
                </Button>
              </div>
            </Alert>
          ) : null}

          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              inviteMutation.mutate()
            }}
            className="space-y-4"
          >
            <Field label="Email Calon Anggota" required>
              <Input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="kasir.baru@petshop.id"
              />
            </Field>
            <Field label="Role Wewenang">
              <Select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Exclude<OrgRole, 'owner'>)}
                options={[
                  { value: 'staff', label: ROLE_LABELS.staff },
                  { value: 'manager', label: ROLE_LABELS.manager },
                  { value: 'admin', label: ROLE_LABELS.admin },
                ]}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setIsInviteOpen(false)}>
                Tutup
              </Button>
              <Button type="submit" variant="primary" disabled={inviteMutation.isPending}>
                Buat Undangan
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  )
}
