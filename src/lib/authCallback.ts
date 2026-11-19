/** Match only the configured native OAuth response; the SDK verifies transaction state and PKCE. */
export function isNativeAuthCallback(url: string, redirectUri: string): boolean {
  try {
    const incoming = new URL(url)
    const expected = new URL(redirectUri)
    return incoming.protocol === expected.protocol && incoming.host === expected.host
      && incoming.pathname === expected.pathname && !incoming.username && !incoming.password
      && !incoming.hash && Boolean(incoming.searchParams.get('state'))
      && Boolean(incoming.searchParams.get('code') || incoming.searchParams.get('error'))
  } catch {
    return false
  }
}
