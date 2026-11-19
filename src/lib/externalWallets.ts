import { getWallets } from '@wallet-standard/app'
import type { Wallet, WalletAccount } from '@wallet-standard/base'
import { StandardConnect, StandardDisconnect } from '@wallet-standard/features'
import { SolanaSignTransaction } from '@solana/wallet-standard-features'
import { Transaction, VersionedTransaction } from '@solana/web3.js'

export type Eip1193Provider = {
  request(args: { method: string; params?: unknown[] | object }): Promise<unknown>
  on?: (event: string, listener: (...args: unknown[]) => void) => void
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void
}

export type EvmProviderInfo = { uuid: string; name: string; icon: string; rdns: string }
export type EvmProviderOption = { info: EvmProviderInfo; provider: Eip1193Provider }
export type ConnectedExternalWallet =
  | { id: string; chain: 'solana'; name: string; address: string; icon: string; wallet: Wallet; account: WalletAccount }
  | { id: string; chain: 'evm'; name: string; address: string; icon: string; chainId: string; provider: Eip1193Provider }

export function discoverSolanaWallets(): readonly Wallet[] {
  return getWallets().get()
}

export function onSolanaWalletsChanged(listener: (wallets: readonly Wallet[]) => void): () => void {
  const wallets = getWallets()
  const offRegister = wallets.on('register', () => listener(wallets.get()))
  const offUnregister = wallets.on('unregister', () => listener(wallets.get()))
  return () => {
    offRegister()
    offUnregister()
  }
}

export async function connectSolanaWallet(wallet: Wallet, silent = false): Promise<ConnectedExternalWallet> {
  const connect = wallet.features[StandardConnect] as { connect?: (input?: { silent?: boolean }) => Promise<{ accounts: readonly WalletAccount[] }> } | undefined
  if (typeof connect?.connect !== 'function') throw new Error(`${wallet.name} does not expose the standard wallet connection feature.`)
  const result = await connect.connect(silent ? { silent: true } : {})
  const account = result.accounts.find(candidate => candidate.chains.some(chain => chain.startsWith('solana:')))
  if (!account) throw new Error(`${wallet.name} did not authorize a Solana account.`)
  if (!account.address) throw new Error(`${wallet.name} returned an empty account address.`)
  return { id: `solana:${wallet.name}:${account.address}`, chain: 'solana', name: wallet.name, address: account.address, icon: account.icon ?? wallet.icon, wallet, account }
}

export async function disconnectSolanaWallet(wallet: Wallet): Promise<void> {
  const disconnect = wallet.features[StandardDisconnect] as { disconnect?: () => Promise<void> } | undefined
  if (typeof disconnect?.disconnect === 'function') await disconnect.disconnect()
}

function decodeBase64(value: string): Uint8Array {
  const clean = value.trim()
  const bytes = Uint8Array.from(atob(clean), character => character.charCodeAt(0))
  if (btoa(String.fromCharCode(...bytes)) !== clean) throw new Error('The provider transaction is not canonical Base64.')
  return bytes
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export async function signWithExternalSolanaWallet(
  connected: Extract<ConnectedExternalWallet, { chain: 'solana' }>,
  prepared: { transactionBase64: string; version: 'legacy' | 'v0'; requiredSigners: string[] },
): Promise<string> {
  const feature = connected.wallet.features[SolanaSignTransaction] as {
    supportedTransactionVersions?: readonly ('legacy' | 0 | 1)[]
    signTransaction?: (input: { account: WalletAccount; transaction: Uint8Array; chain?: string }) => Promise<readonly { signedTransaction: Uint8Array }[]>
  } | undefined
  if (typeof feature?.signTransaction !== 'function') throw new Error(`${connected.name} cannot sign this Solana transaction through Wallet Standard.`)
  if (!prepared.requiredSigners.includes(connected.address)) throw new Error('The connected account is not an authorized signer in this provider transaction.')

  const wire = decodeBase64(prepared.transactionBase64)
  let originalMessage: Uint8Array
  let requiredSigners: string[]
  if (prepared.version === 'legacy') {
    const transaction = Transaction.from(wire)
    const message = transaction.compileMessage()
    originalMessage = message.serialize()
    requiredSigners = message.accountKeys.slice(0, message.header.numRequiredSignatures).map(key => key.toBase58())
  } else {
    const transaction = VersionedTransaction.deserialize(wire)
    if (transaction.version !== 0) throw new Error('The provider returned an unsupported Solana transaction version.')
    originalMessage = transaction.message.serialize()
    requiredSigners = transaction.message.staticAccountKeys.slice(0, transaction.message.header.numRequiredSignatures).map(key => key.toBase58())
  }
  if (!requiredSigners.includes(connected.address) || prepared.requiredSigners.some(signer => !requiredSigners.includes(signer))) {
    throw new Error('The transaction signer set does not match the provider review.')
  }
  const chain = connected.account.chains.find(value => value === 'solana:mainnet') ?? 'solana:mainnet'
  const [signed] = await feature.signTransaction({ account: connected.account, transaction: wire, chain })
  if (!signed?.signedTransaction) throw new Error(`${connected.name} did not return a signed transaction.`)

  let signedMessage: Uint8Array
  let payerSignature: Uint8Array | null | undefined
  if (prepared.version === 'legacy') {
    const transaction = Transaction.from(signed.signedTransaction)
    signedMessage = transaction.compileMessage().serialize()
    payerSignature = transaction.signatures.find(item => item.publicKey.toBase58() === connected.address)?.signature
  } else {
    const transaction = VersionedTransaction.deserialize(signed.signedTransaction)
    if (transaction.version !== 0) throw new Error(`${connected.name} returned a different transaction version.`)
    signedMessage = transaction.message.serialize()
    const payerIndex = transaction.message.staticAccountKeys.findIndex(key => key.toBase58() === connected.address)
    payerSignature = payerIndex >= 0 ? transaction.signatures[payerIndex] : undefined
  }
  if (!sameBytes(originalMessage, signedMessage)) throw new Error('The wallet changed the transaction after it was prepared. Nothing was submitted.')
  if (!payerSignature || payerSignature.every(byte => byte === 0)) throw new Error(`${connected.name} did not sign the selected account in this transaction.`)
  return encodeBase64(signed.signedTransaction)
}

export function discoverEvmWallets(listener: (option: EvmProviderOption) => void): () => void {
  const seen = new Set<string>()
  const announce = (event: Event) => {
    const detail = (event as CustomEvent<EvmProviderOption>).detail
    if (!detail?.provider || !detail.info?.uuid || seen.has(detail.info.uuid)) return
    seen.add(detail.info.uuid)
    listener(detail)
  }
  window.addEventListener('eip6963:announceProvider', announce)
  window.dispatchEvent(new Event('eip6963:requestProvider'))
  const fallback = (window as Window & { ethereum?: Eip1193Provider & { isMetaMask?: boolean } }).ethereum
  if (fallback && !seen.has('injected-default')) {
    seen.add('injected-default')
    listener({ info: { uuid: 'injected-default', name: 'Browser wallet', icon: '', rdns: 'injected.provider' }, provider: fallback })
  }
  return () => window.removeEventListener('eip6963:announceProvider', announce)
}

export async function connectEvmWallet(option: EvmProviderOption): Promise<ConnectedExternalWallet> {
  const accounts = await option.provider.request({ method: 'eth_requestAccounts' })
  const address = Array.isArray(accounts) ? accounts.find(value => typeof value === 'string') : undefined
  if (typeof address !== 'string' || !/^0x[\da-f]{40}$/i.test(address)) throw new Error(`${option.info.name} did not authorize a valid EVM account.`)
  const chainId = await option.provider.request({ method: 'eth_chainId' })
  return { id: `evm:${option.info.uuid}:${address}`, chain: 'evm', name: option.info.name, address, icon: option.info.icon, chainId: String(chainId), provider: option.provider }
}

export async function getExistingEvmAccount(option: EvmProviderOption): Promise<Extract<ConnectedExternalWallet, { chain: 'evm' }> | null> {
  try {
    const accounts = await option.provider.request({ method: 'eth_accounts' })
    const address = Array.isArray(accounts) ? accounts.find(value => typeof value === 'string') : undefined
    if (typeof address !== 'string' || !/^0x[\da-f]{40}$/i.test(address)) return null
    const chainId = await option.provider.request({ method: 'eth_chainId' })
    return { id: `evm:${option.info.uuid}:${address}`, chain: 'evm', name: option.info.name, address, icon: option.info.icon, chainId: String(chainId), provider: option.provider }
  } catch { return null }
}
