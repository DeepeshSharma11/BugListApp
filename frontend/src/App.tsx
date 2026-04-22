import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SubmitPage from './pages/dashboard/Submit'
import MyBugs from './pages/dashboard/MyBugs'
import TeamBugs from './pages/dashboard/TeamBugs'
import BugDetail from './pages/dashboard/BugDetail'
import Profile from './pages/dashboard/Profile'
import AdminDashboard from './pages/admin/AdminDashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/" element={<Layout />}>
        <Route path="dashboard">
          <Route index element={<Navigate to="submit" />} />
          <Route path="submit" element={<SubmitPage />} />
          <Route path="my-bugs" element={<MyBugs />} />
          <Route path="team" element={<TeamBugs />} />
          <Route path="bugs/:id" element={<BugDetail />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}
