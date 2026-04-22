import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthState } from '../../lib/auth'

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
      <h2 className="text-2xl font-semibold">My Bugs</h2>
      <p className="mt-4 text-sm text-gray-600">List of bugs submitted by you will appear here.</p>

      <div className="mt-6">
        {loading && <div>Loading...</div>}
        {error && <div className="text-red-600">{error}</div>}
        {!loading && !error && bugs.length === 0 && <div className="text-gray-500">No bugs found.</div>}
        <div className="mt-4 space-y-3">
          {bugs.map((b) => (
            <Link key={b.id} to={`/dashboard/bugs/${b.id}`} className="block p-4 bg-white/60 rounded-md shadow hover:shadow-md">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-sm text-gray-500">{new Date(b.created_at).toLocaleString()}</div>
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

        {/* Pagination controls */}
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
