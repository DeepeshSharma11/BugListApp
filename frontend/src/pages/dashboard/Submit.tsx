import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'
import { useDebounce } from '../../utils/debounce'
import { getDeviceTier, skipAnimations } from '../../utils/deviceTier'
import { Sk } from '../../components/Skeleton'

// ── Tier-aware animation class ───────────────────────────────────────────────
const tier = getDeviceTier()
const animate = !skipAnimations()
const fadeIn = animate ? 'fade-in' : ''
const trans = tier === 'high' ? 'transition-all duration-200' : tier === 'mid' ? 'transition-colors duration-150' : ''

// ── Small helpers ─────────────────────────────────────────────────────────────
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${color}`}>
      {label}
    </span>
  )
}

const SEV_COLOR: Record<string, string> = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

function cryptoId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

// ── Input & Textarea wrappers ─────────────────────────────────────────────────
const inputCls = `w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted-text)] ${trans}`
const labelCls = 'mb-1.5 block text-xs font-bold uppercase tracking-widest text-[var(--muted-text)]'

// ─────────────────────────────────────────────────────────────────────────────
export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [severity, setSeverity] = useState('medium')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [myBugs, setMyBugs] = useState<any[]>([])
  const [myPage, setMyPage] = useState(1)
  const [query, setQuery] = useState('')
  const [duplicate, setDuplicate] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string | null>(null)
  const [submittedBy, setSubmittedBy] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [bugsLoading, setBugsLoading] = useState(false)

  // AI assist state
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAiPanel, setShowAiPanel] = useState(false)
  const myPerPage = 5

  const onDrop = useCallback((accepted: File[], rejected: any[]) => {
    if (rejected.length > 0) setFormError('Some files rejected. Max 5 images, 5MB each.')
    else setFormError(null)
    const next = [...files, ...accepted].slice(0, 5)
    setFiles(next)
    // generate previews only on mid/high tier
    if (tier !== 'low') {
      const urls = next.map(f => URL.createObjectURL(f))
      setPreviews(urls)
    }
  }, [files])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 5 * 1024 * 1024,
  })

  const debouncedTitle = useDebounce(title, 600)
  const location = useLocation()

  useEffect(() => {
    getAuthState().then(async auth => {
      const uid = auth.session?.user.id ?? null
      const tid = auth.profile?.team_id ?? null
      setSubmittedBy(uid)
      setTeamId(tid)
      setProfileReady(true)

      // Fetch team name if team exists
      if (tid && auth.session?.access_token) {
        try {
          const res = await fetch(`/api/teams/${tid}`, {
            headers: { Authorization: `Bearer ${auth.session.access_token}` },
          })
          if (res.ok) {
            const data = await res.json()
            setTeamName(data.name ?? null)
          }
        } catch { /* fallback to showing ID */ }
      }
    })
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const cat = params.get('category') || ''
    const custom = params.get('customCategory') || params.get('custom') || ''
    if (custom) setCustomCategory(custom)
    else if (cat) setCategory(cat)
  }, [location.search])

  useEffect(() => {
    if (!profileReady || !submittedBy) return
    let alive = true
    setBugsLoading(true)
    fetch(`/api/bugs?submitted_by=${encodeURIComponent(submittedBy)}&page=${myPage}&per_page=${myPerPage}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => {
        if (!alive) return
        const items = d.items || []
        const pages = d.total_pages ?? 1
        setMyBugs(items)
        setTotalPages(pages)
        // If page overshoots (race or manual nav), snap back to last valid page
        if (items.length === 0 && myPage > 1) setMyPage(p => Math.max(1, p - 1))
      })
      .catch(() => { if (alive) { setMyBugs([]); setTotalPages(1) } })
      .finally(() => { if (alive) setBugsLoading(false) })
    return () => { alive = false }
  }, [profileReady, submittedBy, myPage, refreshTrigger])

  useEffect(() => {
    if (!debouncedTitle || description.trim().length < 5) { setDuplicate(null); return }
    fetch(`/api/bugs/check?title=${encodeURIComponent(debouncedTitle)}&description=${encodeURIComponent(description)}&environment=${encodeURIComponent(environment)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDuplicate(d?.exists ? d : null))
      .catch(() => {})
  }, [debouncedTitle, description, environment])

  // ── AI Enhance ──────────────────────────────────────────────────────────────
  const handleAiEnhance = async () => {
    if (!aiInput.trim() || aiInput.trim().length < 10) {
      setAiError('Please describe the bug in at least 10 characters.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/bugs/ai-enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: aiInput }),
      })
      if (!res.ok) throw new Error((await res.json()).detail || 'AI enhance failed')
      const data = await res.json()
      if (data.title) setTitle(data.title)
      if (data.description) setDescription(data.description)
      if (data.suggested_severity) setSeverity(data.suggested_severity)
      setShowAiPanel(false)
      setAiInput('')
    } catch (e: any) {
      setAiError(e.message || 'AI enhance failed')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    if (duplicate) { setFormError('Duplicate bug already exists. Open the existing bug instead.'); return }
    setSubmitting(true)
    try {
      const body = new URLSearchParams()
      body.append('title', title)
      body.append('description', description)
      body.append('environment', environment)
      body.append('severity', severity)
      body.append('submitted_by', submittedBy || '')
      body.append('team_id', teamId || '')
      const tagsParts: string[] = []
      if (category && category !== '__custom__') tagsParts.push(category.trim())
      if (customCategory.trim()) tagsParts.push(customCategory.trim())
      if (tagsParts.length) body.append('tags', tagsParts.join(','))

      const res = await fetch('/api/bugs/', { method: 'POST', body })
      if (res.status === 409) {
        const dup = await res.json()
        setFormError(`Duplicate found: ${dup.title}`)
        return
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setFormError(typeof err.detail === 'string' ? err.detail : 'Failed to create bug.')
        return
      }
      const data = await res.json()
      const bugId = data.id
      const teamSlug = data.team_slug
      const uploadedUrls: string[] = []

      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg'
        const key = `${teamSlug}/${bugId}/${cryptoId()}.${ext}`
        const up = await supabase.storage.from('bug-screenshots').upload(key, file, { cacheControl: '3600', upsert: false, contentType: file.type })
        if (up.error) { setFormError(`Upload failed: ${up.error.message}`); continue }
        const pub = supabase.storage.from('bug-screenshots').getPublicUrl(key)
        uploadedUrls.push((pub as any).data?.publicUrl || '')
      }
      if (uploadedUrls.length > 0) {
        await fetch(`/api/bugs/${bugId}/screenshots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadedUrls),
        })
      }
      setTitle(''); setDescription(''); setEnvironment(''); setCategory(''); setCustomCategory(''); setSeverity('medium'); setFiles([]); setPreviews([]); setDuplicate(null)
      setRefreshTrigger(p => p + 1)
      setSuccessMsg(`✓ Bug submitted! ID: ${bugId}`)
      setTimeout(() => setSuccessMsg(null), 6000)
    } catch (err: any) {
      setFormError(err.message || 'Submit failed.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className={`w-full max-w-7xl mx-auto ${fadeIn}`}>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between gap-4 border-b border-[var(--border-color)] pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[var(--accent)] to-blue-500 bg-clip-text text-transparent">Submit a Bug</h2>
          <p className="mt-1 text-sm text-[var(--muted-text)]">Found an issue? Let the team know — or let AI help you write it up.</p>
        </div>
        {/* AI Assist toggle */}
        <button
          type="button"
          onClick={() => setShowAiPanel(p => !p)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border ${trans} ${showAiPanel ? 'bg-[var(--accent)] text-white border-[var(--accent)]' : 'border-[var(--border-color)] bg-[var(--soft-surface)] text-[var(--accent)] hover:border-[var(--accent)]'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          AI Assist
        </button>
      </div>

      {/* AI Panel */}
      {showAiPanel && (
        <div className={`mb-6 rounded-2xl border border-[var(--accent)] bg-gradient-to-br from-[var(--accent-soft)] to-transparent p-5 ${fadeIn}`}>
          <p className="mb-3 text-sm font-bold text-[var(--accent)]">⚡ Describe the bug in plain language — AI will fill the form for you</p>
          <textarea
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
            rows={3}
            placeholder="e.g. When I click the save button on the profile page it shows a white screen and does nothing. Expected it to save and show success toast."
            className={`${inputCls} resize-none mb-3`}
          />
          {aiError && <p className="mb-2 text-xs text-red-500 font-medium">{aiError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAiEnhance}
              disabled={aiLoading}
              className={`flex-1 rounded-xl bg-[var(--accent)] text-white py-2.5 text-sm font-bold disabled:opacity-50 ${trans} hover:opacity-90`}
            >
              {aiLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Enhancing…
                </span>
              ) : 'Generate Bug Report'}
            </button>
            <button type="button" onClick={() => { setShowAiPanel(false); setAiInput(''); setAiError(null) }} className={`px-4 rounded-xl border border-[var(--border-color)] text-sm font-semibold ${trans} hover:bg-[var(--soft-surface)]`}>Cancel</button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {!profileReady && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Sk className="h-10 col-span-2" /><Sk className="h-10" /><Sk className="h-10" />
        </div>
      )}
      {successMsg && (
        <div className={`mb-6 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 p-4 text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 ${fadeIn}`}>
          {successMsg}
        </div>
      )}
      {formError && (
        <div className={`mb-6 rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 text-sm font-semibold text-red-700 dark:text-red-400 ${fadeIn}`}>
          {formError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit}>
        <div className="card mb-6 p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-0">
            {/* Left column */}
            <div>
              <div className="mb-5">
                <label className={labelCls}>Title <span className="text-red-400">*</span></label>
                <input value={title} onChange={e => setTitle(e.target.value)} className={inputCls} placeholder="Short, descriptive title" required />
                {duplicate && (
                  <div className={`mt-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 text-xs font-semibold text-amber-700 dark:text-amber-400 ${fadeIn}`}>
                    ⚠ Possible duplicate:{' '}
                    <a className="underline hover:text-amber-900 dark:hover:text-amber-200" href={`/dashboard/bugs/${duplicate.id}`}>{duplicate.title}</a>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <label className={labelCls}>Description <span className="text-red-400">*</span> <span className="normal-case tracking-normal text-[var(--muted-text)] font-normal">min 20 chars</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={9} className={`${inputCls} resize-y`} placeholder="What happened? Include any error messages." required />
              </div>

              <div className="mb-5">
                <label className={labelCls}>Severity</label>
                <div className="grid grid-cols-4 gap-2">
                  {['low', 'medium', 'high', 'critical'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSeverity(s)}
                      className={`rounded-lg py-2 text-xs font-bold border capitalize ${trans} ${severity === s ? `${SEV_COLOR[s]} border-current shadow-sm` : 'border-[var(--border-color)] bg-[var(--soft-surface)] text-[var(--muted-text)] hover:border-[var(--accent)]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div>
              <div className="mb-5">
                <label className={labelCls}>Environment</label>
                <input value={environment} onChange={e => setEnvironment(e.target.value)} className={inputCls} placeholder="production, Android 14, Chrome 124…" />
              </div>

              <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
                    <option value="">Select (optional)</option>
                    <option value="dashboard-bug">Dashboard</option>
                    <option value="navbar-bug">NavBar</option>
                    <option value="footer-bug">Footer</option>
                    <option value="ui-bug">UI</option>
                    <option value="performance">Performance</option>
                    <option value="__custom__">Custom…</option>
                  </select>
                </div>
                {(category === '__custom__' || customCategory) && (
                  <div>
                    <label className={labelCls}>Custom tag</label>
                    <input value={customCategory} onChange={e => setCustomCategory(e.target.value)} className={inputCls} placeholder="e.g. auth-flow" />
                  </div>
                )}
              </div>

              {/* Dropzone */}
              <div className="mb-5">
                <label className={labelCls}>Screenshots <span className="normal-case tracking-normal font-normal text-[var(--muted-text)]">max 5 · 5 MB each</span></label>
                <div
                  {...getRootProps()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center ${trans} ${isDragActive ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border-color)] bg-[var(--soft-surface)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'}`}
                >
                  <input {...getInputProps()} />
                  <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${isDragActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--card-color)] text-[var(--accent)]'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  </div>
                  <p className="text-sm font-semibold">{isDragActive ? 'Drop files here' : 'Drag & drop or click to browse'}</p>
                  <p className="mt-1 text-xs text-[var(--muted-text)]">PNG, JPG, WebP, GIF</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {files.map((f, i) => (
                      <div key={`${f.name}-${i}`} className="relative group rounded-xl overflow-hidden border border-[var(--border-color)] bg-[var(--soft-surface)] aspect-square flex items-center justify-center">
                        {tier !== 'low' && previews[i]
                          ? <img src={previews[i]} alt={f.name} className="w-full h-full object-cover" />
                          : <span className="text-[10px] text-center px-1 text-[var(--muted-text)] break-all">{f.name}</span>
                        }
                        <button
                          type="button"
                          onClick={() => {
                            setFiles(fs => fs.filter((_, idx) => idx !== i))
                            setPreviews(ps => ps.filter((_, idx) => idx !== i))
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {teamId && (
                <p className="text-xs text-[var(--muted-text)] bg-[var(--soft-surface)] rounded-lg px-3 py-2 border border-[var(--border-color)] flex items-center gap-1.5">
                  <span>📌</span>
                  Bug will be submitted to team{' '}
                  <strong className="text-[var(--accent)]">{teamName ?? `${teamId.slice(0, 8)}…`}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !profileReady}
              className={`relative overflow-hidden rounded-xl bg-[var(--accent)] px-8 py-3.5 text-white font-bold text-sm disabled:opacity-60 disabled:cursor-not-allowed ${trans} hover:opacity-90 active:scale-95`}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                  Submitting…
                </span>
              ) : '🐛 Submit Bug'}
            </button>
          </div>
        </div>
      </form>

      {/* Recent Submissions */}
      <section className="mt-4">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold tracking-tight">Recent Submissions</h3>
            <p className="text-sm text-[var(--muted-text)]">Your latest bug reports</p>
          </div>
          <input
            placeholder="Search my bugs…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full sm:w-56 rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--accent)] placeholder:text-[var(--muted-text)]"
          />
        </div>

        <div className="space-y-3">
          {myBugs
            .filter(b => {
              if (!query.trim()) return true
              const q = query.toLowerCase()
              return (b.title || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)
            })
            .map(b => (
              <a
                key={b.id}
                href={`/dashboard/bugs/${b.id}`}
                className={`card flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-underline group block ${trans} hover:border-[var(--accent)]`}
              >
                <div>
                  <div className="font-bold group-hover:text-[var(--accent)] transition-colors">{b.title}</div>
                  <div className="text-xs text-[var(--muted-text)] mt-0.5">{b.created_at ? new Date(b.created_at).toLocaleString() : ''}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge label={b.severity} color={SEV_COLOR[b.severity] || SEV_COLOR.medium} />
                  <Badge label={b.status} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
                </div>
              </a>
            ))}
          {!bugsLoading && myBugs.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border-color)] py-10 text-center">
              <p className="text-sm font-medium text-[var(--muted-text)]">{myPage === 1 ? 'No bugs submitted yet.' : 'No more bugs on this page.'}</p>
            </div>
          )}
          {bugsLoading && (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--soft-surface)] animate-pulse" />)}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <span className="text-sm text-[var(--muted-text)]">Page <strong className="text-[var(--text-color)]">{myPage}</strong> of <strong className="text-[var(--text-color)]">{totalPages}</strong></span>
          <div className="flex gap-2">
            <button
              disabled={myPage <= 1 || bugsLoading}
              onClick={() => setMyPage(p => Math.max(1, p - 1))}
              className={`rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${trans} hover:bg-[var(--soft-surface)]`}
            >← Prev</button>
            <button
              disabled={myPage >= totalPages || bugsLoading}
              onClick={() => setMyPage(p => p + 1)}
              className={`rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2 text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${trans} hover:bg-[var(--soft-surface)]`}
            >Next →</button>
          </div>
        </div>
      </section>
    </div>
  )
}
