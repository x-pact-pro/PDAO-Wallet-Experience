/// <reference types="vite/client" />

interface Window {
  PDAO_CONFIG: {
    auth0: { enabled: boolean; environment: 'development' | 'staging' | 'production'; productionHostname: string; domain: string; clientId: string; nativeClientId: string; nativeRedirectUri: string; callbackPath: string; dockConnection: string }
    descope: { enabled: boolean; projectId: string; agentApiOrigin: string }
    web3auth: { enabled: boolean; clientId: string; network: 'sapphire_mainnet' | 'sapphire_devnet' }
    persona: { templateId: string; environmentId: string }
    marketData: { origin: string }
    walletApi: { origin: string }
  }
}
