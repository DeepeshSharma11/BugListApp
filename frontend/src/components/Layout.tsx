import React from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <NavBar />

      <main className="flex-grow w-full py-6 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto flex flex-col">
        <div className="card flex-grow flex flex-col w-full">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
