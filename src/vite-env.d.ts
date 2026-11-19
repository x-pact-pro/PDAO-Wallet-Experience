/// <reference types="vite/client" />

interface Window {
  PDAO_CONFIG: {
    auth0: { enabled: boolean; domain: string; clientId: string; callbackPath: string; dockConnection: string }
    descope: { enabled: boolean; projectId: string; agentApiOrigin: string }
    persona: { templateId: string; environmentId: string }
    persona: { templateId: string; environmentId: string }
    marketData: { origin: string }
  }
}
