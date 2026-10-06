import { useSyncExternalStore } from 'react'
import type { Role, Session } from '@common-market/contracts'

/**
 * Shell-owned session (ADR-04): Laravel's cookie session is the authority, this is a cache of
 * GET /auth/session. Remotes read it through host services, never the cookie itself.
 */
let session: Session = { user: null }
const listeners = new Set<(s: Session) => void>()

function set(next: Session) {
  session = next
  listeners.forEach((l) => l(session))
}

export const getSession = () => session

export function onSessionChange(listener: (s: Session) => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useSession = () => useSyncExternalStore(onSessionChange, getSession)

interface SessionDto {
  id: string
  name: string
  role: Role
  seller: { id: string; name: string; status: 'pending' | 'approved' | 'rejected' } | null
}

const fromDto = (d: SessionDto | null): Session => ({
  user: d && { id: d.id, name: d.name, roles: [d.role], ...(d.seller && { seller: d.seller }) },
})

function readCookie(name: string): string | undefined {
  const match = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`))
  return match && decodeURIComponent(match.slice(name.length + 1))
}

async function xsrfToken(refresh = false): Promise<string> {
  if (refresh || !readCookie('XSRF-TOKEN')) await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' })
  return readCookie('XSRF-TOKEN') ?? ''
}

/** Same-origin JSON request with Sanctum CSRF handling; one retry after a 419 (expired token). */
export async function request(url: string, init: RequestInit = {}, retried = false): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  if (!['GET', 'HEAD'].includes(method)) headers.set('X-XSRF-TOKEN', await xsrfToken(retried))

  const res = await fetch(url, { ...init, headers, credentials: 'same-origin' })
  if (res.status === 419 && !retried) return request(url, init, true)
  if (res.status === 401 && session.user) set({ user: null }) // expired elsewhere
  return res
}

export async function loadSession(): Promise<void> {
  const res = await request('/auth/session')
  if (res.ok) set(fromDto((await res.json()).data))
}

/** Returns an error message, or null on success. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const res = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  const body = await res.json().catch(() => ({}))
  if (res.ok) {
    set(fromDto(body.data))
    return null
  }
  if (res.status === 429) return 'Too many attempts. Wait a minute and try again.'
  return body.errors?.email?.[0] ?? body.errors?.password?.[0] ?? 'Sign-in failed. Try again.'
}

export async function signOut(): Promise<void> {
  await request('/auth/logout', { method: 'POST' })
  set({ user: null })
}
