import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'
import { useDebounce } from '../../utils/debounce'
import { SubmitBugsSkeleton, Sk } from '../../components/Skeleton'

function Field({
  children,
  label,
  helperText,
}: {
  children: React.ReactNode
  label: string
  helperText?: string
}) {
  return (
    <div className="mb-6">
      <label className="mb-2 block text-sm font-bold tracking-wide">{label}</label>
      {children}
      {helperText && <p className="mt-1.5 text-xs text-[var(--muted-text)] font-medium">{helperText}</p>}
    </div>
  )
}

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [myBugs, setMyBugs] = useState<any[]>([])
  const [myPage, setMyPage] = useState(1)
  const myPerPage = 5
  const [query, setQuery] = useState('')
  const [duplicate, setDuplicate] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [submittedBy, setSubmittedBy] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    if (fileRejections.length > 0) {
      setFormError("Some files were rejected. Each file must be an image and under 5MB.")
    } else {
      setFormError(null)
    }
    setFiles((current) => [...current, ...acceptedFiles].slice(0, 5))
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxSize: 5 * 1024 * 1024,
  })

  const debouncedTitle = useDebounce(title, 600)

  useEffect(() => {
    const loadProfile = async () => {
      const authState = await getAuthState()

      setSubmittedBy(authState.session?.user.id ?? null)
      setTeamId(authState.profile?.team_id ?? null)
      setProfileReady(true)
    }

    void loadProfile()
  }, [])

  // Prefill from query params (e.g., /dashboard/submit?category=navbar-bug&customCategory=typo)
  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const cat = params.get('category') || ''
    const custom = params.get('customCategory') || params.get('custom') || ''
    if (custom) {
      setCustomCategory(custom)
    } else if (cat) {
      setCategory(cat)
    }
  }, [location.search])

  useEffect(() => {
    // load my bugs after profile is ready
    if (!profileReady || !submittedBy) return
    let mounted = true
      ; (async () => {
        try {
          const res = await fetch(`/api/bugs?submitted_by=${encodeURIComponent(submittedBy)}&page=${myPage}&per_page=${myPerPage}`)
          if (!res.ok) return
          const data = await res.json()
          if (mounted) setMyBugs(data.items || [])
        } catch (e) {
          console.error('Failed to load my bugs', e)
        }
      })()

    return () => {
      mounted = false
    }
  }, [profileReady, submittedBy, myPage, refreshTrigger])

  useEffect(() => {
    if (!debouncedTitle || description.trim().length < 5) {
      setDuplicate(null)
      return
    }

    const checkDuplicate = async () => {
      try {
        const res = await fetch(
          `/api/bugs/check?title=${encodeURIComponent(debouncedTitle)}&description=${encodeURIComponent(
            description
          )}&environment=${encodeURIComponent(environment)}`
        )

        if (!res.ok) {
          return
        }

        const data = await res.json()
        setDuplicate(data.exists ? data : null)
      } catch (error) {
        console.error('Duplicate check failed:', error)
      }
    }

    void checkDuplicate()
  }, [debouncedTitle, description, environment])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (duplicate) {
      setFormError('Exact duplicate bug already exists. Please open the existing bug instead.')
      return
    }

    // All other validation (title, description length, team, UUIDs) is enforced server-side
    setSubmitting(true)

    try {
      const body = new URLSearchParams()
      body.append('title', title)
      body.append('description', description)
      body.append('environment', environment)
      body.append('submitted_by', submittedBy || '')
      body.append('team_id', teamId || '')
      // send category/customCategory as tags (no DB schema change required)
      const tagsParts: string[] = []
      if (category && category.trim() && category !== '__custom__') tagsParts.push(category.trim())
      if (customCategory && customCategory.trim()) tagsParts.push(customCategory.trim())
      if (tagsParts.length) body.append('tags', tagsParts.join(','))

      const res = await fetch('/api/bugs/', { method: 'POST', body })

      if (res.status === 409) {
        const duplicateBody = await res.json()
        setFormError(`Duplicate found: ${duplicateBody.title}`)
        setSubmitting(false)
        return
      }

      if (!res.ok) {
        let message = 'Failed to create bug.'
        try {
          const errorBody = await res.json()
          if (typeof errorBody.detail === 'string') {
            message = errorBody.detail
          }
        } catch {
          // Ignore JSON parse failure and keep fallback message.
        }
        setFormError(message)
        setSubmitting(false)
        return
      }

      const data = await res.json()
      const bugId = data.id
      const teamSlug = data.team_slug

      const uploadedUrls: string[] = []
      const BUCKET = 'bug-screenshots'

      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg'
        const key = `${teamSlug}/${bugId}/${cryptoRandomId()}.${ext}`
        const uploadRes = await supabase.storage
          .from(BUCKET)
          .upload(key, file, { cacheControl: '3600', upsert: false, contentType: file.type })

        if (uploadRes.error) {
          setFormError(`Failed to upload ${file.name}: ${uploadRes.error.message}`)
          continue
        }

        const publicRes = supabase.storage.from(BUCKET).getPublicUrl(key)
        const publicUrl =
          (publicRes as any).data?.publicUrl || (publicRes as any)?.publicURL || publicRes

        uploadedUrls.push(publicUrl)
      }

      if (uploadedUrls.length > 0) {
        const updateRes = await fetch(`/api/bugs/${bugId}/screenshots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(uploadedUrls),
        })

        if (!updateRes.ok) {
          let message = 'Bug created, but failed to save screenshots.'
          try {
            const errorBody = await updateRes.json()
            if (typeof errorBody.detail === 'string') {
              message = errorBody.detail
            }
          } catch {
            // Ignore JSON parse failure and keep fallback message.
          }
          setFormError(message)
          setSubmitting(false)
          return
        }
      }

      setTitle('')
      setDescription('')
      setEnvironment('')
      setCategory('')
      setCustomCategory('')
      setFiles([])
      setDuplicate(null)
      setRefreshTrigger(prev => prev + 1)
      setSuccessMsg(`Bug submitted successfully! ID: ${bugId}`)
      setTimeout(() => setSuccessMsg(null), 6000)
    } catch (error) {
      console.error('Submit failed:', error)
      setFormError(
        error instanceof Error
          ? error.message
          : 'Submit request backend tak nahi pahunch paayi. Dev server restart karke try karo.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function cryptoRandomId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (char) {
      const random = (Math.random() * 16) | 0
      const value = char === 'x' ? random : (random & 0x3) | 0x8
      return value.toString(16)
    })
  }

  return (
    <form onSubmit={submit} className="w-full max-w-7xl mx-auto">
      <div className="mb-8 border-b border-[var(--border-color)] pb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Submit a Bug</h2>
        <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">Found an issue? Let the team know.</p>
      </div>

      {!profileReady && (
        <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Sk className="h-10 col-span-2" />
          <Sk className="h-10" />
          <Sk className="h-10" />
        </div>
      )}

      {successMsg && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-900 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
          <span>✓</span> {successMsg}
        </div>
      )}

      {formError && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-900 p-4 text-sm font-medium text-red-700 dark:text-red-400">
          {formError}
        </div>
      )}

      <div className="card mb-10 p-6 sm:p-8 lg:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-2">

          {/* Left Column */}
          <div>
            <Field label="Title">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                required
              />
              {duplicate && (
                <div className="mt-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 p-3 text-sm font-medium text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50">
                  Possible duplicate:{' '}
                  <a className="underline font-bold hover:text-orange-800 dark:hover:text-orange-300" href={`/dashboard/bugs/${duplicate.id}`}>
                    {duplicate.title}
                  </a>
                </div>
              )}
            </Field>

            <Field label="Description" helperText="At least 20 characters.">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={10}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow resize-y"
                required
              />
            </Field>
          </div>

          {/* Right Column */}
          <div>
            <Field label="Environment">
              <input
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="production, staging, Android 14, Chrome..."
              />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <Field label="Category">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                >
                  <option value="">Select category (optional)</option>
                  <option value="dashboard-bug">Dashboard bug</option>
                  <option value="navbar-bug">NavBar bug</option>
                  <option value="footer-bug">Footer bug</option>
                  <option value="ui-bug">UI bug</option>
                  <option value="performance">Performance</option>
                  <option value="__custom__">Custom...</option>
                </select>
              </Field>

              {(category === '__custom__' || customCategory) && (
                <Field label="Custom category" helperText="Optional — will be saved as a tag">
                  <input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    placeholder="Enter custom category"
                  />
                </Field>
              )}
            </div>

            <Field
              label="Screenshots"
              helperText={teamId ? `Bug will be created for team ${teamId}.` : 'No team assigned yet.'}
            >
              <div
                {...getRootProps()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] hover:bg-[var(--card-color)] transition-colors p-8 text-center"
              >
                <input {...getInputProps()} />
                <div className="w-12 h-12 mx-auto bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                </div>
                <p className="font-medium">Drag & drop images here</p>
                <p className="text-sm text-[var(--muted-text)] mt-1">or click to browse files (Max 5 files, 5MB each)</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex h-24 items-center justify-center overflow-hidden rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] px-2 text-center text-xs font-medium shadow-sm break-all"
                  >
                    {file.name}
                  </div>
                ))}
              </div>
            </Field>
          </div>

        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={submitting || !profileReady}
            className="rounded-xl bg-blue-600 px-8 py-3.5 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Bug'}
          </button>
        </div>
      </div>

      {/* My Bugs inline section */}
      <section className="mt-12 border-t border-[var(--border-color)] pt-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold tracking-tight">Recent Submissions</h3>
            <p className="mt-1 text-sm text-[var(--muted-text)] font-medium">Quick glance at your latest bugs.</p>
          </div>
          <input
            placeholder="Search my bugs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full sm:w-64 rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] focus:bg-[var(--soft-surface)] px-4 py-2.5 text-sm outline-none transition-colors"
          />
        </div>

        <div className="space-y-4">
          {(myBugs || [])
            .filter((b) => {
              if (!query.trim()) return true
              const q = query.toLowerCase()
              return (b.title || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)
            })
            .map((b) => (
              <a
                key={b.id}
                className="card block hover:opacity-80 transition-opacity group"
                href={`/dashboard/bugs/${b.id}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-lg group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{b.title}</div>
                    <div className="text-sm text-[var(--muted-text)] mt-1 font-medium">{b.created_at ? new Date(b.created_at).toLocaleString() : ''}</div>
                  </div>
                  <div className="flex flex-wrap sm:flex-col items-end gap-2 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${b.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'}`}>{b.severity}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{b.status}</span>
                  </div>
                </div>
              </a>
            ))}

          {(!myBugs || myBugs.length === 0) && (
            <div className="text-center py-8 text-[var(--muted-text)] font-medium bg-[var(--soft-surface)] rounded-xl border border-dashed border-[var(--border-color)]">
              No bugs found.
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <div className="text-sm font-medium text-[var(--muted-text)]">Page <span className="text-[var(--text-color)]">{myPage}</span></div>
          <div className="flex gap-2">
            <button disabled={myPage <= 1} onClick={() => setMyPage((p) => Math.max(1, p - 1))} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] hover:bg-[var(--soft-surface)] px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">Prev</button>
            <button onClick={() => setMyPage((p) => p + 1)} className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] hover:bg-[var(--soft-surface)] px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50">Next</button>
          </div>
        </div>
      </section>
    </form>
  )
}
