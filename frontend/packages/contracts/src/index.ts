import type { ComponentType } from 'react'

/** Host services contract major. Breaking changes bump this and block mismatched remotes. */
export const CONTRACT_MAJOR = 1

export type Role = 'buyer' | 'seller' | 'admin'

export interface SessionUser {
  id: string
  name: string
  roles: Role[]
  /** Present for seller accounts. */
  seller?: { id: string; name: string; status: 'pending' | 'approved' | 'rejected' }
}

export interface Session {
  user: SessionUser | null
}

/** Host services v1 (architecture.md). Credentials never cross this boundary. */
export interface HostServices {
  getSession(): Session
  onSessionChange(listener: (session: Session) => void): () => void
  /** Internal paths only; anything else is refused. */
  navigate(path: string): void
  /**
   * Same-origin /api/v1 client using the session cookie. Adds JSON Accept and CSRF headers;
   * a 401 clears the shell session.
   */
  api(path: string, init?: RequestInit): Promise<Response>
}

export interface RemoteMeta {
  name: string
  contractMajor: number
}

/** Shape every remote's `./routes` module must export. */
export interface RemoteModule {
  meta: RemoteMeta
  default: ComponentType<{ host: HostServices }>
}
