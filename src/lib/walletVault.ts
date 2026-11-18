import { getPublicKeyAsync } from '@noble/ed25519'
import bs58 from 'bs58'
import { mnemonicToSeed } from '@scure/bip39'
import { HDNodeWallet } from 'ethers'
import { derivePath } from 'ed25519-hd-key'
import { checkRecoveryPhrase } from './mnemonic'

const databaseName = 'pdao-wallet-vault-v1'
const storeName = 'wallets'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

export type WalletRecord = {
  id: string
  createdAt: number
  solanaAddress: string
  evmAddress: string
  salt: string
  iv: string
  ciphertext: string
  format: 1
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Could not open local wallet storage.'))
  })
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), character => character.charCodeAt(0))
}

async function deriveEncryptionKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase.normalize('NFKD')), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: new Uint8Array(salt).buffer, iterations: 310_000, hash: 'SHA-256' }, material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

async function deriveAddresses(phrase: string) {
  const seed = await mnemonicToSeed(phrase)
  const seedHex = Array.from(seed, byte => byte.toString(16).padStart(2, '0')).join('')
  const solanaSeed = derivePath("m/44'/501'/0'/0'", seedHex).key
  const solanaAddress = bs58.encode(await getPublicKeyAsync(solanaSeed))
  const evmAddress = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0/0").address
  return { solanaAddress, evmAddress }
}

export async function saveWallet(phraseInput: string, passphrase: string): Promise<WalletRecord> {
  const phrase = phraseInput.trim().split(/\s+/).join(' ').normalize('NFKD')
  if (!checkRecoveryPhrase(phrase)) throw new Error('That recovery phrase is not valid. Check the words and their order.')
  if (passphrase.length < 12) throw new Error('Choose an unlock passphrase with at least 12 characters.')
  const [addresses, salt, iv] = await Promise.all([
    deriveAddresses(phrase),
    crypto.getRandomValues(new Uint8Array(16)),
    crypto.getRandomValues(new Uint8Array(12)),
  ])
  const key = await deriveEncryptionKey(passphrase, salt)
  const plaintext = encoder.encode(JSON.stringify({ phrase }))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  const record: WalletRecord = {
    id: crypto.randomUUID(), createdAt: Date.now(), ...addresses,
    salt: bytesToBase64(salt), iv: bytesToBase64(iv), ciphertext: bytesToBase64(new Uint8Array(ciphertext)), format: 1,
  }
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).put(record)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the encrypted wallet.'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Wallet storage was interrupted.'))
  }).finally(() => database.close())
  plaintext.fill(0)
  return record
}

export async function unlockWallet(record: WalletRecord, passphrase: string): Promise<string> {
  try {
    const [salt, iv] = [base64ToBytes(record.salt), base64ToBytes(record.iv)]
    const key = await deriveEncryptionKey(passphrase, salt)
    const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv).buffer }, key, new Uint8Array(base64ToBytes(record.ciphertext)).buffer)
    const payload = JSON.parse(decoder.decode(plaintext)) as { phrase: string }
    return payload.phrase
  } catch {
    throw new Error('The passphrase did not unlock this wallet.')
  }
}

export async function listWallets(): Promise<WalletRecord[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, 'readonly').objectStore(storeName).getAll()
    request.onsuccess = () => {
      const wallets = (request.result as WalletRecord[]).sort((a, b) => a.createdAt - b.createdAt)
      database.close()
      resolve(wallets)
    }
    request.onerror = () => { database.close(); reject(request.error ?? new Error('Could not read local wallet storage.')) }
  })
}

export async function removeWallet(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite')
    transaction.objectStore(storeName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove wallet.'))
  }).finally(() => database.close())
}
