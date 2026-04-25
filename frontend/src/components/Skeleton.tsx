import React from 'react'

/* ── Base shimmer block ─────────────────────────────────── */
export function Sk({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--soft-surface)' }}
    />
  )
}

/* ── Bug list row skeleton ──────────────────────────────── */
export function BugRowSkeleton() {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border"
      style={{ background: 'var(--card-color)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Sk className="h-5 w-3/4" />
          <Sk className="h-3.5 w-1/3" />
        </div>
        <div className="flex gap-2 sm:flex-col sm:items-end">
          <Sk className="h-6 w-16 rounded-full" />
          <Sk className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ── Notification row skeleton ──────────────────────────── */
export function NotificationSkeleton() {
  return (
    <div
      className="rounded-2xl p-4 sm:p-5 border space-y-3"
      style={{ background: 'var(--card-color)', borderColor: 'var(--border-color)' }}
    >
      <div className="flex items-center gap-3">
        <Sk className="h-5 w-1/2" />
        <Sk className="h-5 w-12 rounded-full" />
      </div>
      <Sk className="h-3.5 w-full" />
      <Sk className="h-3.5 w-2/3" />
      <Sk className="h-3 w-1/4" />
    </div>
  )
}

/* ── Profile field skeleton ─────────────────────────────── */
export function ProfileFieldSkeleton() {
  return (
    <div
      className="rounded-xl border p-5 space-y-2"
      style={{ background: 'var(--soft-surface)', borderColor: 'var(--border-color)' }}
    >
      <Sk className="h-3 w-1/3" />
      <Sk className="h-5 w-2/3" />
    </div>
  )
}

/* ── Bug detail skeleton ────────────────────────────────── */
export function BugDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
      {/* Header */}
      <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex gap-2">
          <Sk className="h-6 w-20 rounded-full" />
          <Sk className="h-6 w-20 rounded-full" />
        </div>
        <Sk className="h-8 w-3/4" />
        <Sk className="h-4 w-40" />
      </div>
      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div
            className="rounded-2xl p-5 border space-y-3"
            style={{ background: 'var(--card-color)', borderColor: 'var(--border-color)' }}
          >
            <Sk className="h-5 w-28" />
            <Sk className="h-4 w-full" />
            <Sk className="h-4 w-5/6" />
            <Sk className="h-4 w-4/5" />
            <Sk className="h-4 w-3/4" />
          </div>
        </div>
        <div>
          <div
            className="rounded-2xl p-5 border space-y-4"
            style={{ background: 'var(--soft-surface)', borderColor: 'var(--border-color)' }}
          >
            <Sk className="h-5 w-24" />
            <Sk className="h-4 w-1/2" />
            <Sk className="h-4 w-1/2" />
            <Sk className="h-4 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Submit page: "My Bugs" inline list skeleton ────────── */
export function SubmitBugsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <BugRowSkeleton key={i} />
      ))}
    </div>
  )
}

/* ── Admin Dashboard skeleton ───────────────────────────── */
export function AdminDashboardSkeleton() {
  return (
    <div className="w-full space-y-8 max-w-7xl mx-auto animate-pulse">
      <div className="border-b pb-6 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
        <Sk className="h-8 w-64" />
        <Sk className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
            <Sk className="h-4 w-1/2" />
            <Sk className="h-8 w-16" />
          </div>
        ))}
      </div>

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="card p-8 space-y-6">
          <Sk className="h-6 w-32" />
          <Sk className="h-10 w-full" />
          <Sk className="h-10 w-full" />
          <Sk className="h-12 w-full" />
        </div>
        <div className="card p-8 space-y-6">
          <Sk className="h-6 w-48" />
          <Sk className="h-10 w-full" />
          <Sk className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

/* ── Leaderboard Row Skeleton ───────────────────────────── */
export function LeaderboardRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 8px', borderRadius: 12,
      background: 'var(--soft-surface)', marginBottom: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: 28, height: 16, borderRadius: 6, background: 'var(--border-color)' }} />
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--border-color)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: '50%', height: 12, borderRadius: 6, background: 'var(--border-color)', marginBottom: 5 }} />
        <div style={{ width: '35%', height: 10, borderRadius: 6, background: 'var(--border-color)' }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 36, height: 28, borderRadius: 8, background: 'var(--border-color)' }} />
        ))}
      </div>
    </div>
  )
}
