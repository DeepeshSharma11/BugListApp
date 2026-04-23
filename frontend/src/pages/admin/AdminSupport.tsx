import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface SupportTicket {
  id: string
  user_id: string | null
  user_email: string
  subject: string
  message: string
  status: string
  created_at: string
  updated_at?: string
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [newStatus, setNewStatus] = useState('resolved')
  const [sendingReply, setSendingReply] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadTickets()
  }, [])

  async function loadTickets() {
    setLoading(true)
    setError(null)
    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET
      if (!adminSecret) {
        throw new Error('VITE_ADMIN_SECRET not set in environment.')
      }

      const res = await fetch('/api/admin/support', {
        headers: {
          'x-admin-secret': adminSecret
        }
      })

      if (!res.ok) throw new Error('Failed to fetch tickets')
      const data = await res.json()
      setTickets(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateDraft() {
    if (!selectedTicket) return
    setGeneratingDraft(true)
    setError(null)
    
    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/draft`, {
        method: 'POST',
        headers: {
          'x-admin-secret': adminSecret || ''
        }
      })

      if (!res.ok) throw new Error('Failed to generate AI draft')
      const data = await res.json()
      setReplyMessage(data.draft)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setGeneratingDraft(false)
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTicket || !replyMessage.trim()) return

    setSendingReply(true)
    setError(null)
    setSuccess(null)

    try {
      const adminSecret = import.meta.env.VITE_ADMIN_SECRET
      const res = await fetch(`/api/admin/support/${selectedTicket.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret || ''
        },
        body: JSON.stringify({
          reply: replyMessage,
          status: newStatus
        })
      })

      if (!res.ok) throw new Error('Failed to send reply')
      
      setSuccess('Reply sent to user via email successfully!')
      setSelectedTicket(null)
      setReplyMessage('')
      loadTickets() // Refresh the list
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSendingReply(false)
    }
  }

  const filteredTickets = tickets.filter(t => filter === 'all' ? true : t.status === filter)

  return (
    <div className="w-full space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border-color)] pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Support Tickets</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
            Manage user support inquiries and send email replies.
          </p>
        </div>
        
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {(error || success) && (
        <div className="space-y-3">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
          {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{success}</div>}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="card text-sm font-medium animate-pulse p-6 text-center">Loading tickets...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-8 text-center text-sm font-medium text-[var(--muted-text)]">
            No support tickets found.
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} className="card p-6 flex flex-col md:flex-row justify-between items-start gap-4 hover:shadow-md transition-shadow">
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold">{ticket.subject}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    ticket.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    ticket.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--muted-text)]">
                  From: {ticket.user_email} • {new Date(ticket.created_at).toLocaleString()}
                </p>
                <div className="mt-4 p-4 rounded-xl bg-[var(--soft-surface)] border border-[var(--border-color)] whitespace-pre-wrap text-sm">
                  {ticket.message}
                </div>
              </div>
              
              <button
                onClick={() => setSelectedTicket(ticket)}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
              >
                Reply & Update
              </button>
            </div>
          ))
        )}
      </div>

      {selectedTicket && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl p-6">
            <h3 className="text-xl font-bold mb-2">Reply to Ticket</h3>
            <p className="text-sm text-slate-500 mb-6">Subject: {selectedTicket.subject}</p>
            
            <form onSubmit={handleSendReply} className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-2">Update Status</label>
                <select 
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 outline-none focus:border-blue-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold">Email Reply Message</label>
                  <button
                    type="button"
                    onClick={handleGenerateDraft}
                    disabled={generatingDraft}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingDraft ? 'Generating...' : '✨ Generate AI Draft'}
                  </button>
                </div>
                <textarea
                  required
                  rows={6}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your reply here, or click Generate AI Draft to get a suggestion."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingReply}
                  className="px-6 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-70"
                >
                  {sendingReply ? 'Sending Email...' : 'Send Reply'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
