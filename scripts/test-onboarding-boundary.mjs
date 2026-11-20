import fs from 'node:fs'

const source = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8')

if (/wallets\.map\(wallet => connectSolanaWallet\(wallet, true\)/.test(source)) {
  throw new Error('Wallet discovery must not trigger an authorization request')
}

for (const label of ['Continue with Google', 'Continue with email', 'Create a wallet', 'Restore a wallet', 'Connect a Web3 wallet']) {
  if (!source.includes(label)) throw new Error(`Missing onboarding choice: ${label}`)
}

console.log('onboarding boundary checks passed')
