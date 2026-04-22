import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAuthState } from '../../lib/auth'

type Bug = {
  id: string
  title: string
  severity?: string
  status?: string
  priority?: string
  created_at?: string
}

export default function TeamBugs() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const auth = await getAuthState()
        const teamId = auth.profile?.team_id
        if (!teamId) {
          setError('Aapka profile abhi kisi team me assigned nahi hai.')
          setBugs([])
          setLoading(false)
          return
        }
        const res = await fetch(`/api/bugs?team_id=${encodeURIComponent(teamId)}`)
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          setError((j && j.detail) || 'Failed to load team bugs')
          setLoading(false)
          return
        }
        const data = await res.json()
        setBugs(data || [])
      } catch (e: any) {
        console.error(e)
        setError(e.message || 'Failed to load team bugs')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">Team Bugs</h2>
      <p className="mt-4 text-sm text-gray-600">All bugs for your team.</p>

      <div className="mt-6">
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
                </div>
                <div className="text-sm text-right">
                  <div className="text-gray-700">{b.severity}</div>
                  <div className="text-gray-500">{b.status}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
