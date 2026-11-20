import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider, useAuth0 } from '@auth0/auth0-react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import '@fontsource/playfair-display/400.css'
import '@fontsource/playfair-display/400-italic.css'
import './index.css'
import App from './App.tsx'
import { isNativeAuthCallback } from './lib/authCallback'

const auth0 = window.PDAO_CONFIG.auth0
const nativeRuntime = Capacitor.isNativePlatform()
const callbackUri = nativeRuntime
  ? auth0.nativeRedirectUri
  : `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`

function NativeAuthRedirectHandler() {
  const { handleRedirectCallback } = useAuth0()
  const lastCallback = useRef('')
  useEffect(() => {
    if (!nativeRuntime) return
    let active = true
    const handle = async (url: string) => {
      if (!isNativeAuthCallback(url, auth0.nativeRedirectUri) || lastCallback.current === url) return
      lastCallback.current = url
      try {
        await handleRedirectCallback(url)
      } catch (error) {
        const detail = error && typeof error === 'object'
          ? error as { error?: string; error_description?: string }
          : undefined
        window.dispatchEvent(new CustomEvent('pdao-auth-error', {
          detail: {
            code: detail?.error ?? '',
            description: detail?.error_description ?? '',
          },
        }))
      } finally {
        await Browser.close().catch(() => undefined)
      }
    }
    const listener = CapacitorApp.addListener('appUrlOpen', ({ url }) => { if (active) void handle(url) })
    void CapacitorApp.getLaunchUrl().then(result => { if (active && result?.url) void handle(result.url) }).catch(() => undefined)
    return () => {
      active = false
      void listener.then(item => item.remove())
    }
  }, [handleRedirectCallback])
  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0.domain}
      clientId={nativeRuntime ? auth0.nativeClientId : auth0.clientId}
      cacheLocation="memory"
      useRefreshTokens={nativeRuntime}
      authorizationParams={{ redirect_uri: callbackUri, scope: 'openid profile email' }}
      onRedirectCallback={appState => {
        window.history.replaceState({}, document.title, appState?.returnTo ?? (import.meta.env.BASE_URL === './' ? '/' : import.meta.env.BASE_URL))
      }}
    >
      <NativeAuthRedirectHandler />
      <App />
    </Auth0Provider>
  </StrictMode>,
)
