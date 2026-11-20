import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const app = read('../src/App.tsx')
const main = read('../src/main.tsx')
const vault = read('../src/lib/walletVault.ts')
const config = read('../public/pdao-config.js')

if (!main.includes('cacheLocation="memory"')) {
  throw new Error('Auth0 must keep browser tokens in memory only')
}
if (!main.includes("scope: 'openid profile email'")) {
  throw new Error('Human Auth0 scope must remain limited to identity claims')
}
if (/fetch\([^)]*(?:phrase|passphrase|privateKey|secretKey)/i.test(app) || /fetch\([^)]*(?:phrase|passphrase|privateKey|secretKey)/i.test(vault)) {
  throw new Error('Recovery phrases, passphrases, and private keys must never be sent through fetch')
}
if (/loginWithRedirect\([^)]*(?:phrase|passphrase|privateKey|secretKey)/i.test(app)) {
  throw new Error('Wallet secrets must never enter Auth0 login')
}
if (!config.includes('enabled: false') || !config.includes('resourceId:')) {
  throw new Error('Descope agent access must remain explicitly disabled until scoped-token verification')
}
if (!app.includes('Human wallet sign-in stays with Auth0')) {
  throw new Error('The UI must keep human Auth0 and agent Descope responsibilities distinct')
}

console.log('security boundary checks passed')
