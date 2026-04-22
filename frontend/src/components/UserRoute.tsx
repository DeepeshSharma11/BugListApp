import React, { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { getAuthState } from '../lib/auth'

export default function UserRoute() {
  const [loading, setLoading] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const authState = await getAuthState()
      setHasSession(Boolean(authState.session))
      setLoading(false)
    }

    void checkUser()
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

  return <Outlet />
}
