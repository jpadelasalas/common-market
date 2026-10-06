import { loadRemote, registerRemotes } from '@module-federation/runtime'
import { CONTRACT_MAJOR, type RemoteModule } from '@common-market/contracts'

export type AreaName = 'storefront' | 'seller' | 'admin'

interface ManifestEntry {
  entry: string
  version: string
  contractMajor: number
}
type Manifest = { remotes: Record<AreaName, ManifestEntry> }

const TIMEOUT_MS = Number(import.meta.env.VITE_REMOTE_TIMEOUT_MS ?? 10_000)

let manifest: Promise<Manifest> | undefined

/** Runtime deployment manifest: rollback = point an entry at an older artifact, no shell rebuild. */
function getManifest(): Promise<Manifest> {
  manifest ??= fetch('/manifest.json', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error(`manifest HTTP ${res.status}`)
      return res.json() as Promise<Manifest>
    })
    .then((m) => {
      registerRemotes(Object.entries(m.remotes).map(([name, r]) => ({ name, entry: r.entry, type: 'module' })))
      return m
    })
    .catch((err) => {
      manifest = undefined // let Retry refetch
      throw err
    })
  return manifest
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

/** Loads an area's route tree. Throws on missing, slow or contract-incompatible remotes. */
export async function loadArea(name: AreaName, attempt: number): Promise<RemoteModule> {
  const m = await getManifest()
  const remote = m.remotes[name]
  try {
    if (!remote) throw new Error('not in manifest')
    if (remote.contractMajor !== CONTRACT_MAJOR) throw new Error(`manifest contract ${remote.contractMajor}`)
    // Drop the runtime's cached (failed) entry so Retry really refetches it.
    // Browsers cache a failed import() per URL for the page's lifetime, so a retry must use a new
    // URL for the same immutable artifact; force also drops the runtime's cached failure.
    if (attempt > 0) {
      const entry = `${remote.entry}${remote.entry.includes('?') ? '&' : '?'}attempt=${attempt}`
      registerRemotes([{ name, entry, type: 'module' }], { force: true })
    }

    const mod = await withTimeout(loadRemote<RemoteModule>(`${name}/routes`), TIMEOUT_MS)
    if (!mod?.default || mod.meta?.contractMajor !== CONTRACT_MAJOR)
      throw new Error(`module contract ${mod?.meta?.contractMajor ?? 'missing'}`)
    return mod
  } catch (err) {
    // Diagnostics stay in the console/telemetry, never in user-facing copy.
    console.error('[remote]', { name, version: remote?.version, entry: remote?.entry, error: String(err) })
    throw err
  }
}
