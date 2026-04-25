import React, { useEffect, useState } from 'react'
import { getAuthState } from '../../lib/auth'
import { useParams } from 'react-router-dom'
import { BugDetailSkeleton } from '../../components/Skeleton'

type Bug = {
  id: string
  title: string
  description?: string
  environment?: string
  version?: string
  screenshot_urls?: string[]
  severity?: string
  status?: string
  priority?: string
  created_at?: string
  submitted_by?: string
  assigned_to?: string
}

export default function BugDetail() {
  const { id } = useParams()
  const [bug, setBug] = useState<Bug | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<string | null>(null)
  const [canUpdate, setCanUpdate] = useState(false)
  const [updateError, setUpdateError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/bugs/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found')
        return r.json()
      })
      .then((data) => setBug(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    void (async () => {
      const auth = await getAuthState()
      // allow update if admin or bug was submitted by current user or assigned to current user
      const myId = auth.session?.user?.id
      const isAdmin = auth.isAdmin
      setCanUpdate(isAdmin || (bug?.submitted_by === myId) || (bug?.assigned_to === myId))
    })()
  }, [bug])

  if (loading) return <BugDetailSkeleton />
  if (!bug) return (
    <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-12 text-center text-sm font-medium text-[var(--muted-text)]">
      Bug not found.
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 border-b border-[var(--border-color)] pb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            {bug.status?.replace('_', ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bug.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>
            {bug.severity}
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{bug.title}</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">Bug ID: {bug.id}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="card">
            <h3 className="text-lg font-bold mb-4">Description</h3>
            <div className="text-[var(--text-color)] whitespace-pre-wrap leading-relaxed" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{bug.description}</div>
          </section>

          {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
            <section className="card">
              <h3 className="text-lg font-bold mb-4">Screenshots</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {bug.screenshot_urls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="block group overflow-hidden rounded-xl border border-[var(--border-color)] shadow-sm">
                    <img src={u} alt={`screenshot-${i}`} className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-300" />
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card bg-[var(--soft-surface)]">
            <h3 className="text-lg font-bold mb-4">Details</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)] mb-1">Environment</div>
                <div className="font-medium">{bug.environment || 'Not specified'}</div>
              </div>
              
              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)] mb-1">Version</div>
                <div className="font-medium">{bug.version || 'Not specified'}</div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)] mb-1">Priority</div>
                <div className="font-medium capitalize">{bug.priority || 'Normal'}</div>
              </div>
            </div>

            {canUpdate && (
              <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted-text)] mb-2">Update Status</div>
                <div className="flex flex-col gap-3">
                  <select
                    value={newStatus ?? bug.status ?? 'open'}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <button
                    disabled={updating || (newStatus ?? bug.status) === bug.status}
                    onClick={async () => {
                      if (!bug) return
                      setUpdating(true)
                      setUpdateError(null)
                      try {
                        const { data: { session } } = await (await import('../../lib/supabaseClient')).supabase.auth.getSession()
                        const token = session?.access_token ?? ''
                        const res = await fetch(`/api/bugs/${bug.id}`, {
                          method: 'PATCH',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({ status: newStatus ?? bug.status }),
                        })
                        if (!res.ok) {
                          const j = await res.json().catch(() => ({}))
                          setUpdateError(j.detail || 'Failed to update status')
                        } else {
                          const updated = await res.json()
                          setBug(updated)
                          setNewStatus(null)
                        }
                      } catch (e) {
                        console.error(e)
                        setUpdateError('Update failed. Please try again.')
                      } finally {
                        setUpdating(false)
                      }
                    }}
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updating ? 'Updating...' : 'Save Changes'}
                  </button>
                  {updateError && (
                    <p className="text-xs text-red-500 font-medium mt-1">{updateError}</p>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
