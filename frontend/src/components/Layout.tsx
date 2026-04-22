import React from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-transparent text-[var(--text-color)] font-sans transition-colors">
      <NavBar />

      <main className="mx-auto flex w-full max-w-6xl flex-grow flex-col px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="card flex-grow flex flex-col w-full">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
