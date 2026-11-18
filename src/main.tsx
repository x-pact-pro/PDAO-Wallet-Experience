import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
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

const auth0 = window.PDAO_CONFIG.auth0
const callbackUri = `${window.location.origin}${auth0.callbackPath}`

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Auth0Provider
      domain={auth0.domain}
      clientId={auth0.clientId}
      cacheLocation="memory"
      authorizationParams={{ redirect_uri: callbackUri, scope: 'openid profile email' }}
      onRedirectCallback={appState => {
        window.history.replaceState({}, document.title, appState?.returnTo ?? '/')
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)
