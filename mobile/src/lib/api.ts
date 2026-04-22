const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://10.0.2.2:8000'

export interface CreateBugPayload {
  title: string
  description: string
  environment?: string
  submittedBy: string
  teamId: string
}

export async function checkDuplicate(title: string, description: string, environment = '') {
  const url =
    `${apiBaseUrl}/api/bugs/check?title=${encodeURIComponent(title)}` +
    `&description=${encodeURIComponent(description)}` +
    `&environment=${encodeURIComponent(environment)}`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error('Failed to check duplicate bug.')
  }

  return response.json()
}

export async function createBug(payload: CreateBugPayload) {
  const body = new URLSearchParams()
  body.append('title', payload.title)
  body.append('description', payload.description)
  body.append('environment', payload.environment ?? '')
  body.append('submitted_by', payload.submittedBy)
  body.append('team_id', payload.teamId)

  const response = await fetch(`${apiBaseUrl}/api/bugs/`, {
    method: 'POST',
    body,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Failed to create bug.')
  }

  return data
}
