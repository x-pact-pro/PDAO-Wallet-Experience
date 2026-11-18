/// <reference types="vite/client" />

interface Window {
  PDAO_CONFIG: {
    auth0: { enabled: boolean; domain: string; clientId: string; callbackPath: string }
    descope: { enabled: boolean; projectId: string; agentApiOrigin: string }
    marketData: { origin: string }
  }
}
