import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthState } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'
import { BugRowSkeleton } from '../../components/Skeleton'

type Bug = {
  id: string
  title: string
  severity?: string
  status?: string
  priority?: string
  category?: string
  created_at?: string
}

export default function TeamBugs() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const perPage = 10
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [teamName, setTeamName] = useState<string | null>(null)

  // Reset to page 1 whenever any filter changes
  useEffect(() => {
    setPage(1)
  }, [statusFilter, severityFilter, categoryFilter])

  useEffect(() => {
    let mounted = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const auth = await getAuthState()
        const teamId = auth.profile?.team_id
        if (!teamId) {
          if (mounted) setError('Aapka profile abhi kisi team me assigned nahi hai.')
          if (mounted) setBugs([])
          setLoading(false)
          return
        }

        // Fetch team name once (only on first load when teamName not yet set)
        if (mounted && !teamName) {
          const { data: teamData } = await supabase
            .from('teams')
            .select('name')
            .eq('id', teamId)
            .single()
          if (mounted && teamData?.name) setTeamName(teamData.name)
        }

        const params = new URLSearchParams()
        params.set('team_id', teamId)
        params.set('page', String(page))
        params.set('per_page', String(perPage))
        if (statusFilter) params.set('status', statusFilter)
        if (severityFilter) params.set('severity', severityFilter)
        if (categoryFilter) params.set('category', categoryFilter)

        const res = await fetch(`/api/bugs?${params.toString()}`)
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          if (mounted) setError((j && j.detail) || 'Failed to load team bugs')
          setLoading(false)
          return
        }

        const json = await res.json()
        if (mounted) {
          setBugs(json.items || [])
          setTotal(json.total || 0)
          setTotalPages(json.total_pages || 1)
        }
      } catch (e: any) {
        console.error(e)
        if (mounted) setError(e.message || 'Failed to load team bugs')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [page, statusFilter, severityFilter, categoryFilter])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Team Bugs</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
          {teamName ? (
            <>
              Your team:{' '}
              <span
                className="font-semibold px-2 py-0.5 rounded-md"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                {teamName}
              </span>
            </>
          ) : (
            'All bugs for your team.'
          )}
        </p>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Filters</h3>
            <p className="text-sm text-[var(--muted-text)] font-medium">Narrow down team bugs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters((s) => !s)} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] hover:bg-[var(--soft-surface)] px-4 py-2 text-sm font-semibold transition-colors shadow-sm">{showFilters ? 'Hide Filters' : 'Show Filters'}</button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 card">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  <option value="">Any</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Severity</label>
                <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow">
                  <option value="">Any</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Category</label>
                <input value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} placeholder="e.g. ui-bug or typo" className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <button onClick={() => { setPage(1); setShowFilters(false); }} className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-white text-sm font-bold shadow-md transition-colors">Apply</button>
              <button onClick={() => { setStatusFilter(''); setSeverityFilter(''); setCategoryFilter(''); setPage(1); }} className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] hover:bg-[var(--border-color)] px-5 py-2.5 text-sm font-bold transition-colors">Clear</button>
            </div>
          </div>
        )}

        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 mt-4">{error}</div>}
        {!loading && !error && bugs.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-8 text-center text-sm font-medium text-[var(--muted-text)] mt-4">
            No bugs found for your team.
          </div>
        )}

        <div className="mt-6 space-y-4">
          {loading && Array.from({ length: 5 }).map((_, i) => <BugRowSkeleton key={i} />)}
          {bugs.map((b) => (
            <Link key={b.id} to={`/dashboard/bugs/${b.id}`} className="card block hover:opacity-80 transition-opacity group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.title}</div>
                  <div className="text-sm text-[var(--muted-text)] mt-1 font-medium">{b.created_at ? new Date(b.created_at).toLocaleString() : ''}</div>
                  {b.category && <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-[var(--soft-surface)] text-[var(--muted-text)] border border-[var(--border-color)]">Category: {b.category}</div>}
                </div>
                <div className="flex flex-wrap sm:flex-col items-end gap-2 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${b.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{b.severity}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{b.status}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-[var(--border-color)] pt-4">
          <div className="text-sm font-medium text-[var(--muted-text)]">Page <span className="text-[var(--text-color)]">{page}</span> of <span className="text-[var(--text-color)]">{totalPages}</span> — <span className="text-[var(--text-color)]">{total}</span> results</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] hover:bg-[var(--soft-surface)] px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] hover:bg-[var(--soft-surface)] px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
