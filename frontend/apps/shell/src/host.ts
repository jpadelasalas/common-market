import type { HostServices } from '@common-market/contracts'
import { isSafeInternalPath } from './safePath.ts'
import { getSession, onSessionChange, request } from './session.ts'

export function createHostServices(navigate: (path: string) => void): HostServices {
  return {
    getSession,
    onSessionChange,
    navigate(path) {
      if (isSafeInternalPath(path)) navigate(path)
      else console.warn('[host] refused navigation to non-internal path')
    },
    api: (path, init) => request(`/api/v1${path}`, init),
  }
}
