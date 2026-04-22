import React, { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabaseClient'
import { getAuthState } from '../../lib/auth'
import { useDebounce } from '../../utils/debounce'

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
    <div className="mb-5">
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      {children}
      {helperText && <p className="mt-1 text-xs text-slate-500">{helperText}</p>}
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
  const [teamId, setTeamId] = useState<string | null>(null)
  const [submittedBy, setSubmittedBy] = useState<string | null>(null)
  const [profileReady, setProfileReady] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
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
    ;(async () => {
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
  }, [profileReady, submittedBy, myPage])

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

    if (!submittedBy) {
      setFormError('Current user session nahi mil rahi. Dobara login karke try karo.')
      return
    }

    if (!teamId) {
      setFormError('Aapke profile me team assigned nahi hai. Team assign karo phir bug submit hoga.')
      return
    }

    if (description.trim().length < 20) {
      setFormError('Description kam se kam 20 characters ki honi chahiye.')
      return
    }

    setSubmitting(true)

    try {
      const body = new URLSearchParams()
      body.append('title', title)
      body.append('description', description)
      body.append('environment', environment)
      body.append('submitted_by', submittedBy)
      body.append('team_id', teamId)
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
      alert(`Bug submitted successfully: ${bugId}`)
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
    <form onSubmit={submit}>
      <h2 className="mb-4 text-2xl font-semibold">Submit Bug</h2>

      {!profileReady && (
        <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Loading your profile details...
        </div>
      )}

      {formError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <Field label="Title">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border p-2"
          required
        />
        {duplicate && (
          <div className="mt-2 text-yellow-700">
            Possible duplicate:{' '}
            <a className="underline" href={`/dashboard/bugs/${duplicate.id}`}>
              {duplicate.title}
            </a>
          </div>
        )}
      </Field>

      <Field label="Description" helperText="At least 20 characters.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={6}
          className="w-full rounded-md border p-2"
          required
        />
      </Field>

      <Field label="Environment">
        <input
          value={environment}
          onChange={(e) => setEnvironment(e.target.value)}
          className="w-full rounded-md border p-2"
          placeholder="production, staging, Android 14, Chrome..."
        />
      </Field>

      <Field label="Category">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-md border p-2"
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
            className="w-full rounded-md border p-2"
            placeholder="Enter custom category (e.g. typo, accessibility, build)"
          />
        </Field>
      )}

      <Field
        label="Screenshots"
        helperText={teamId ? `Bug will be created for team ${teamId}.` : 'No team assigned yet.'}
      >
        <div
          {...getRootProps()}
          className="cursor-pointer rounded-md border-2 border-dashed border-gray-300 p-4 text-center"
        >
          <input {...getInputProps()} />
          <p>Drag & drop images here, or click to select (max 5)</p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {files.map((file, index) => (
            <div
              key={`${file.name}-${index}`}
              className="flex h-20 items-center justify-center overflow-hidden rounded bg-gray-100 px-2 text-center text-xs"
            >
              {file.name}
            </div>
          ))}
        </div>
      </Field>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || !profileReady}
          className="rounded-md bg-primary px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </div>

      {/* My Bugs inline section */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">My Bugs</h3>
          <input
            placeholder="Search my bugs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ml-4 rounded-md border px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-3">
          {(myBugs || [])
            .filter((b) => {
              if (!query.trim()) return true
              const q = query.toLowerCase()
              return (b.title || '').toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)
            })
            .map((b) => (
              <a
                key={b.id}
                className="block rounded-md bg-white/60 p-4 shadow hover:shadow-md"
                href={`/dashboard/bugs/${b.id}`}
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{b.title}</div>
                    <div className="text-sm text-gray-500">{b.created_at ? new Date(b.created_at).toLocaleString() : ''}</div>
                  </div>
                  <div className="text-sm text-right">
                    <div className="text-gray-700">{b.severity}</div>
                    <div className="text-gray-500">{b.status}</div>
                  </div>
                </div>
              </a>
            ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600">Page {myPage}</div>
          <div className="flex gap-2">
            <button disabled={myPage <= 1} onClick={() => setMyPage((p) => Math.max(1, p - 1))} className="rounded-md border px-3 py-1 text-sm">Prev</button>
            <button onClick={() => setMyPage((p) => p + 1)} className="rounded-md border px-3 py-1 text-sm">Next</button>
          </div>
        </div>
      </section>
    </form>
  )
}
