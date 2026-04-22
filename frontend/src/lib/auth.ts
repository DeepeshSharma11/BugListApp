import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

export interface AuthProfile {
  full_name: string | null
  email: string | null
  role: string | null
  team_id: string | null
}

export interface AuthState {
  session: Session | null
  profile: AuthProfile | null
  role: string
  isAdmin: boolean
}

const ADMIN_ROLES = new Set(['admin', 'super_admin'])

export async function getAuthState(currentSession?: Session | null): Promise<AuthState> {
  const session =
    currentSession ??
    (
      await supabase.auth.getSession()
    ).data.session

  if (!session) {
    return {
      session: null,
      profile: null,
      role: 'guest',
      isAdmin: false,
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, email, role, team_id')
    .eq('id', session.user.id)
    .maybeSingle<AuthProfile>()

  if (error) {
    console.warn('Failed to read profile role from Supabase:', error.message)
  }

  const role =
    data?.role ||
    (typeof session.user.app_metadata?.role === 'string' ? session.user.app_metadata.role : null) ||
    'member'

  return {
    session,
    profile: data ?? null,
    role,
    isAdmin: ADMIN_ROLES.has(role),
  }
}
