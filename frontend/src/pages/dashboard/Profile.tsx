import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'
import { ProfileFieldSkeleton } from '../../components/Skeleton'

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('Not available')
  const [email, setEmail] = useState('Not available')
  const [role, setRole] = useState('member')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true)
      setError(null)

      const authState = await getAuthState()

      if (!authState.session?.user) {
        setError('No active session found.')
        setLoading(false)
        return
      }

      const authUser = authState.session.user
      const authName =
        typeof authUser.user_metadata?.full_name === 'string'
          ? authUser.user_metadata.full_name
          : null

      setUserId(authUser.id)
      setEmail(authUser.email ?? 'Not available')
      setFullName(authName || 'Not available')

      if (authState.profile) {
        setFullName(authState.profile.full_name || authName || 'Not available')
        setEmail(authState.profile.email || authUser.email || 'Not available')
        setRole(authState.role)
        setTeamId(authState.profile.team_id)
      } else {
        setRole('unknown')
        setError(
          'Profile row read nahi ho paayi. Supabase RLS policy check karo aur ensure karo ki current user ki profile row visible ho.'
        )
      }

      setLoading(false)
    }

    void loadProfile()
  }, [])


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Profile</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
          View your account details and manage security settings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="card">
          <div className="mb-6 border-b border-[var(--border-color)] pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
              Account Details
            </p>
            <h3 className="mt-1 text-xl font-bold">Personal Information</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {loading ? (
              <>
                <ProfileFieldSkeleton />
                <ProfileFieldSkeleton />
                <ProfileFieldSkeleton />
                <ProfileFieldSkeleton />
              </>
            ) : (
              <>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Full Name</p>
                  <p className="mt-1.5 text-base font-semibold">{fullName}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Email</p>
                  <p className="mt-1.5 break-all text-base font-semibold">{email}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Role</p>
                  <p className="mt-1.5 text-base font-semibold capitalize">{role.replace('_', ' ')}</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Team ID</p>
                  <p className="mt-1.5 break-all text-base font-semibold text-[var(--muted-text)]">{teamId ?? 'Not assigned'}</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="card">
          <div className="mb-6 border-b border-[var(--border-color)] pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
              Security
            </p>
            <h3 className="mt-1 text-xl font-bold">Password Reset</h3>
          </div>

          <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 p-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              For security reasons, to change your password, please <strong>log out</strong> and use the <strong>"Forgot Password"</strong> link on the login screen.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">User ID</p>
            <p className="mt-1.5 break-all text-sm font-medium text-[var(--muted-text)] bg-[var(--soft-surface)] p-3 rounded-lg border border-[var(--border-color)]">{userId ?? 'Not available'}</p>
          </div>
        </section>
      </div>

    </div>
  )
}
