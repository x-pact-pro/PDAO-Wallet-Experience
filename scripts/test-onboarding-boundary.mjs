import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

if (/wallets\.map\(wallet => connectSolanaWallet\(wallet, true\)/.test(source)) {
  throw new Error('Wallet discovery must not trigger an authorization request')
}

const directLoginCalls = source.match(/loginWithRedirect\(/g) ?? []
if (directLoginCalls.length !== 1) {
  throw new Error(`All human sign-in entry points must use the single guarded helper (found ${directLoginCalls.length} calls)`)
}

if (!source.includes('authRequestInFlight.current')) {
  throw new Error('Human sign-in must have a duplicate-request guard')
}

if (!source.includes('id="main-content"') || !source.includes('className="skip-link"')) {
  throw new Error('Main content must expose a keyboard skip target')
}

for (const label of ['Continue with Google', 'Continue with email', 'Create a wallet', 'Restore a wallet', 'Connect a Web3 wallet']) {
  if (!source.includes(label)) throw new Error(`Missing onboarding choice: ${label}`)
}

console.log('onboarding boundary checks passed')
