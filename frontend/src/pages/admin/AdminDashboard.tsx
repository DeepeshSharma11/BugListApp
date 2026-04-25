import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'


interface BugRow {
  id: string
  title: string
  status: string
  severity: string
  priority: string
  team_id: string | null
  created_at: string
}

interface UserRow {
  id: string
  full_name: string | null
  email: string | null
  role: string | null
  team_id: string | null
}

interface TeamRow {
  id: string
  name: string
  slug: string
  created_at: string
}

interface Stats {
  totalBugs: number
  openBugs: number
  resolvedBugs: number
  criticalBugs: number
  highPriorityBugs: number
  teamCount: number
}

const defaultStats: Stats = {
  totalBugs: 0,
  openBugs: 0,
  resolvedBugs: 0,
  criticalBugs: 0,
  highPriorityBugs: 0,
  teamCount: 0,
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function badgeClasses(type: 'status' | 'severity' | 'priority', value: string) {
  if (type === 'status') {
    if (value === 'resolved') return 'bg-emerald-100 text-emerald-700'
    if (value === 'open') return 'bg-amber-100 text-amber-700'
    if (value === 'closed') return 'bg-slate-200 text-slate-700'
    return 'bg-blue-100 text-blue-700'
  }

  if (type === 'severity') {
    if (value === 'critical') return 'bg-rose-100 text-rose-700'
    if (value === 'high') return 'bg-orange-100 text-orange-700'
    if (value === 'medium') return 'bg-yellow-100 text-yellow-700'
    return 'bg-slate-100 text-slate-700'
  }

  if (value === 'urgent') return 'bg-rose-100 text-rose-700'
  if (value === 'high') return 'bg-orange-100 text-orange-700'
  if (value === 'normal') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [savingTeam, setSavingTeam] = useState(false)
  const [assigningUsers, setAssigningUsers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>(defaultStats)
  const [recentBugs, setRecentBugs] = useState<BugRow[]>([])
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [users, setUsers] = useState<UserRow[]>([])
  const [teamName, setTeamName] = useState('')
  const [teamSlug, setTeamSlug] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [cleanupDays, setCleanupDays] = useState<number>(90)
  const [cleanupDryRun, setCleanupDryRun] = useState<boolean>(true)
  const [runningCleanup, setRunningCleanup] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)

  const usersByTeam = useMemo(() => {
    return teams.map((team) => ({
      ...team,
      members: users.filter((user) => user.team_id === team.id),
    }))
  }, [teams, users])

  const filteredUsers = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return users
    }

    return users.filter((user) => {
      const haystack = `${user.full_name ?? ''} ${user.email ?? ''} ${user.role ?? ''}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [searchTerm, users])

  useEffect(() => {
    void loadDashboard()
  }, [])

  useEffect(() => {
    if (!teamName.trim()) {
      setTeamSlug('')
      return
    }

    setTeamSlug(slugify(teamName))
  }, [teamName])

  async function loadDashboard() {
    setLoading(true)
    setError(null)

    // Fetch stats via count-only queries (accurate beyond Supabase's 1000-row default)
    const [
      { count: totalBugs, error: e1 },
      { count: openBugs, error: e2 },
      { count: resolvedBugs, error: e3 },
      { count: criticalBugs, error: e4 },
      { count: highPriorityBugs, error: e5 },
      { data: recentBugsData, error: e6 },
      { data: teamsData, error: teamsError },
      { data: usersData, error: usersError },
    ] = await Promise.all([
      supabase.from('bugs').select('id', { count: 'exact', head: true }),
      supabase.from('bugs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('bugs').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
      supabase.from('bugs').select('id', { count: 'exact', head: true }).eq('severity', 'critical'),
      supabase.from('bugs').select('id', { count: 'exact', head: true }).in('priority', ['high', 'urgent']),
      supabase
        .from('bugs')
        .select('id, title, status, severity, priority, team_id, created_at')
        .order('created_at', { ascending: false })
        .limit(8),
      supabase.from('teams').select('id, name, slug, created_at').order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, team_id')
        .order('created_at', { ascending: false }),
    ])

    const anyError = e1 || e2 || e3 || e4 || e5 || e6 || teamsError || usersError
    if (anyError) {
      setError(anyError.message || 'Failed to load admin dashboard.')
      setLoading(false)
      return
    }

    setStats({
      totalBugs: totalBugs ?? 0,
      openBugs: openBugs ?? 0,
      resolvedBugs: resolvedBugs ?? 0,
      criticalBugs: criticalBugs ?? 0,
      highPriorityBugs: highPriorityBugs ?? 0,
      teamCount: teamsData?.length ?? 0,
    })

    setRecentBugs(recentBugsData ?? [])
    setTeams(teamsData ?? [])
    setUsers(usersData ?? [])
    setSelectedTeamId((current) => current || teamsData?.[0]?.id || '')
    setLoading(false)
  }

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const normalizedName = teamName.trim()
    const normalizedSlug = teamSlug.trim()

    if (!normalizedName || !normalizedSlug) {
      setError('Team name aur slug dono required hain.')
      return
    }

    setSavingTeam(true)

    const { data, error: insertError } = await supabase
      .from('teams')
      .insert({ name: normalizedName, slug: normalizedSlug })
      .select('id, name, slug, created_at')
      .single()

    if (insertError) {
      setError(insertError.message)
      setSavingTeam(false)
      return
    }

    setSuccess(`Team "${data.name}" create ho gayi.`)
    setTeamName('')
    setTeamSlug('')
    setTeams((current) => [data, ...current])
    setSelectedTeamId(data.id)
    setStats((current) => ({ ...current, teamCount: current.teamCount + 1 }))
    setSavingTeam(false)
  }

  async function handleAssignUsers() {
    setError(null)
    setSuccess(null)

    if (!selectedTeamId) {
      setError('Pehle koi team select karo.')
      return
    }

    if (selectedUserIds.length === 0) {
      setError('Kam se kam ek user select karo.')
      return
    }

    setAssigningUsers(true)

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ team_id: selectedTeamId })
      .in('id', selectedUserIds)

    if (updateError) {
      setError(updateError.message)
      setAssigningUsers(false)
      return
    }

    setUsers((current) =>
      current.map((user) =>
        selectedUserIds.includes(user.id) ? { ...user, team_id: selectedTeamId } : user
      )
    )

    const assignedTeam = teams.find((team) => team.id === selectedTeamId)
    setSuccess(
      `${selectedUserIds.length} user(s) ko ${assignedTeam?.name ?? 'selected team'} me assign kar diya gaya.`
    )
    setSelectedUserIds([])
    setSearchTerm('')
    setIsModalOpen(false)
    setAssigningUsers(false)
  }

  function toggleUserSelection(userId: string) {
    setSelectedUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    )
  }

  function handleOpenUserSelector() {
    setError(null)
    setSuccess(null)

    if (!teams.length) {
      setError('Pehle ek team create karo, uske baad user selector khulega.')
      return
    }

    if (!selectedTeamId) {
      setError('Pehle dropdown se team select karo.')
      return
    }

    if (!users.length) {
      setError('Abhi users load nahi hue. Profiles RLS/policies check karo.')
      return
    }

    setIsModalOpen(true)
  }

  async function handleCleanupOldBugs() {
    setRunningCleanup(true)
    setCleanupResult(null)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Not authenticated. Please log in again.')
        setRunningCleanup(false)
        return
      }

      const res = await fetch('/api/admin/bugs/cleanup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ days: cleanupDays, dry_run: cleanupDryRun }),
      })

      const json = await res.json()
      if (!res.ok) {
        setError(json.detail || 'Cleanup failed')
      } else {
        setCleanupResult(json)
        setSuccess('Cleanup completed (or dry run result).')
      }
    } catch (e: any) {
      console.error(e)
      setError(e.message || 'Cleanup error')
    } finally {
      setRunningCleanup(false)
    }
  }

  return (
    <div className="w-full space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-[var(--border-color)] pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h2>
          <p className="mt-2 text-sm text-[var(--muted-text)] font-medium">
            Manage teams, assign users, and monitor latest bug activity.
          </p>
        </div>
        <Link
          to="/dashboard/team"
          className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          View Team Bugs
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">Total Bugs</p>
          <p className="mt-3 text-3xl font-black text-blue-900 dark:text-blue-100">{stats.totalBugs}</p>
        </div>
        <div className="card border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Open</p>
          <p className="mt-3 text-3xl font-black text-amber-900 dark:text-amber-100">{stats.openBugs}</p>
        </div>
        <div className="card border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Resolved</p>
          <p className="mt-3 text-3xl font-black text-emerald-900 dark:text-emerald-100">{stats.resolvedBugs}</p>
        </div>
        <div className="card border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-900/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">Critical</p>
          <p className="mt-3 text-3xl font-black text-rose-900 dark:text-rose-100">{stats.criticalBugs}</p>
        </div>
        <div className="card border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10 p-5">
          <p className="text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">Teams</p>
          <p className="mt-3 text-3xl font-black text-purple-900 dark:text-purple-100">{stats.teamCount}</p>
        </div>
      </div>

      {(error || success) && (
        <div className="space-y-3">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="card p-8">
          <div className="border-b border-[var(--border-color)] pb-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
              Team Setup
            </p>
            <h3 className="mt-1 text-xl font-bold">Create New Team</h3>
          </div>

          <form className="space-y-5" onSubmit={handleCreateTeam}>
            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide">Team Name</label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="Frontend QA"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold tracking-wide">Team Slug</label>
              <input
                value={teamSlug}
                onChange={(e) => setTeamSlug(slugify(e.target.value))}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-3 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                placeholder="frontend-qa"
              />
            </div>

            <button
              type="submit"
              disabled={savingTeam}
              className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:shadow-md disabled:hover:bg-blue-600"
            >
              {savingTeam ? 'Creating Team...' : 'Create Team'}
            </button>
          </form>

          <div className="mt-10 rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-6">
            <h4 className="text-base font-bold">Assign Users</h4>
            <p className="mt-1.5 text-sm text-[var(--muted-text)] font-medium">
              Select a team and open the user selector to manage assignments.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--card-color)] p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-shadow font-medium"
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.slug})
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleOpenUserSelector}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Open User Selector
              </button>
            </div>
          </div>
        </section>

        <section className="card p-8">
          <div className="border-b border-[var(--border-color)] pb-4 mb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
              Team Directory
            </p>
            <h3 className="mt-1 text-xl font-bold">All Teams And Assigned Users</h3>
          </div>

          <div className="space-y-4">
            {usersByTeam.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--soft-surface)] p-8 text-center text-sm font-medium text-[var(--muted-text)]">
                No teams have been created yet.
              </div>
            ) : (
              usersByTeam.map((team) => (
                <div key={team.id} className="rounded-xl border border-[var(--border-color)] bg-[var(--soft-surface)] p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold">{team.name}</h4>
                      <p className="mt-1 text-xs font-medium text-[var(--muted-text)]">
                        {team.slug} • Created {formatDate(team.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-[var(--border-color)] px-3 py-1 text-xs font-bold text-[var(--text-color)]">
                      {team.members.length} member(s)
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {team.members.length === 0 ? (
                      <p className="text-sm text-slate-500">No users assigned yet.</p>
                    ) : (
                      team.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {member.full_name || 'Unnamed User'}
                            </p>
                            <p className="text-xs text-slate-500">{member.email || 'No email'}</p>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                            {member.role || 'member'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="card p-8">
          <div className="mb-6 flex items-center justify-between border-b border-[var(--border-color)] pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
                Recent Activity
              </p>
              <h3 className="mt-1 text-xl font-bold">Latest Bug Reports</h3>
            </div>
            <span className="rounded-full bg-[var(--soft-surface)] border border-[var(--border-color)] px-3 py-1 text-xs font-bold">
              {recentBugs.length} shown
            </span>
          </div>

          {recentBugs.length === 0 && !loading ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
              Abhi tak koi bug report nahi aayi.
            </div>
          ) : (
            <div className="space-y-3">
              {recentBugs.map((bug) => (
                <Link
                  key={bug.id}
                  to={`/dashboard/bugs/${bug.id}`}
                  className="block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">{bug.title}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        Created {formatDate(bug.created_at)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Team ID: {bug.team_id ?? 'Not assigned'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('status', bug.status)}`}
                      >
                        {bug.status.replace('_', ' ')}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('severity', bug.severity)}`}
                      >
                        {bug.severity}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeClasses('priority', bug.priority)}`}
                      >
                        {bug.priority}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="card p-8">
          <div className="mb-6 border-b border-[var(--border-color)] pb-4">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-text)]">
              User Overview
            </p>
            <h3 className="mt-1 text-xl font-bold">All Users</h3>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {users.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Koi user data visible nahi hai.
              </div>
            ) : (
              users.map((user) => {
                const assignedTeam = teams.find((team) => team.id === user.team_id)
                return (
                  <div
                    key={user.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-medium text-slate-900">
                      {user.full_name || 'Unnamed User'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{user.email || 'No email'}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {user.role || 'member'}
                      </span>
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                        {assignedTeam ? assignedTeam.name : 'No team assigned'}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
          Loading live admin data...
        </div>
      )}

      {isModalOpen &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Select Users By Email</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Search by email/name and assign selected users to chosen team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false)
                  setSearchTerm('')
                  setSelectedUserIds([])
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Search by email, name, or role"
              />

              <div className="max-h-[45vh] space-y-3 overflow-y-auto pr-1">
                {filteredUsers.map((user) => {
                  const checked = selectedUserIds.includes(user.id)
                  const assignedTeam = teams.find((team) => team.id === user.team_id)

                  return (
                    <label
                      key={user.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                        checked
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleUserSelection(user.id)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {user.full_name || 'Unnamed User'}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {user.email || 'No email'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
                            {user.role || 'member'}
                          </span>
                          <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                            {assignedTeam ? assignedTeam.name : 'No team assigned'}
                          </span>
                        </div>
                      </div>
                    </label>
                  )
                })}

                {filteredUsers.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                    Koi matching user nahi mila.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">{selectedUserIds.length} user(s) selected</p>
              <button
                type="button"
                onClick={() => void handleAssignUsers()}
                disabled={assigningUsers || selectedUserIds.length === 0 || !selectedTeamId}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {assigningUsers ? 'Assigning...' : 'Assign Selected Users'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
