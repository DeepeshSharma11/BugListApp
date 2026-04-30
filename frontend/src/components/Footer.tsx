import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const LINKS = [
  { label: 'Privacy', to: '/dashboard/privacy' },
  { label: 'Terms',   to: '/dashboard/terms' },
  { label: 'Support', to: '/dashboard/support' },
]

export default function Footer() {
  const [visible, setVisible] = useState(true) // Visible by default
  const lastY = useRef(0)
  const ticking = useRef(false)

  useEffect(() => {
    // To ensure initial state is correct, but default is true anyway
    lastY.current = window.scrollY

    const onScroll = () => {
      if (ticking.current) return
      ticking.current = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const atBottom =
          window.innerHeight + y >= document.documentElement.scrollHeight - 40

        // Show when scrolling up OR near bottom; hide when scrolling down
        if (atBottom || y < lastY.current) {
          setVisible(true)
        } else if (y > 50 && y > lastY.current) {
          setVisible(false)
        }
        lastY.current = y
        ticking.current = false
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <footer
      aria-label="Site footer"
      className="fixed bottom-0 w-full z-40"
      style={{
        borderTop: '1px solid var(--border-color)',
        background: 'var(--surface-color)',
        backdropFilter: 'blur(8px)',
        transform: visible ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        willChange: 'transform',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center justify-between gap-4">
          {/* Brand — slightly larger */}
          <div className="flex items-center gap-2 min-w-0">
            <img src="/ladybug.png" alt="Bug Tracker" className="w-5 h-5 object-contain flex-shrink-0" />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--muted-text)' }}>
              © {new Date().getFullYear()} Bug Tracker
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-5 text-sm font-medium flex-shrink-0" style={{ color: 'var(--muted-text)' }}>
            {LINKS.map(({ label, to }) => (
              <Link
                key={label}
                to={to}
                className="hover:text-[var(--accent)] transition-colors duration-150"
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
