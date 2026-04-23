import React, { useEffect, useRef, useState } from 'react'
import { getAuthState } from '../../lib/auth'
import { supabase } from '../../lib/supabaseClient'

/* ─── Types ──────────────────────────────────────────────────────── */
type Member = {
  user_id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  resolved_count: number
  total_assigned: number
  submitted_count: number
  resolution_rate: number
  rank: number
}

/* ─── Constants ──────────────────────────────────────────────────── */
const MEDAL       = ['🥇', '🥈', '🥉']
const MEDAL_RING  = ['#f59e0b', '#94a3b8', '#cd7c3a']
const MEDAL_BG    = ['rgba(251,191,36,0.13)', 'rgba(148,163,184,0.13)', 'rgba(205,124,58,0.13)']
// Podium: silver(1) | gold(0) | bronze(2) — center is tallest
const PODIUM_ORDER  = [1, 0, 2]
const PODIUM_HEIGHT = [104, 152, 84]   // px per podium block
const AVATAR_SIZE   = [64, 80, 56]     // avatar px per slot

/* ─── Helpers ────────────────────────────────────────────────────── */
function rateColor(r: number) {
  if (r >= 75) return '#10b981'
  if (r >= 40) return '#f59e0b'
  return '#ef4444'
}

function initials(name: string | null) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/* ─── Sub-components ─────────────────────────────────────────────── */
function Avatar({ name, url, size }: { name: string | null; url: string | null; size: number }) {
  const [err, setErr] = useState(false)
  if (url && !err) {
    return (
      <img
        src={url}
        alt={name || ''}
        onError={() => setErr(true)}
        style={{
          width: size, height: size, borderRadius: '50%',
          objectFit: 'cover', flexShrink: 0, display: 'block',
        }}
      />
    )
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg,#7c6ff7 0%,#5b8def 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: Math.round(size * 0.36), fontWeight: 800,
      userSelect: 'none',
    }}>
      {initials(name)}
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div style={{ textAlign: 'center', flexShrink: 0 }}>
      <div style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 2 }}>
        {label}
      </div>
    </div>
  )
}

function RowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 8px', borderRadius: 12,
      background: 'var(--soft-surface)', marginBottom: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ width: 28, height: 16, borderRadius: 6, background: 'var(--border-color)' }} />
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--border-color)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ width: '50%', height: 12, borderRadius: 6, background: 'var(--border-color)', marginBottom: 5 }} />
        <div style={{ width: '35%', height: 10, borderRadius: 6, background: 'var(--border-color)' }} />
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ width: 36, height: 28, borderRadius: 8, background: 'var(--border-color)' }} />
        ))}
      </div>
    </div>
  )
}

/* ─── Podium Card (responsive-aware) ────────────────────────────── */
function PodiumCard({
  member, slot, isMobile,
}: { member: Member; slot: number; isMobile: boolean }) {
  const ring  = MEDAL_RING[slot]
  const bg    = MEDAL_BG[slot]
  const ph    = isMobile ? [72, 90, 60][slot] : PODIUM_HEIGHT[slot]
  const avSz  = isMobile ? [44, 52, 40][slot] : AVATAR_SIZE[slot]

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: 1,
      minWidth: 0,
    }}>
      {/* Avatar + name above podium */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, marginBottom: 6 }}>
        <div style={{
          padding: 3, borderRadius: '50%',
          boxShadow: `0 0 14px ${ring}66, 0 0 0 2px ${ring}`,
        }}>
          <Avatar name={member.full_name} url={member.avatar_url} size={avSz} />
        </div>
        <span style={{
          fontSize: isMobile ? 11 : 13, fontWeight: 700,
          color: 'var(--text-color)', textAlign: 'center',
          maxWidth: isMobile ? 70 : 100,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {member.full_name || member.email?.split('@')[0] || 'Unknown'}
        </span>
        <span style={{ fontSize: isMobile ? 18 : 22 }}>{MEDAL[slot]}</span>
      </div>

      {/* Podium block */}
      <div style={{
        width: '100%', height: ph,
        background: bg,
        border: `1.5px solid ${ring}55`,
        borderRadius: '10px 10px 0 0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 3,
      }}>
        <div style={{ fontSize: isMobile ? 20 : 26, fontWeight: 900, color: ring }}>
          {member.resolved_count}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Resolved
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: ring, marginTop: 2 }}>
          {member.resolution_rate}%
        </div>
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function Leaderboard() {
  const [members, setMembers]           = useState<Member[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [teamName, setTeamName]         = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 640)

  /* responsive hook */
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* data fetch */
  useEffect(() => {
    let mounted = true
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const auth   = await getAuthState()
        const teamId = auth.profile?.team_id
        if (!teamId) {
          if (mounted) setError('Aapka profile kisi team mein assign nahi hai.')
          setLoading(false)
          return
        }
        if (mounted) setCurrentUserId(auth.session?.user?.id ?? null)

        const { data: teamData } = await supabase
          .from('teams').select('name').eq('id', teamId).single()
        if (mounted && teamData?.name) setTeamName(teamData.name)

        const res = await fetch(`/api/leaderboard?team_id=${teamId}`)
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          if (mounted) setError((j && j.detail) || 'Failed to load leaderboard')
          setLoading(false)
          return
        }
        const data: Member[] = await res.json()
        if (mounted) setMembers(data)
      } catch (e: any) {
        if (mounted) setError(e.message || 'Failed to load leaderboard')
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => { mounted = false }
  }, [])

  /* Reorder podium slots: silver(1)|gold(0)|bronze(2) on desktop, gold|silver|bronze on mobile */
  const podiumSlots = members.slice(0, 3)
  const podiumOrdered = isMobile
    ? podiumSlots.map((m, i) => ({ member: m, slot: i }))
    : PODIUM_ORDER
        .map(slot => ({ member: podiumSlots[slot], slot }))
        .filter(x => x.member)

  const restMembers = members.slice(3)

  /* ── Render ── */
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
          <span style={{ fontSize: 26 }}>🏆</span>
          <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.4px', margin: 0 }}>
            Leaderboard
          </h2>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-text)', fontWeight: 500 }}>
          {teamName ? (
            <>
              Team:{' '}
              <span style={{
                fontWeight: 700, padding: '2px 9px', borderRadius: 8,
                background: 'var(--accent-soft)', color: 'var(--accent)',
              }}>
                {teamName}
              </span>
              {' '}— Ranked by resolved bugs
            </>
          ) : 'Team members ranked by resolved bugs'}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          borderRadius: 12, border: '1px solid rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.08)', padding: '14px 18px',
          fontSize: 14, fontWeight: 500, color: '#ef4444', marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      {/* ── Podium ── */}
      {!loading && !error && podiumSlots.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: isMobile ? '16px 12px 0' : '20px 24px 0', overflow: 'hidden' }}>
          {/* top accent bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 4,
            background: 'linear-gradient(90deg,#f59e0b,#7c6ff7,#5b8def)',
            borderRadius: '16px 16px 0 0',
          }} />

          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: isMobile ? 8 : 12,
            paddingBottom: 0,
          }}>
            {podiumOrdered.map(({ member, slot }) => (
              <PodiumCard key={member.user_id} member={member} slot={slot} isMobile={isMobile} />
            ))}
          </div>
        </div>
      )}

      {/* ── Full list ── */}
      <div className="card" style={{ padding: isMobile ? '16px 12px' : '20px 24px' }}>
        {/* Column headers */}
        {!loading && members.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '0 8px 10px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 8,
          }}>
            <div style={{ width: 28, flexShrink: 0 }} />
            <div style={{ width: 38, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Member
            </div>
            <div style={{ display: 'flex', gap: isMobile ? 12 : 20 }}>
              <div style={{ width: isMobile ? 42 : 50, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Fixed</div>
              {!isMobile && <div style={{ width: 50, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Assigned</div>}
              {!isMobile && <div style={{ width: 56, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Submitted</div>}
              <div style={{ width: isMobile ? 42 : 50, textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--muted-text)', textTransform: 'uppercase', letterSpacing: 0.4 }}>Rate</div>
            </div>
          </div>
        )}

        {/* Loading skeletons */}
        {loading && [0, 1, 2, 3, 4].map(i => <RowSkeleton key={i} />)}

        {/* Empty */}
        {!loading && !error && members.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted-text)', fontSize: 14, fontWeight: 500 }}>
            No team members found.
          </div>
        )}

        {/* Member rows */}
        {!loading && members.map((m, idx) => {
          const isMe   = m.user_id === currentUserId
          const isTop3 = idx < 3
          const rowBg  = isMe ? 'var(--accent-soft)' : isTop3 ? MEDAL_BG[idx] : 'transparent'
          const rowBorder = isMe ? '1px solid var(--accent)' : '1px solid transparent'

          return (
            <div
              key={m.user_id}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: isMobile ? '10px 8px' : '11px 8px',
                borderRadius: 12,
                marginBottom: 4,
                background: rowBg,
                border: rowBorder,
                transition: 'background 0.15s',
                minWidth: 0,           // prevent row from expanding container
                overflow: 'hidden',    // clip children
              }}
            >
              {/* Rank */}
              <div style={{
                width: 28, flexShrink: 0, textAlign: 'center',
                fontSize: isTop3 ? 18 : 13, fontWeight: 800,
                color: isTop3 ? MEDAL_RING[idx] : 'var(--muted-text)',
              }}>
                {isTop3 ? MEDAL[idx] : `#${m.rank}`}
              </div>

              {/* Avatar */}
              <Avatar name={m.full_name} url={m.avatar_url} size={isMobile ? 34 : 38} />

              {/* Name + email */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 700, fontSize: isMobile ? 13 : 14,
                  color: 'var(--text-color)',
                  display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap',
                  overflow: 'hidden',
                }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 90 : 200 }}>
                    {m.full_name || 'Unknown'}
                  </span>
                  {isMe && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '1px 6px',
                      borderRadius: 20, background: 'var(--accent)', color: '#fff',
                      letterSpacing: 0.4, flexShrink: 0,
                    }}>YOU</span>
                  )}
                </div>
                {!isMobile && (
                  <div style={{
                    fontSize: 12, color: 'var(--muted-text)', marginTop: 1,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {m.email || ''}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex', alignItems: 'center',
                gap: isMobile ? 12 : 20, flexShrink: 0,
              }}>
                {/* Resolved — always visible */}
                <div style={{ width: isMobile ? 42 : 50, textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? 15 : 17, fontWeight: 800, color: '#10b981', lineHeight: 1.1 }}>
                    {m.resolved_count}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600 }}>Fixed</div>
                </div>

                {/* Assigned — desktop only */}
                {!isMobile && (
                  <div style={{ width: 50, textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)', lineHeight: 1.1 }}>
                      {m.total_assigned}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600 }}>Assigned</div>
                  </div>
                )}

                {/* Submitted — desktop only */}
                {!isMobile && (
                  <div style={{ width: 56, textAlign: 'center' }}>
                    <div style={{ fontSize: 17, fontWeight: 800, color: '#f59e0b', lineHeight: 1.1 }}>
                      {m.submitted_count}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600 }}>Submitted</div>
                  </div>
                )}

                {/* Rate — always visible */}
                <div style={{ width: isMobile ? 42 : 50, textAlign: 'center' }}>
                  <div style={{
                    fontSize: isMobile ? 14 : 16, fontWeight: 800,
                    color: rateColor(m.resolution_rate), lineHeight: 1.1,
                  }}>
                    {m.resolution_rate}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted-text)', fontWeight: 600 }}>Rate</div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Large-team note */}
        {!loading && members.length >= 20 && (
          <div style={{
            textAlign: 'center', marginTop: 12, fontSize: 12,
            color: 'var(--muted-text)', fontWeight: 500,
          }}>
            Showing all {members.length} team members
          </div>
        )}
      </div>

      {/* Legend */}
      {!loading && members.length > 0 && (
        <div style={{
          marginTop: 14, display: 'flex', gap: 16, flexWrap: 'wrap',
          fontSize: 12, color: 'var(--muted-text)', fontWeight: 500,
          alignItems: 'center', padding: '0 4px',
        }}>
          <span>Resolution rate:</span>
          <span style={{ color: '#10b981' }}>● ≥75% Good</span>
          <span style={{ color: '#f59e0b' }}>● 40–74% Fair</span>
          <span style={{ color: '#ef4444' }}>● &lt;40% Low</span>
        </div>
      )}
    </div>
  )
}
