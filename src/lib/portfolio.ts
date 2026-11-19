export type PortfolioNetwork = 'solana-mainnet' | 'ethereum-mainnet'
export type PortfolioBalance = {
  network: PortfolioNetwork
  symbol: 'SOL' | 'ETH'
  amount: string | null
  addresses: number
  checked: number
  observedAt: string
  error?: string
}

const RPCS: Record<PortfolioNetwork, readonly string[]> = {
  'solana-mainnet': ['https://api.mainnet.solana.com', 'https://solana-rpc.publicnode.com'],
  'ethereum-mainnet': ['https://cloudflare-eth.com', 'https://ethereum-rpc.publicnode.com'],
}

async function rpc<T>(network: PortfolioNetwork, method: string, params: unknown[]): Promise<T> {
  let lastError: Error | undefined
  for (const endpoint of RPCS[network]) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method, params }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`${network} RPC returned HTTP ${response.status}.`)
      const body = await response.json() as { result?: T; error?: { message?: string } }
      if (body.error || body.result === undefined) throw new Error(body.error?.message ?? `${network} RPC returned no balance.`)
      return body.result
    } catch (reason) { lastError = reason instanceof Error ? reason : new Error('Network request failed.') }
  }
  throw lastError ?? new Error(`${network} RPC is unavailable.`)
}

async function readLamports(address: string): Promise<bigint> {
  let lastError: Error | undefined
  for (const endpoint of RPCS['solana-mainnet']) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: crypto.randomUUID(), method: 'getBalance', params: [address, { commitment: 'confirmed' }] }),
        signal: AbortSignal.timeout(12_000),
      })
      if (!response.ok) throw new Error(`solana-mainnet RPC returned HTTP ${response.status}.`)
      const payload = await response.text()
      const error = payload.match(/"error"\s*:\s*\{[^}]*"message"\s*:\s*"([^"]*)"/)
      if (error) throw new Error(error[1])
      const value = payload.match(/"value"\s*:\s*(\d+)/)
      if (!value) throw new Error('Solana RPC returned no balance.')
      return BigInt(value[1])
    } catch (reason) { lastError = reason instanceof Error ? reason : new Error('Network request failed.') }
  }
  throw lastError ?? new Error('solana-mainnet RPC is unavailable.')
}

function units(raw: bigint, decimals: number, precision = 6): string {
  const scale = 10n ** BigInt(decimals)
  const whole = raw / scale
  const fraction = (raw % scale).toString().padStart(decimals, '0').slice(0, precision).replace(/0+$/, '')
  return fraction ? `${whole}.${fraction}` : whole.toString()
}

async function readNetwork(network: PortfolioNetwork, addressesInput: string[]): Promise<PortfolioBalance | null> {
  const addresses = [...new Set(addressesInput.filter(Boolean))]
  if (!addresses.length) return null
  const results = await Promise.allSettled(addresses.map(async address => {
    if (network === 'solana-mainnet') {
      return readLamports(address)
    }
    const result = await rpc<string>(network, 'eth_getBalance', [address, 'latest'])
    if (!/^0x[0-9a-f]+$/i.test(result)) throw new Error('RPC returned an invalid wei balance.')
    return BigInt(result)
  }))
  const successful = results.filter((result): result is PromiseFulfilledResult<bigint> => result.status === 'fulfilled')
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  const rawTotal = successful.reduce((sum, result) => sum + result.value, 0n)
  const message = failures[0]?.reason instanceof Error ? failures[0].reason.message : 'A network request failed.'
  return {
    network,
    symbol: network === 'solana-mainnet' ? 'SOL' : 'ETH',
    amount: successful.length ? units(rawTotal, network === 'solana-mainnet' ? 9 : 18) : null,
    addresses: addresses.length,
    checked: successful.length,
    observedAt: new Date().toISOString(),
    ...(failures.length ? { error: successful.length ? `${failures.length} of ${addresses.length} addresses could not be read.` : message } : {}),
  }
}

export async function readPortfolioBalances(input: { solana: string[]; ethereum: string[] }): Promise<PortfolioBalance[]> {
  const results = await Promise.all([
    readNetwork('solana-mainnet', input.solana),
    readNetwork('ethereum-mainnet', input.ethereum),
  ])
  return results.filter((result): result is PortfolioBalance => result !== null)
}
