import { getPublicKeyAsync } from '@noble/ed25519'
import bs58 from 'bs58'
import { mnemonicToSeed } from '@scure/bip39'
import { HDNodeWallet, type TransactionRequest } from 'ethers'
import { derivePath } from 'ed25519-hd-key'
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js'
import { checkRecoveryPhrase } from './mnemonic'

const databaseName = 'pdao-wallet-vault-v1'
const storeName = 'wallets'
const botSecretStoreName = 'bot-vault'
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

export type BotSecretRecord = {
  id: string
  label: string
  createdAt: number
  salt: string
  iv: string
  ciphertext: string
  format: 1
}

export type PreparedSolanaTransaction = {
  transactionBase64: string
  version: 'legacy' | 'v0'
  requiredSigners: string[]
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName, { keyPath: 'id' })
      if (!request.result.objectStoreNames.contains(botSecretStoreName)) request.result.createObjectStore(botSecretStoreName, { keyPath: 'id' })
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

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(buffer).set(bytes)
  return buffer
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
  try {
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
    return record
  } finally {
    plaintext.fill(0)
  }
}

async function decryptWalletPhrase(record: WalletRecord, passphrase: string): Promise<string> {
  let plaintext: Uint8Array | undefined
  let ciphertext: Uint8Array | undefined
  try {
    const [salt, iv] = [base64ToBytes(record.salt), base64ToBytes(record.iv)]
    const key = await deriveEncryptionKey(passphrase, salt)
    ciphertext = base64ToBytes(record.ciphertext)
    plaintext = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: copyToArrayBuffer(iv) }, key, copyToArrayBuffer(ciphertext)))
    const payload = JSON.parse(decoder.decode(plaintext)) as { phrase: string }
    if (typeof payload.phrase !== 'string' || !checkRecoveryPhrase(payload.phrase)) throw new Error('Invalid wallet payload.')
    return payload.phrase
  } catch {
    throw new Error('The passphrase did not unlock this wallet.')
  } finally {
    plaintext?.fill(0)
    ciphertext?.fill(0)
  }
}

export async function unlockWallet(record: WalletRecord, passphrase: string): Promise<string> {
  return decryptWalletPhrase(record, passphrase)
}

export async function signPreparedSolanaTransaction(
  record: WalletRecord,
  passphrase: string,
  prepared: PreparedSolanaTransaction,
  expectedPayer: string,
): Promise<string> {
  if (!prepared.transactionBase64 || !['legacy', 'v0'].includes(prepared.version)) {
    throw new Error('The provider returned an unsupported transaction format.')
  }
  if (!Array.isArray(prepared.requiredSigners) || !prepared.requiredSigners.includes(expectedPayer)) {
    throw new Error('The quoted wallet is not an authorized signer for this transaction.')
  }

  const phrase = await decryptWalletPhrase(record, passphrase)
  const mnemonicSeed = await mnemonicToSeed(phrase)
  const seedHex = Array.from(mnemonicSeed, byte => byte.toString(16).padStart(2, '0')).join('')
  const derivedSeed = derivePath("m/44'/501'/0'/0'", seedHex).key
  mnemonicSeed.fill(0)

  let signer: Keypair | undefined
  let signerSecret: Uint8Array | undefined
  try {
    signer = await Keypair.fromSeed(derivedSeed)
    signerSecret = signer.secretKey
    derivedSeed.fill(0)

    const address = signer.publicKey.toBase58()
    if (address !== record.solanaAddress || address !== expectedPayer) {
      throw new Error('The unlocked wallet does not match the selected payer address.')
    }

    const encoded = prepared.transactionBase64.trim()
    const wire = base64ToBytes(encoded)
    if (bytesToBase64(wire) !== encoded) throw new Error('The provider transaction is not canonical Base64.')

    if (prepared.version === 'legacy') {
      const transaction = Transaction.from(wire)
      const message = transaction.compileMessage()
      const required: string[] = message.accountKeys.slice(0, message.header.numRequiredSignatures).map(key => String(key.toBase58()))
      if (!required.includes(address) || !prepared.requiredSigners.every(key => required.includes(key))) {
        throw new Error('The transaction signer set does not match the provider review.')
      }
      await transaction.partialSign(signer)
      return bytesToBase64(await transaction.serialize({ requireAllSignatures: false, verifySignatures: true }))
    }

    const transaction = VersionedTransaction.deserialize(wire)
    if (transaction.version !== 0) throw new Error('Only legacy and version 0 transactions are supported for this payment.')
    const required = transaction.message.staticAccountKeys
      .slice(0, transaction.message.header.numRequiredSignatures)
      .map(key => String(key.toBase58()))
    if (!required.includes(address) || !prepared.requiredSigners.every(key => required.includes(key))) {
      throw new Error('The transaction signer set does not match the provider review.')
    }
    await transaction.sign([signer])
    return bytesToBase64(transaction.serialize())
  } finally {
    signerSecret?.fill(0)
    derivedSeed.fill(0)
  }
}

export async function signNativeEvmTransaction(record: WalletRecord, passphrase: string, transaction: TransactionRequest): Promise<string> {
  const phrase = await decryptWalletPhrase(record, passphrase)
  const signer = HDNodeWallet.fromPhrase(phrase, undefined, "m/44'/60'/0'/0/0")
  if (signer.address.toLowerCase() !== record.evmAddress.toLowerCase()) throw new Error('The unlocked wallet does not match the selected EVM address.')
  return signer.signTransaction(transaction)
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

export async function saveBotSecret(labelInput: string, secretInput: string, passphrase: string): Promise<BotSecretRecord> {
  const label = labelInput.trim()
  if (!label || !secretInput.trim()) throw new Error('Enter a name and a secret value.')
  if (passphrase.length < 12) throw new Error('Use a vault passphrase with at least 12 characters.')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveEncryptionKey(passphrase, salt)
  const plaintext = encoder.encode(secretInput)
  try {
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    const record: BotSecretRecord = {
      id: crypto.randomUUID(), label, createdAt: Date.now(),
      salt: bytesToBase64(salt), iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(new Uint8Array(ciphertext)), format: 1,
    }
    const database = await openDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(botSecretStoreName, 'readwrite')
      transaction.objectStore(botSecretStoreName).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not save the encrypted bot secret.'))
      transaction.onabort = () => reject(transaction.error ?? new Error('Bot vault storage was interrupted.'))
    }).finally(() => database.close())
    return record
  } finally {
    plaintext.fill(0)
  }
}

export async function listBotSecrets(): Promise<BotSecretRecord[]> {
  const database = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(botSecretStoreName, 'readonly').objectStore(botSecretStoreName).getAll()
    request.onsuccess = () => {
      const records = (request.result as BotSecretRecord[]).sort((a, b) => a.createdAt - b.createdAt)
      database.close()
      resolve(records)
    }
    request.onerror = () => { database.close(); reject(request.error ?? new Error('Could not read the encrypted bot vault.')) }
  })
}

export async function unlockBotSecret(record: BotSecretRecord, passphrase: string): Promise<string> {
  let plaintext: Uint8Array | undefined
  try {
    const salt = base64ToBytes(record.salt)
    const iv = base64ToBytes(record.iv)
    const key = await deriveEncryptionKey(passphrase, salt)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(iv).buffer }, key, new Uint8Array(base64ToBytes(record.ciphertext)).buffer)
    plaintext = new Uint8Array(decrypted)
    return decoder.decode(plaintext)
  } catch {
    throw new Error('The passphrase did not unlock this bot secret.')
  } finally {
    plaintext?.fill(0)
  }
}

export async function removeBotSecret(id: string): Promise<void> {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(botSecretStoreName, 'readwrite')
    transaction.objectStore(botSecretStoreName).delete(id)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the bot secret.'))
  }).finally(() => database.close())
}
