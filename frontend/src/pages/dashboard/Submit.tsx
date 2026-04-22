import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabaseClient'
import { useDebounce } from '../../utils/debounce'

function Field({ children, label }: any) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

export default function SubmitPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [environment, setEnvironment] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [duplicate, setDuplicate] = useState<any>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((f) => [...f, ...acceptedFiles].slice(0, 5))
  }, [])
  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: { 'image/*': [] }, maxSize: 5 * 1024 * 1024 })

  const debouncedTitle = useDebounce(title, 600)

  React.useEffect(() => {
    if (!debouncedTitle) return
    // call backend duplicate check
    fetch(`/api/bugs/check?title=${encodeURIComponent(debouncedTitle)}&description=${encodeURIComponent(description)}&environment=${encodeURIComponent(environment)}`)
      .then((r) => r.json())
      .then((j) => {
        setDuplicate(j.exists ? j : null)
      })
  }, [debouncedTitle, description, environment])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (duplicate) {
      alert('Exact duplicate exists. Please see the existing bug.')
      return
    }

    // 1) Create bug record on server (without files)
    const body = new URLSearchParams()
    body.append('title', title)
    body.append('description', description)
    body.append('environment', environment)
    body.append('submitted_by', '00000000-0000-0000-0000-000000000000')
    body.append('team_id', '00000000-0000-0000-0000-000000000000')

    const res = await fetch('/api/bugs/', { method: 'POST', body })
    if (res.status === 409) {
      const body = await res.json()
      alert(`Duplicate found: ${body.title}`)
      return
    }
    if (!res.ok) {
      alert('Failed to create bug')
      return
    }
    const data = await res.json()
    const bugId = data.id
    const teamSlug = data.team_slug

    // 2) Upload files to Supabase storage (client-side) and collect public URLs
    const uploadedUrls: string[] = []
    const BUCKET = 'bug-screenshots'
    for (const f of files) {
      const ext = f.name.split('.').pop() || 'jpg'
      const key = `${teamSlug}/${bugId}/${cryptoRandomId()}.${ext}`
      const up = await supabase.storage.from(BUCKET).upload(key, f, { cacheControl: '3600', upsert: false, contentType: f.type })
      if (up.error) {
        console.error('Upload error', up.error)
        alert('Failed to upload ' + f.name)
        continue
      }
      const publicRes = supabase.storage.from(BUCKET).getPublicUrl(key)
      const publicUrl = (publicRes as any).data?.publicUrl || (publicRes as any)?.publicURL || publicRes
      uploadedUrls.push(publicUrl)
    }

    // 3) Notify backend to update screenshot URLs
    if (uploadedUrls.length > 0) {
      const upd = await fetch(`/api/bugs/${bugId}/screenshots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ urls: uploadedUrls }) })
      if (!upd.ok) {
        alert('Failed to update bug with screenshots')
        return
      }
    }

    alert('Bug submitted: ' + bugId)
  }

  function cryptoRandomId() {
    // small UUID-like generator for client filenames
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0
      const v = c === 'x' ? r : (r & 0x3) | 0x8
      return v.toString(16)
    })
  }

  return (
    <form onSubmit={submit}>
      <h2 className="text-2xl font-semibold mb-4">Submit Bug</h2>
      <Field label="Title">
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md p-2 border" />
        {duplicate && <div className="mt-2 text-yellow-700">Possible duplicate: <a className="underline" href={`/dashboard/bugs/${duplicate.id}`}>{duplicate.title}</a></div>}
      </Field>

      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full rounded-md p-2 border" />
      </Field>

      <Field label="Environment">
        <input value={environment} onChange={(e) => setEnvironment(e.target.value)} className="w-full rounded-md p-2 border" />
      </Field>

      <Field label="Screenshots">
        <div {...getRootProps()} className="border-dashed border-2 border-gray-300 p-4 rounded-md text-center cursor-pointer">
          <input {...getInputProps()} />
          <p>Drag & drop images here, or click to select (max 5)</p>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-2">
          {files.map((f, i) => (
            <div key={i} className="h-20 w-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center text-xs">{f.name}</div>
          ))}
        </div>
      </Field>

      <div className="flex justify-end">
        <button type="submit" className="px-4 py-2 rounded-md bg-primary text-white">Submit</button>
      </div>
    </form>
  )
}
