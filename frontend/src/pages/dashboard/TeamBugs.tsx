import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthState } from '../../lib/auth'

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
      <h2 className="text-2xl font-semibold">Team Bugs</h2>
      <p className="mt-4 text-sm text-gray-600">All bugs for your team.</p>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Filters</h3>
            <p className="text-sm text-gray-500">Narrow down team bugs</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters((s) => !s)} className="rounded-md border px-3 py-1 text-sm">{showFilters ? 'Hide Filters' : 'Show Filters'}</button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-4 rounded-md border bg-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full rounded-md border p-2">
                  <option value="">Any</option>
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Severity</label>
                <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="mt-1 w-full rounded-md border p-2">
                  <option value="">Any</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} placeholder="e.g. ui-bug or typo" className="mt-1 w-full rounded-md border p-2" />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <button onClick={() => { setPage(1); setShowFilters(false); }} className="rounded-md bg-primary px-3 py-1 text-white text-sm">Apply</button>
              <button onClick={() => { setStatusFilter(''); setSeverityFilter(''); setCategoryFilter(''); setPage(1); }} className="rounded-md border px-3 py-1 text-sm">Clear</button>
            </div>
          </div>
        )}

        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && bugs.length === 0 && <div className="text-gray-500">No bugs found for your team.</div>}

        <div className="mt-4 space-y-3">
          {bugs.map((b) => (
            <Link key={b.id} to={`/dashboard/bugs/${b.id}`} className="block p-4 bg-white/60 rounded-md shadow hover:shadow-md">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-sm text-gray-500">{b.created_at ? new Date(b.created_at).toLocaleString() : ''}</div>
                  {b.category && <div className="mt-1 text-xs text-slate-600">Category: {b.category}</div>}
                </div>
                <div className="text-sm text-right">
                  <div className="text-gray-700">{b.severity}</div>
                  <div className="text-gray-500">{b.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {page} of {totalPages} — {total} results</div>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1 text-sm">Prev</button>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-md border px-3 py-1 text-sm">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}
