import React from 'react'
import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'
import Footer from './Footer'

export default function Layout() {
  return (
    <div
      className="min-h-screen flex flex-col font-sans"
    >
      <NavBar />

      <main className="mx-auto flex w-full max-w-6xl flex-grow flex-col px-3 pt-4 pb-20 sm:px-6 sm:pt-6 sm:pb-24 lg:px-8">
        <div className="card flex-grow flex flex-col w-full fade-in">
          <Outlet />
        </div>
      </main>

      <Footer />
    </div>
  )
}
