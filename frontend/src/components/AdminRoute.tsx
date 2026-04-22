import React, { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getAuthState } from '../lib/auth'

export default function AdminRoute() {
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      const authState = await getAuthState()
      setHasSession(Boolean(authState.session))
      setIsAdmin(authState.isAdmin)
      setLoading(false)
    }

    void checkAdmin()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!hasSession) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
