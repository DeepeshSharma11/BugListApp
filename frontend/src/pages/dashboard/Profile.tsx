import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'

export default function Profile() {
  const [loading, setLoading] = useState(true)
  const [fullName, setFullName] = useState('Not available')
  const [email, setEmail] = useState('Not available')
  const [role, setRole] = useState('member')
  const [teamId, setTeamId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

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

  const handleResetPassword = async () => {
    if (!email || email === 'Not available') {
      setResetMessage('Email nahi mila, password reset link nahi bhej paaye.')
      return
    }

    setResetLoading(true)
    setResetMessage(null)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/dashboard`,
    })

    if (resetError) {
      setResetMessage(resetError.message)
    } else {
      setResetMessage('Password reset link aapke email par bhej diya gaya hai.')
    }

    setResetLoading(false)
  }

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
              <p className="mt-1.5 text-base font-semibold capitalize">
                {role.replace('_', ' ')}
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">Team ID</p>
              <p className="mt-1.5 break-all text-base font-semibold text-[var(--muted-text)]">
                {teamId ?? 'Not assigned'}
              </p>
            </div>
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
              A password reset link will be sent to <span className="font-bold">{email}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetLoading || loading}
            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md disabled:hover:bg-blue-600"
          >
            {resetLoading ? 'Sending reset link...' : 'Send Reset Link'}
          </button>

          {resetMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900/50 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              {resetMessage}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">User ID</p>
            <p className="mt-1.5 break-all text-sm font-medium text-[var(--muted-text)] bg-[var(--soft-surface)] p-3 rounded-lg border border-[var(--border-color)]">{userId ?? 'Not available'}</p>
          </div>
        </section>
      </div>

      {loading && (
        <div className="card text-sm font-medium animate-pulse text-center p-6">
          Loading profile...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-900/50 p-4 text-sm font-medium text-orange-700 dark:text-orange-400">
          Profile data partially loaded. Reason: {error}
        </div>
      )}
    </div>
  )
}
