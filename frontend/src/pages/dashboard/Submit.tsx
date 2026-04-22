import React, { useCallback, useEffect, useState } from 'react'
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
    </form>
  )
}
