import React, { useEffect, useState } from 'react'
import { getAuthState } from '../../lib/auth'
import { useParams } from 'react-router-dom'

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
}

export default function BugDetail() {
  const { id } = useParams()
  const [bug, setBug] = useState<Bug | null>(null)
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<string | null>(null)
  const [canUpdate, setCanUpdate] = useState(false)

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

  if (loading) return <div>Loading...</div>
  if (!bug) return <div>Bug not found.</div>

  return (
    <div>
      <h2 className="text-2xl font-semibold">{bug.title} - {bug.id}</h2>
      <div className="mt-4 text-sm text-gray-600">{bug.description}</div>

      <div className="mt-6">
        <div className="font-medium">Details</div>
        <div className="mt-2 text-sm text-gray-700">Environment: {bug.environment}</div>
        <div className="text-sm text-gray-700">Version: {bug.version}</div>
        <div className="text-sm text-gray-700">Severity: {bug.severity}</div>
        <div className="text-sm text-gray-700">Status: {bug.status}</div>
        {canUpdate && (
          <div className="mt-3 flex items-center gap-2">
            <select
              value={newStatus ?? bug.status ?? 'open'}
              onChange={(e) => setNewStatus(e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
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
                try {
                  const res = await fetch(`/api/bugs/${bug.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus ?? bug.status }),
                  })
                  if (!res.ok) {
                    const j = await res.json().catch(() => ({}))
                    alert(j.detail || 'Failed to update status')
                  } else {
                    const updated = await res.json()
                    setBug(updated)
                    setNewStatus(null)
                  }
                } catch (e) {
                  console.error(e)
                  alert('Update failed')
                } finally {
                  setUpdating(false)
                }
              }}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </button>
          </div>
        )}
      </div>

      {bug.screenshot_urls && bug.screenshot_urls.length > 0 && (
        <div className="mt-6">
          <div className="font-medium">Screenshots</div>
          <div className="mt-2 grid grid-cols-3 gap-3">
            {bug.screenshot_urls.map((u, i) => (
              <img key={i} src={u} alt={`screenshot-${i}`} className="rounded-md border" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
