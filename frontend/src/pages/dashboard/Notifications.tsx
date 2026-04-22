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
          <h2 className="text-3xl font-extrabold tracking-tight">Notifications</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
            Bug updates, team assignment changes, comments, and role updates will appear here.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void markAllAsRead()}
          disabled={saving || unreadCount === 0}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md disabled:hover:bg-blue-600"
        >
          Mark All As Read
        </button>
      </div>

      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-4 text-sm font-medium text-[var(--text-color)]">
        <span className="font-bold text-blue-600 dark:text-blue-400">{unreadCount}</span> unread notification(s)
      </div>

      {loading && (
        <div className="card text-sm font-medium animate-pulse text-center p-6">
          Loading notifications...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900/50 p-4 text-sm font-medium text-red-700 dark:text-red-400">
          Failed to load notifications: {error}
        </div>
      )}

      <div className="space-y-3">
        {!loading && notifications.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-8 text-center text-sm font-medium text-[var(--muted-text)]">
            No notifications yet. You're all caught up!
          </div>
        )}

        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`card hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group ${
              !notification.is_read
                ? 'border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-900/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : ''
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className={`text-lg font-bold group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${!notification.is_read ? 'text-blue-900 dark:text-blue-100' : 'text-[var(--text-color)]'}`}>
                    {notification.title}
                  </h3>
                  {!notification.is_read && (
                    <span className="rounded-full bg-blue-100 dark:bg-blue-900/40 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                      New
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm font-medium leading-relaxed ${!notification.is_read ? 'text-blue-800 dark:text-blue-200' : 'text-[var(--muted-text)]'}`}>
                  {notification.message}
                </p>
                <p className="mt-3 text-xs font-semibold text-[var(--muted-text)] flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {formatTime(notification.created_at)}
                </p>
              </div>

              <div className="flex gap-2 sm:flex-col shrink-0 mt-2 sm:mt-0">
                <Link
                  to={buildLink(notification)}
                  className="inline-flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] hover:bg-[var(--border-color)] px-4 py-2 text-sm font-bold transition-colors w-full sm:w-auto"
                >
                  View
                </Link>
                {!notification.is_read && (
                  <button
                    type="button"
                    onClick={() => void markOneAsRead(notification.id)}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm w-full sm:w-auto"
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
