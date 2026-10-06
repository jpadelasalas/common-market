import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

/** Fresh fictional demo data (catalog + CM-1001..CM-1003) before every run. */
export default function resetDatabase() {
  execSync('php artisan migrate:fresh --seed --force', {
    cwd: fileURLToPath(new URL('../../backend/apps/api', import.meta.url)),
    stdio: 'ignore',
  })
}
