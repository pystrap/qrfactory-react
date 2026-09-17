import type { AuthResult } from './types'

export const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://qrfactorycore.cweb.app/api'
).replace(/\/$/, '')
// Session-scoped so signing out/closing the browser clears tokens and sensitive drafts.
const sessionKey = 'qrfactory.session'
export function getSession(): AuthResult | null {
  try {
    return JSON.parse(sessionStorage.getItem(sessionKey) || 'null')
  } catch {
    return null
  }
}
export function setSession(session: AuthResult | null) {
  if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session))
  else sessionStorage.removeItem(sessionKey)
  window.dispatchEvent(new Event('qrfactory-session'))
}
function errorMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(errorMessage).join(' ')
  if (value && typeof value === 'object')
    return Object.entries(value)
      .map(
        ([key, v]) =>
          `${['detail', 'non_field_errors'].includes(key) ? '' : `${key.replaceAll('_', ' ')}: `}${errorMessage(v)}`,
      )
      .join(' ')
  return 'Something went wrong. Please try again.'
}
export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message)
  }
}
let devicePromise: Promise<string> | null = null
async function ensureDevice(): Promise<string> {
  const existing = localStorage.getItem('qrfactory.device')
  if (existing) return existing
  if (!devicePromise) {
    const create = async () => {
      const stored = localStorage.getItem('qrfactory.device')
      if (stored) return stored
      const response = await fetch(`${API_BASE}/billing/device`, { method: 'POST' })
      if (!response.ok)
        throw new Error('Could not initialize your device. Please try again shortly.')
      const { device_token } = await response.json()
      localStorage.setItem('qrfactory.device', device_token)
      return device_token as string
    }
    devicePromise = (async () =>
      navigator.locks
        ? await navigator.locks.request('qrfactory-device', create)
        : await create())().finally(() => {
      devicePromise = null
    })
  }
  return devicePromise!
}
let refreshing: Promise<boolean> | null = null
async function refreshSession() {
  if (!refreshing)
    refreshing = (async () => {
      const session = getSession()
      if (!session) return false
      try {
        const response = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: session.refresh_token }),
        })
        if (!response.ok) {
          setSession(null)
          return false
        }
        const tokens = await response.json()
        if (getSession()?.refresh_token !== session.refresh_token) return false
        setSession({ ...session, ...tokens })
        return true
      } catch {
        return false
      }
    })().finally(() => {
      refreshing = null
    })
  return refreshing
}
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers)
  const session = getSession()
  if (session) headers.set('Authorization', `Bearer ${session.access_token}`)
  else if (path === '/billing/status' || path === '/qr-codes/preview')
    headers.set('X-Device-Token', await ensureDevice())
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  } catch {
    throw new Error('Cannot reach QRFactory. Check your connection and try again.')
  }
  const mayRefresh = !['/auth/login', '/auth/register', '/auth/token', '/auth/refresh'].includes(
    path,
  )
  if (response.status === 401 && retry && session && mayRefresh) {
    if (await refreshSession()) return api<T>(path, init, false)
  }
  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ detail: `Request failed (${response.status}). Please try again.` }))
    throw new ApiError(errorMessage(data.detail || data), data.code)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}
export const post = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) })
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) })
export async function download(url: string, filename: string, authenticated = false) {
  const headers: Record<string, string> = {}
  if (authenticated && getSession()) headers.Authorization = `Bearer ${getSession()!.access_token}`
  let response = await fetch(url, { headers })
  if (response.status === 401 && authenticated && (await refreshSession())) {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${getSession()!.access_token}` },
    })
  }
  if (!response.ok) throw new Error('Download failed. Please try again.')
  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}
