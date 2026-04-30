import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { getAuthState } from '../lib/auth'

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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function buildLink(n: NotificationRow): string {
  if (n.entity_type === 'bug' && n.entity_id) return `/dashboard/bugs/${n.entity_id}`
  if (n.entity_type === 'team') return '/dashboard/team'
  return '/dashboard/profile'
}

const TYPE_ICON: Record<string, string> = {
  bug_assigned: '🐛',
  bug_updated: '🔄',
  bug_resolved: '✅',
  team_assigned: '👥',
  role_changed: '🛡️',
  default: '🔔',
}

interface Props {
  open: boolean
  onClose: () => void
  onUnreadCountChange?: (count: number) => void
}

export default function NotificationPanel({ open, onClose, onUnreadCountChange }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Lock body scroll when panel is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  // Fetch notifications when panel opens
  useEffect(() => {
    if (!open) return
    let alive = true
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const auth = await getAuthState()
        const token = auth.session?.access_token
        if (!token) { setError('Not logged in.'); setLoading(false); return }
        const res = await fetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        if (alive) {
          setNotifications(data ?? [])
          const unread = (data ?? []).filter((n: NotificationRow) => !n.is_read).length
          onUnreadCountChange?.(unread)
        }
      } catch (e: any) {
        if (alive) setError(e.message)
      } finally {
        if (alive) setLoading(false)
      }
    }
    void load()
    return () => { alive = false }
  }, [open])

  const getToken = async () => {
    const auth = await getAuthState()
    return auth.session?.access_token ?? ''
  }

  const markOneRead = async (id: string) => {
    setSaving(true)
    try {
      const token = await getToken()
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications(ns => {
        const updated = ns.map(n => n.id === id ? { ...n, is_read: true } : n)
        onUnreadCountChange?.(updated.filter(n => !n.is_read).length)
        return updated
      })
    } catch { }
    finally { setSaving(false) }
  }

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (!unreadIds.length) return
    setSaving(true)
    try {
      const token = await getToken()
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ unread_ids: unreadIds }),
      })
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })))
      onUnreadCountChange?.(0)
    } catch { }
    finally { setSaving(false) }
  }

  const clearAll = async () => {
    if (!window.confirm('Delete all notifications permanently?')) return
    setSaving(true)
    try {
      const token = await getToken()
      await fetch('/api/notifications/clear-all', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setNotifications([])
      onUnreadCountChange?.(0)
    } catch { }
    finally { setSaving(false) }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  if (!open) return null

  return createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px]"
        style={{ animation: 'fadeInBackdrop 0.2s ease' }}
      />

      {/* Slide-in panel */}
      <div
        ref={panelRef}
        className="fixed top-0 right-0 z-[70] h-full flex flex-col"
        style={{
          width: 'min(420px, 92vw)',
          background: 'var(--card-color)',
          borderLeft: '3px solid var(--accent)',
          boxShadow: '-12px 0 40px rgba(0,0,0,0.2)',
          animation: 'slideInRight 0.28s cubic-bezier(0.4,0,0.2,1)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-extrabold tracking-tight">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--soft-surface)]"
            style={{ color: 'var(--muted-text)', border: '1px solid var(--border-color)' }}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M18 6 6 18" /><path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Actions bar */}
        <div
          className="flex items-center gap-2 px-5 py-2.5 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--soft-surface)' }}
        >
          <button
            onClick={() => void markAllRead()}
            disabled={saving || unreadCount === 0}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            Mark all read
          </button>
          <button
            onClick={() => void clearAll()}
            disabled={saving || notifications.length === 0}
            className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ borderColor: 'var(--border-color)', color: 'var(--muted-text)' }}
          >
            Clear all
          </button>
        </div>

        {/* Notification list — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loading && (
            <div className="px-5 py-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--soft-surface)' }} />
              ))}
            </div>
          )}

          {error && (
            <div className="mx-5 mt-4 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--muted-text)' }}>
                You're all caught up!
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--muted-text)' }}>No notifications.</p>
            </div>
          )}

          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {notifications.map(n => (
              <div
                key={n.id}
                className="px-5 py-3.5 transition-colors hover:bg-[var(--soft-surface)]"
                style={{
                  background: !n.is_read ? 'var(--accent-soft)' : 'transparent',
                  borderLeftWidth: !n.is_read ? 3 : 0,
                  borderLeftColor: !n.is_read ? 'var(--accent)' : 'transparent',
                  borderLeftStyle: 'solid',
                }}
              >
                <div className="flex gap-3">
                  {/* Icon */}
                  <div className="text-base flex-shrink-0 mt-0.5">
                    {TYPE_ICON[n.type] || TYPE_ICON.default}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-bold' : 'font-medium'}`}
                        style={{ color: 'var(--text-color)' }}>
                        {n.title}
                      </p>
                      <span className="text-[10px] font-medium flex-shrink-0 mt-0.5"
                        style={{ color: 'var(--muted-text)' }}>
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 leading-relaxed line-clamp-2"
                      style={{ color: 'var(--muted-text)' }}>
                      {n.message}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <Link
                        to={buildLink(n)}
                        onClick={onClose}
                        className="text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors"
                        style={{ background: 'var(--soft-surface)', color: 'var(--accent)', border: '1px solid var(--border-color)' }}
                      >
                        View
                      </Link>
                      {!n.is_read && (
                        <button
                          onClick={() => void markOneRead(n.id)}
                          disabled={saving}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors disabled:opacity-40"
                          style={{ color: 'var(--muted-text)' }}
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>,
    document.body
  )
}
