import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'

interface NotificationRow {
  id: string
  type: string
  title: string
  message: string
  entity_type: string | null
  entity_id: string | null
  is_read: boolean
  created_at: string
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildLink(notification: NotificationRow) {
  if (notification.entity_type === 'bug' && notification.entity_id) {
    return `/dashboard/bugs/${notification.entity_id}`
  }

  if (notification.entity_type === 'team') {
    return '/dashboard/team'
  }

  return '/dashboard/profile'
}

export default function Notifications() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true)
      setError(null)

      // Get current user id first
      const auth = await getAuthState()
      const userId = auth.session?.user?.id
      if (!userId) {
        setError('Not logged in.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type, title, message, entity_type, entity_id, is_read, created_at')
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError(fetchError.message)
      } else {
        setNotifications(data ?? [])
      }

      setLoading(false)
    }

    void loadNotifications()
  }, [])

  async function markOneAsRead(id: string) {
    setSaving(true)
    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id ? { ...notification, is_read: true } : notification
        )
      )
    }
    setSaving(false)
  }

  async function markAllAsRead() {
    setSaving(true)
    const unreadIds = notifications.filter((notification) => !notification.is_read).map((n) => n.id)

    if (unreadIds.length === 0) {
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)

    if (updateError) {
      setError(updateError.message)
    } else {
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, is_read: true }))
      )
    }
    setSaving(false)
  }

  const unreadCount = notifications.filter((notification) => !notification.is_read).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Notifications</h2>
          <p className="mt-1 text-sm text-slate-600">
            Bug updates, team assignment changes, comments, aur role updates yahan milenge.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={saving || unreadCount === 0}
          className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Mark All As Read
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        {unreadCount} unread notification(s)
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading notifications...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load notifications: {error}
        </div>
      )}

      <div className="space-y-3">
        {!loading && notifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Abhi koi notifications nahi hain.
          </div>
        )}

        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`rounded-xl border p-4 shadow-sm transition ${
              notification.is_read
                ? 'border-slate-200 bg-white'
                : 'border-blue-200 bg-blue-50/70'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">{notification.title}</h3>
                  {!notification.is_read && (
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                      Unread
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                <p className="mt-2 text-xs text-slate-500">{formatTime(notification.created_at)}</p>
              </div>

              <div className="flex gap-2">
                <Link
                  to={buildLink(notification)}
                  className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Open
                </Link>
                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => void markOneAsRead(notification.id)}
                    disabled={saving}
                    className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
