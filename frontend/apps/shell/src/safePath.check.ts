import assert from 'node:assert/strict'
import { isSafeInternalPath as safe } from './safePath.ts'

for (const ok of ['/', '/orders', '/products?q=mug', '/seller/orders/42#items']) assert.ok(safe(ok), ok)
for (const bad of ['', 'orders', '//evil.test', '/\\evil.test', '/\t/evil.test', 'https://evil.test', 'javascript:alert(1)'])
  assert.ok(!safe(bad), JSON.stringify(bad))

console.log('safePath ok')
