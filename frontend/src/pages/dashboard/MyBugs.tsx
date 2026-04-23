import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthState } from '../../lib/auth'
import { BugRowSkeleton } from '../../components/Skeleton'

type Bug = {
  id: string
  title: string
  severity: string
  status: string
  priority: string
  category?: string
  created_at: string
}

export default function MyBugs() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const perPage = 10
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const auth = await getAuthState()
        const submitted_by = auth.session?.user.id
        if (!submitted_by) {
          if (mounted) setError('Please log in to view your bugs.')
          setLoading(false)
          return
        }

        const res = await fetch(`/api/bugs?submitted_by=${encodeURIComponent(submitted_by)}&page=${page}&per_page=${perPage}`)
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          if (mounted) setError((j && j.detail) || 'Failed to load bugs')
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
        if (mounted) setError(e.message || 'Failed to load bugs')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => {
      mounted = false
    }
  }, [page])

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">My Bugs</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
          List of bugs submitted by you will appear here.
        </p>
      </div>

      <div className="mt-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</div>}
        {!loading && !error && bugs.length === 0 && (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-8 text-center text-sm font-medium text-[var(--muted-text)]">
            No bugs submitted yet.
          </div>
        )}
        <div className="mt-6 space-y-4">
          {loading && Array.from({ length: 5 }).map((_, i) => <BugRowSkeleton key={i} />)}
          {bugs.map((b) => (
            <Link key={b.id} to={`/dashboard/bugs/${b.id}`} className="card block hover:opacity-80 transition-opacity group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.title}</div>
                  <div className="text-sm text-[var(--muted-text)] mt-1 font-medium">{new Date(b.created_at).toLocaleString()}</div>
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

        {/* Pagination controls */}
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
