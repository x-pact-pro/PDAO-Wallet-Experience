import { generateMnemonic, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'

export function createRecoveryPhrase(): string {
  return generateMnemonic(wordlist, 128)
}

export function checkRecoveryPhrase(phrase: string): boolean {
  return validateMnemonic(phrase.trim().normalize('NFKD'), wordlist)
}
