import { useQueryClient } from '@tanstack/react-query'
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { type OrgRole, type Permission, can } from '@/lib/authz/permissions'
import { type BackendMode, getEnvironment } from '@/lib/config/env'
import {
  getLocalSession,
  localSignInDemoOwner,
  localSignInWithEmail,
  localSignOut,
  localSignUp,
  localSimulateRole,
  localSwitchOrganization,
  resetLocalDemoDatabase,
  subscribeLocalStore,
} from '@/lib/data/local-store'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Organization, OrganizationMembership, UserProfile } from '@/types/domain'

export interface WorkspaceContextValue {
  mode: BackendMode
  isLoading: boolean
  user: UserProfile | null
  memberships: OrganizationMembership[]
  organization: Organization | null
  role: OrgRole | null
  signInDemoOwner: () => void
  signInWithEmail: (email: string, password?: string) => Promise<void>
  signUp: (input: {
    fullName: string
    email: string
    password?: string
    shopName?: string
    city?: string
  }) => Promise<void>
  signOut: () => Promise<void>
  switchOrganization: (organizationId: string) => void
  simulateRole: (role: OrgRole) => void
  resetDemoData: () => void
  refreshSession: () => void
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const env = getEnvironment()
  const mode: BackendMode = env.status === 'ok' ? env.mode : 'demo'

  const [version, setVersion] = useState(0)
  const [sbLoading, setSbLoading] = useState(mode === 'supabase')
  const [sbUser, setSbUser] = useState<UserProfile | null>(null)
  const [sbMemberships, setSbMemberships] = useState<OrganizationMembership[]>([])
  const [sbActiveOrgId, setSbActiveOrgId] = useState<string | null>(null)

  const refreshSession = useCallback(() => {
    setVersion((v) => v + 1)
    void queryClient.invalidateQueries()
  }, [queryClient])

  useEffect(() => {
    if (mode !== 'demo') return
    return subscribeLocalStore(() => {
      setVersion((v) => v + 1)
      void queryClient.invalidateQueries()
    })
  }, [mode, queryClient])

  // Supabase Auth listener when connected to Supabase Cloud
  useEffect(() => {
    if (mode !== 'supabase') return
    const sb = getSupabaseClient()
    if (!sb) return

    let active = true

    const loadSupabaseWorkspace = async () => {
      setSbLoading(true)
      const { data: sessionData } = await sb.auth.getSession()
      const authUser = sessionData.session?.user
      if (!authUser) {
        if (active) {
          setSbUser(null)
          setSbMemberships([])
          setSbActiveOrgId(null)
          setSbLoading(false)
        }
        return
      }

      const profile: UserProfile = {
        id: authUser.id,
        email: authUser.email ?? '',
        full_name: (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email ?? 'Pengguna',
        created_at: authUser.created_at,
      }

      const { data: rows } = await sb
        .from('organization_members')
        .select('id, organization_id, user_id, role, joined_at, organization:organizations(*)')
        .eq('user_id', authUser.id)

      const mapped: OrganizationMembership[] = ((rows ?? []) as unknown as Array<{
        id: string
        organization_id: string
        user_id: string
        role: OrgRole
        joined_at: string
        organization: Organization
      }>).map((r) => ({
        id: r.id,
        organization_id: r.organization_id,
        user_id: r.user_id,
        role: r.role,
        joined_at: r.joined_at,
        user: profile,
        organization: r.organization,
      }))

      if (active) {
        setSbUser(profile)
        setSbMemberships(mapped)
        setSbActiveOrgId((prev) =>
          mapped.some((m) => m.organization_id === prev)
            ? prev
            : (mapped[0]?.organization_id ?? null),
        )
        setSbLoading(false)
      }
    }

    void loadSupabaseWorkspace()

    const { data: listener } = sb.auth.onAuthStateChange(() => {
      void loadSupabaseWorkspace()
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [mode, version])

  const demoSnapshot = useMemo(() => {
    void version
    if (mode !== 'demo') return null
    return getLocalSession()
  }, [mode, version])

  const user = mode === 'demo' ? (demoSnapshot?.user ?? null) : sbUser
  const memberships = useMemo(
    () => (mode === 'demo' ? (demoSnapshot?.memberships ?? []) : sbMemberships),
    [mode, demoSnapshot, sbMemberships],
  )
  const activeOrgId = mode === 'demo' ? (demoSnapshot?.activeOrganizationId ?? null) : sbActiveOrgId

  const activeMembership = useMemo(
    () => memberships.find((m) => m.organization_id === activeOrgId) ?? memberships[0] ?? null,
    [memberships, activeOrgId],
  )

  const signInDemoOwner = useCallback(() => {
    localSignInDemoOwner()
  }, [])

  const signInWithEmail = useCallback(
    async (email: string, password?: string) => {
      if (mode === 'supabase') {
        const sb = getSupabaseClient()!
        const { error } = await sb.auth.signInWithPassword({
          email,
          password: password || '',
        })
        if (error) throw new Error(error.message)
        return
      }
      localSignInWithEmail(email)
    },
    [mode],
  )

  const signUp = useCallback(
    async (input: {
      fullName: string
      email: string
      password?: string
      shopName?: string
      city?: string
    }) => {
      if (mode === 'supabase') {
        const sb = getSupabaseClient()!
        const { error } = await sb.auth.signUp({
          email: input.email,
          password: input.password || '',
          options: {
            data: { full_name: input.fullName },
          },
        })
        if (error) throw new Error(error.message)
        return
      }
      localSignUp(input)
    },
    [mode],
  )

  const signOut = useCallback(async () => {
    if (mode === 'supabase') {
      const sb = getSupabaseClient()!
      await sb.auth.signOut()
      return
    }
    localSignOut()
  }, [mode])

  const switchOrganization = useCallback(
    (organizationId: string) => {
      if (mode === 'supabase') {
        setSbActiveOrgId(organizationId)
        void queryClient.invalidateQueries()
        return
      }
      localSwitchOrganization(organizationId)
    },
    [mode, queryClient],
  )

  const simulateRole = useCallback(
    (nextRole: OrgRole) => {
      if (mode === 'demo' && activeMembership) {
        localSimulateRole(activeMembership.organization.id, nextRole)
      }
    },
    [mode, activeMembership],
  )

  const resetDemoData = useCallback(() => {
    if (mode === 'demo') {
      resetLocalDemoDatabase(true)
    }
  }, [mode])

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      mode,
      isLoading: mode === 'supabase' ? sbLoading : false,
      user,
      memberships,
      organization: activeMembership?.organization ?? null,
      role: activeMembership?.role ?? null,
      signInDemoOwner,
      signInWithEmail,
      signUp,
      signOut,
      switchOrganization,
      simulateRole,
      resetDemoData,
      refreshSession,
    }),
    [
      mode,
      sbLoading,
      user,
      memberships,
      activeMembership,
      signInDemoOwner,
      signInWithEmail,
      signUp,
      signOut,
      switchOrganization,
      simulateRole,
      resetDemoData,
      refreshSession,
    ],
  )

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}

export function useOrganization(): Organization {
  const { organization } = useWorkspace()
  if (!organization) {
    throw new Error('useOrganization dipanggil di luar rute RequireOrganization')
  }
  return organization
}

export function usePermission(permission: Permission): boolean {
  const { role } = useWorkspace()
  return can(role, permission)
}
