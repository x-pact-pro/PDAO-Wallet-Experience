import type { ConnectedExternalWallet, Eip1193Provider } from './externalWallets'

type EmbeddedConnection = {
  ethereumProvider?: Eip1193Provider | null
  solanaWallet?: {
    name?: string
    icon?: string
    accounts?: Array<{ address: string; chains?: string[]; icon?: string }>
    features?: Record<string, unknown>
    chains?: readonly string[]
  } | null
}

let web3auth: any = null
let initialized = false

/**
 * Connects the optional Web3Auth embedded wallet in the browser/device.
 * Only public accounts and provider handles return to the app; no private key
 * or recovery material is read from the SDK.
 */
export async function connectEmbeddedWallet(): Promise<ConnectedExternalWallet[]> {
  if (!window.PDAO_CONFIG.web3auth.enabled || !window.PDAO_CONFIG.web3auth.clientId) {
    throw new Error('Embedded wallet sign-in is not configured for this release.')
  }
  if (!web3auth) {
    const module = await import('@web3auth/modal')
    web3auth = new module.Web3Auth({
      clientId: window.PDAO_CONFIG.web3auth.clientId,
      web3AuthNetwork: module.WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
      modalConfig: { hideWalletDiscovery: true },
    })
  }
  if (!initialized) {
    await web3auth.init()
    initialized = true
  }
  const connection = await web3auth.connect() as EmbeddedConnection | null
  if (!connection) throw new Error('Embedded wallet connection was cancelled.')

  const result: ConnectedExternalWallet[] = []
  const solanaWallet = connection.solanaWallet
  const solanaAccount = solanaWallet?.accounts?.find(account => account.address)
  if (solanaWallet && solanaAccount) {
    result.push({
      id: `embedded:solana:${solanaAccount.address}`,
      chain: 'solana',
      name: 'PrivateDAO embedded wallet',
      address: solanaAccount.address,
      icon: solanaAccount.icon ?? solanaWallet.icon ?? '',
      wallet: solanaWallet as never,
      account: solanaAccount as never,
    })
  }

  const provider = connection.ethereumProvider
  if (provider) {
    const accounts = await provider.request({ method: 'eth_accounts' })
    const address = Array.isArray(accounts) ? accounts.find(value => typeof value === 'string' && /^0x[\da-f]{40}$/i.test(value)) : undefined
    if (typeof address === 'string') {
      const chainId = await provider.request({ method: 'eth_chainId' })
      result.push({
        id: `embedded:evm:${address}`,
        chain: 'evm',
        name: 'PrivateDAO embedded wallet',
        address,
        icon: `${import.meta.env.BASE_URL}assets/PrivateDAO_Symbol_Vector_Reconstructed.svg`,
        chainId: String(chainId),
        provider,
      })
    }
  }

  if (!result.length) throw new Error('The embedded wallet did not return a public account.')
  return result
}
