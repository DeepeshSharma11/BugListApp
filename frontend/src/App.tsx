import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import UserRoute from './components/UserRoute'
import AdminRoute from './components/AdminRoute'
import SubmitPage from './pages/dashboard/Submit'
import MyBugs from './pages/dashboard/MyBugs'
import TeamBugs from './pages/dashboard/TeamBugs'
import BugDetail from './pages/dashboard/BugDetail'
import Profile from './pages/dashboard/Profile'
import Notifications from './pages/dashboard/Notifications'
import AdminDashboard from './pages/admin/AdminDashboard'

// Auth Pages
import Login from './pages/auth/Login'
import Signup from './pages/auth/Signup'
import ResetPassword from './pages/auth/ResetPassword'

export default function App() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Main App Routes */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      
      <Route element={<UserRoute />}>
        <Route path="/" element={<Layout />}>
          <Route path="dashboard">
            <Route index element={<Navigate to="submit" />} />
            <Route path="submit" element={<SubmitPage />} />
            <Route path="my-bugs" element={<MyBugs />} />
            <Route path="team" element={<TeamBugs />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="bugs/:id" element={<BugDetail />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminDashboard />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
