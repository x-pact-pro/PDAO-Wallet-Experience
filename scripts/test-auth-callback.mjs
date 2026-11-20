import assert from 'node:assert/strict'
import fs from 'node:fs'
import { isNativeAuthCallback } from '../src/lib/authCallback.ts'

const redirect = 'org.privatedao.wallet://tenant.us.auth0.com/capacitor/org.privatedao.wallet/callback'
assert.equal(isNativeAuthCallback(`${redirect}?code=example&state=transaction`, redirect), true)
assert.equal(isNativeAuthCallback(`${redirect}?error=access_denied&state=transaction`, redirect), true)
for (const url of [
  `${redirect}?code=example`, `${redirect}?state=transaction`,
  `${redirect}/extra?code=example&state=transaction`,
  `${redirect.replace('tenant.us.auth0.com', 'other.example')}?code=example&state=transaction`,
  `${redirect.replace('org.privatedao.wallet:', 'https:')}?code=example&state=transaction`,
  `${redirect}?code=example&state=transaction#fragment`, 'not a URL',
]) assert.equal(isNativeAuthCallback(url, redirect), false, url)

const mainSource = fs.readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8')
assert.match(mainSource, /skipRedirectCallback=\{nativeRuntime\}/)
assert.match(mainSource, /Native callbacks are consumed exactly once/)
console.log('Native Auth0 callback boundary checks passed.')
