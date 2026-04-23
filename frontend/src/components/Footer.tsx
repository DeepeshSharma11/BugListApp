import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer
      className="mt-auto py-6"
      style={{ borderTop: '1px solid var(--border-color)', background: 'var(--surface-color)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img 
              src="/ladybug.png" 
              alt="Bug Tracker" 
              className="w-6 h-6 object-contain"
            />
            <span className="text-sm font-medium" style={{ color: 'var(--muted-text)' }}>
              © {new Date().getFullYear()} Bug Tracker
            </span>
          </div>

          {/* Links */}
          <nav className="flex flex-wrap justify-center gap-5 text-sm" style={{ color: 'var(--muted-text)' }}>
            {[
              { label: 'Privacy', to: '/dashboard/privacy' },
              { label: 'Terms',   to: '/dashboard/terms' },
              { label: 'Support', to: '/dashboard/support' },
            ].map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="transition-colors hover:text-[var(--accent)]"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  )
}
