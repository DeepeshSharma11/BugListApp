import React, { useEffect, useMemo, useState } from 'react'
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

    const [
      { data: bugs, error: bugsError },
      { data: teamsData, error: teamsError },
      { data: usersData, error: usersError },
    ] = await Promise.all([
      supabase
        .from('bugs')
        .select('id, title, status, severity, priority, team_id, created_at')
        .order('created_at', { ascending: false }),
      supabase.from('teams').select('id, name, slug, created_at').order('created_at', { ascending: false }),
      supabase
        .from('profiles')
        .select('id, full_name, email, role, team_id')
        .order('created_at', { ascending: false }),
    ])

    if (bugsError || teamsError || usersError) {
      setError(bugsError?.message || teamsError?.message || usersError?.message || 'Failed to load admin dashboard.')
      setLoading(false)
      return
    }

    const bugRows = bugs ?? []
    const teamRows = teamsData ?? []
    const userRows = usersData ?? []

    setStats({
      totalBugs: bugRows.length,
      openBugs: bugRows.filter((bug) => bug.status === 'open').length,
      resolvedBugs: bugRows.filter((bug) => bug.status === 'resolved').length,
      criticalBugs: bugRows.filter((bug) => bug.severity === 'critical').length,
      highPriorityBugs: bugRows.filter((bug) => bug.priority === 'high' || bug.priority === 'urgent').length,
      teamCount: teamRows.length,
    })

    setRecentBugs(bugRows.slice(0, 8))
    setTeams(teamRows)
    setUsers(userRows)
    setSelectedTeamId((current) => current || teamRows[0]?.id || '')
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

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Admin Dashboard</h2>
          <p className="mt-1 text-sm text-slate-600">
            Team create karo, users ko email se assign karo, aur latest bug activity monitor karo.
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
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">Total Bugs</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">{stats.totalBugs}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-amber-700">Open</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{stats.openBugs}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-700">Resolved</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{stats.resolvedBugs}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-rose-700">Critical</p>
          <p className="mt-3 text-3xl font-bold text-rose-600">{stats.criticalBugs}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wider text-sky-700">Teams</p>
          <p className="mt-3 text-3xl font-bold text-sky-700">{stats.teamCount}</p>
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

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Team Setup
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">Create New Team</h3>

          <form className="mt-5 space-y-4" onSubmit={handleCreateTeam}>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Team Name</label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Frontend QA"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Team Slug</label>
              <input
                value={teamSlug}
                onChange={(e) => setTeamSlug(slugify(e.target.value))}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="frontend-qa"
              />
            </div>

            <button
              type="submit"
              disabled={savingTeam}
              className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingTeam ? 'Creating Team...' : 'Create Team'}
            </button>
          </form>

          <div className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-700">Assign Users By Email</p>
            <p className="mt-1 text-sm text-slate-500">
              Team select karke modal kholo, phir email ya name se users pick karke assign kar do.
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-400"
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
                onClick={() => setIsModalOpen(true)}
                disabled={!teams.length}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Open User Selector
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Team Directory
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">All Teams And Assigned Users</h3>

          <div className="mt-5 space-y-4">
            {usersByTeam.length === 0 && !loading ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
                Abhi tak koi team create nahi hui.
              </div>
            ) : (
              usersByTeam.map((team) => (
                <div key={team.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">{team.name}</h4>
                      <p className="mt-1 text-xs text-slate-500">
                        {team.slug} • Created {formatDate(team.created_at)}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700">
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

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Recent Activity
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Latest Bug Reports</h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            User Overview
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">All Users</h3>

          <div className="mt-5 space-y-3">
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

      {isModalOpen && (
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
        </div>
      )}
    </div>
  )
}
