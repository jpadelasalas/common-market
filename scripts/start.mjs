// One command for the local demo: Laravel API (:8100) + shell and remotes (vite preview :5000-5003).
// Usage (repo root): node scripts/start.mjs        Build the frontend first: pnpm --dir frontend build
// Ctrl+C stops everything; if one side exits, the other is stopped too.
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const at = (path) => fileURLToPath(new URL(`../${path}`, import.meta.url))
const services = [
  { name: 'api', cmd: 'php artisan serve --port=8100', cwd: at('backend/apps/api') },
  { name: 'web', cmd: 'pnpm preview', cwd: at('frontend') },
]

const children = services.map(({ name, cmd, cwd }) => {
  // shell: true so Windows finds pnpm.cmd / php.exe on PATH.
  const child = spawn(cmd, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      for (const line of String(chunk).split(/\r?\n/)) if (line.trim()) console.log(`[${name}] ${line}`)
    })
  child.on('exit', (code) => {
    console.log(`[${name}] exited (${code}); stopping the rest`)
    stopAll()
  })
  return child
})

let stopping = false
function stopAll() {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (child.exitCode !== null) continue
    // Kill the whole process tree (vite spawns workers; artisan serve spawns php -S).
    if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGTERM')
  }
}
process.on('SIGINT', stopAll)
process.on('SIGTERM', stopAll)

console.log('Starting Common Market. Open http://localhost:5000 once both sides report ready.')
