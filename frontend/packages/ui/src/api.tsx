import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { HostServices } from '@common-market/contracts'

const HostContext = createContext<HostServices | null>(null)
export const HostProvider = HostContext.Provider

export function useHost(): HostServices {
  const host = useContext(HostContext)
  if (!host) throw new Error('Storefront rendered outside the shell')
  return host
}

export function useSession() {
  const host = useHost()
  return useSyncExternalStore(host.onSessionChange, host.getSession)
}

/** API error in the common contract ({ code, message, data? }); status 0 = network failure. */
export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly body: any = null,
  ) {
    super(message)
  }
}

export async function call<T>(host: HostServices, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await host.api(path, init)
  } catch {
    throw new ApiFailure(0, 'network', 'We could not reach Common Market. Check your connection and try again.')
  }
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new ApiFailure(res.status, body?.code ?? 'http_error', body?.message ?? 'Something went wrong. Try again.', body)
  return body as T
}

export interface Loaded<T> {
  data?: T
  error?: ApiFailure
  loading: boolean
  reload(): void
  setData(data: T): void
}

/** GET a path (re-fetched when the path changes); `null` skips the request. */
export function useApi<T>(path: string | null): Loaded<T> {
  const host = useHost()
  const [state, setState] = useState<{ data?: T; error?: ApiFailure; loading: boolean }>({ loading: path !== null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (path === null) return
    let live = true
    setState((s) => ({ data: s.data, loading: true }))
    call<T>(host, path).then(
      (data) => live && setState({ data, loading: false }),
      (error: ApiFailure) => live && setState({ error, loading: false }),
    )
    return () => {
      live = false
    }
  }, [host, path, attempt])

  return { ...state, reload: () => setAttempt((n) => n + 1), setData: (data) => setState({ data, loading: false }) }
}

const pesos = new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const money = (centavos: number) => `PHP ${pesos.format(centavos / 100)}`

const manila = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Manila' })
export const when = (iso: string) => manila.format(new Date(iso))
