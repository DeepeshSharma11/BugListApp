import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

type Bug = {
  id: string
  title: string
  severity: string
  status: string
  priority: string
  created_at: string
}

export default function MyBugs() {
  const [bugs, setBugs] = useState<Bug[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    // For demo: fetch all bugs. Replace with ?submitted_by=... when auth is wired.
    fetch('/api/bugs')
      .then((r) => r.json())
      .then((data) => setBugs(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-semibold">My Bugs</h2>
      <p className="mt-4 text-sm text-gray-600">List of bugs submitted by you will appear here.</p>

      <div className="mt-6">
        {loading && <div>Loading...</div>}
        {!loading && bugs.length === 0 && <div className="text-gray-500">No bugs found.</div>}
        <div className="mt-4 space-y-3">
          {bugs.map((b) => (
            <Link key={b.id} to={`/dashboard/bugs/${b.id}`} className="block p-4 bg-white/60 rounded-md shadow hover:shadow-md">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{b.title}</div>
                  <div className="text-sm text-gray-500">{new Date(b.created_at).toLocaleString()}</div>
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
