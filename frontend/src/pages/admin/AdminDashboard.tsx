import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'

interface BugRow {
  id: string
  title: string
  status: string
  severity: string
  priority: string
  team_id: string | null
  created_at: string
}

interface Stats {
  totalBugs: number
  openBugs: number
  resolvedBugs: number
  criticalBugs: number
  highPriorityBugs: number
  teamCount: number
}

const defaultStats: Stats = {
  totalBugs: 0,
  openBugs: 0,
  resolvedBugs: 0,
  criticalBugs: 0,
  highPriorityBugs: 0,
  teamCount: 0,
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function badgeClasses(type: 'status' | 'severity' | 'priority', value: string) {
  if (type === 'status') {
    if (value === 'resolved') return 'bg-emerald-100 text-emerald-700'
    if (value === 'open') return 'bg-amber-100 text-amber-700'
    if (value === 'closed') return 'bg-slate-200 text-slate-700'
    return 'bg-blue-100 text-blue-700'
  }

  if (type === 'severity') {
    if (value === 'critical') return 'bg-rose-100 text-rose-700'
    if (value === 'high') return 'bg-orange-100 text-orange-700'
    if (value === 'medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-slate-100 text-slate-700'
  }

  if (value === 'urgent') return 'bg-rose-100 text-rose-700'
  if (value === 'high') return 'bg-orange-100 text-orange-700'
  if (value === 'normal') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [recentBugs, setRecentBugs] = useState<BugRow[]>([])

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true)
      setError(null)

      const [{ data: bugs, error: bugsError }, { count: teamCount, error: teamsError }] =
        await Promise.all([
          supabase
            .from('bugs')
            .select('id, title, status, severity, priority, team_id, created_at')
            .order('created_at', { ascending: false }),
          supabase.from('teams').select('id', { count: 'exact', head: true }),
        ])

      if (bugsError || teamsError) {
        setError(bugsError?.message || teamsError?.message || 'Failed to load admin dashboard.')
        setLoading(false)
        return
      }

      const rows = bugs ?? []

      setStats({
        totalBugs: rows.length,
        openBugs: rows.filter((bug) => bug.status === 'open').length,
        resolvedBugs: rows.filter((bug) => bug.status === 'resolved').length,
        criticalBugs: rows.filter((bug) => bug.severity === 'critical').length,
        highPriorityBugs: rows.filter(
          (bug) => bug.priority === 'high' || bug.priority === 'urgent'
        ).length,
        teamCount: teamCount ?? 0,
      })

      setRecentBugs(rows.slice(0, 8))
      setLoading(false)
    }

    void loadDashboard()
  }, [])

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Live project stats, latest bug reports, aur overall workload yahan dikh raha hai.
          </p>
        </div>
        <Link
          to="/dashboard/team"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          View Team Bugs
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Total Bugs</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.totalBugs}</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Open</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{stats.openBugs}</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">Resolved</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.resolvedBugs}</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-rose-700">Critical</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">{stats.criticalBugs}</p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-sky-700">Teams</p>
          <p className="mt-3 text-3xl font-bold text-sky-700">{stats.teamCount}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recent Activity
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Latest Bug Reports</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {recentBugs.length} shown
            </span>
          </div>

          {recentBugs.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Abhi tak koi bug report nahi aayi.
            </div>
          ) : (
            <div className="space-y-3">
              {recentBugs.map((bug) => (
                <Link
                  key={bug.id}
                  to={`/dashboard/bugs/${bug.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">{bug.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Created {formatDate(bug.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Team ID: {bug.team_id ?? 'Not assigned'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('status', bug.status)}`}
                      >
                        {bug.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('severity', bug.severity)}`}
                      >
                        {bug.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('priority', bug.priority)}`}
                      >
                        {bug.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Health Snapshot
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Quick Overview</h3>

          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">High Priority Bugs</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{stats.highPriorityBugs}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Closure Rate</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {stats.totalBugs === 0
                  ? '0%'
                  : `${Math.round((stats.resolvedBugs / stats.totalBugs) * 100)}%`}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Open Workload</p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {stats.openBugs > 0 ? `${stats.openBugs} active issues` : 'All clear'}
              </p>
            </div>
          </div>
        </section>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading live admin data...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load admin dashboard: {error}
        </div>
      )}
    </div>
  )
}
