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
if (!source.includes("sessionStorage.setItem('pdao-entered', '1')\n    setWelcome(false)")) {
  throw new Error('A completed Auth0 session must leave the onboarding screen without another sign-in action')
}

if (!source.includes('id="main-content"') || !source.includes('className="skip-link"')) {
  throw new Error('Main content must expose a keyboard skip target')
}

for (const label of ['Continue with Google', 'Continue with email', 'Create a wallet', 'Restore a wallet', 'Connect a Web3 wallet']) {
  if (!source.includes(label)) throw new Error(`Missing onboarding choice: ${label}`)
}

const welcomeWiring = source.match(/if \(welcome\) return <Welcome[\s\S]*?\/>/)?.[0] ?? ''
if (!welcomeWiring.includes("onGoogle={() => startHumanSignIn('google-oauth2')}")) {
  throw new Error('Google onboarding must use the guarded Auth0 sign-in helper')
}
if (!welcomeWiring.includes("onEmail={() => startHumanSignIn('email')}")) {
  throw new Error('Email onboarding must use the guarded Auth0 sign-in helper')
}
for (const localEntry of ['onCreateWallet={() => enter(\'wallet\')}', 'onRestoreWallet={() => enter(\'wallet\')}', 'onConnectWeb3={() => enter(\'wallet\')}']) {
  if (!welcomeWiring.includes(localEntry)) throw new Error(`Wallet onboarding must not require Auth0: ${localEntry}`)
}
if (/on(?:CreateWallet|RestoreWallet|ConnectWeb3)=\{\(\) => startHumanSignIn/.test(welcomeWiring)) {
  throw new Error('Wallet onboarding must never trigger human sign-in')
}

console.log('onboarding boundary checks passed')
