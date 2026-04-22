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
        <h2 className="text-2xl font-semibold text-slate-900">Profile</h2>
        <p className="mt-2 text-sm text-slate-600">
          Yahan aap apna account name, email aur password reset details dekh sakte ho.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Account Details
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Personal Information</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Full Name</p>
              <p className="mt-2 text-base font-medium text-slate-900">{fullName}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</p>
              <p className="mt-2 break-all text-base font-medium text-slate-900">{email}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Role</p>
              <p className="mt-2 text-base font-medium capitalize text-slate-900">
                {role.replace('_', ' ')}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Team ID</p>
              <p className="mt-2 break-all text-base font-medium text-slate-900">
                {teamId ?? 'Not assigned'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Security
            </p>
            <h3 className="mt-2 text-xl font-semibold text-slate-900">Password Reset</h3>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm text-slate-700">
              Reset password link <span className="font-semibold">{email}</span> par bheja jayega.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resetLoading || loading}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetLoading ? 'Sending reset link...' : 'Send Reset Password Link'}
          </button>

          {resetMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {resetMessage}
            </div>
          )}

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">User ID</p>
            <p className="mt-2 break-all text-sm text-slate-900">{userId ?? 'Not available'}</p>
          </div>
        </section>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading profile...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Profile data partially load hui hai. Reason: {error}
        </div>
      )}
    </div>
  )
}
