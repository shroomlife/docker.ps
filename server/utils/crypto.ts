import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

/**
 * Authenticated symmetric encryption for secrets at rest (e.g. DockerHost.authKey).
 *
 * Format (versioned, dot-separated base64 — '.' never occurs in base64):
 *   v1.<salt>.<iv>.<authTag>.<ciphertext>
 *
 * - AES-256-GCM (authenticated → tamper detection on decrypt)
 * - scrypt KDF derives the data key from the master key + per-record random salt
 * - fresh random 12-byte IV per encryption (GCM nonce uniqueness requirement)
 */

const VERSION = 'v1'
const SALT_BYTES = 16
const IV_BYTES = 12
const KEY_BYTES = 32

const assertMasterKey = (masterKey: string): void => {
  if (!masterKey) {
    throw new Error('Cannot (de)crypt secret: master key is empty (set NUXT_SECRET_KEY)')
  }
}

const deriveKey = (masterKey: string, salt: Buffer): Buffer =>
  scryptSync(masterKey, salt, KEY_BYTES)

export const encryptSecret = (plaintext: string, masterKey: string): string => {
  assertMasterKey(masterKey)
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(masterKey, salt)

  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [
    VERSION,
    salt.toString('base64'),
    iv.toString('base64'),
    authTag.toString('base64'),
    ciphertext.toString('base64'),
  ].join('.')
}

export const decryptSecret = (token: string, masterKey: string): string => {
  assertMasterKey(masterKey)
  const parts = token.split('.')
  const [version, saltB64, ivB64, tagB64, ciphertextB64] = parts
  if (
    parts.length !== 5
    || version !== VERSION
    || saltB64 === undefined
    || ivB64 === undefined
    || tagB64 === undefined
    || ciphertextB64 === undefined
  ) {
    throw new Error('Cannot decrypt secret: malformed or unsupported token')
  }

  const salt = Buffer.from(saltB64, 'base64')
  const iv = Buffer.from(ivB64, 'base64')
  const authTag = Buffer.from(tagB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const key = deriveKey(masterKey, salt)

  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  // .final() throws if the auth tag does not verify (wrong key or tampered data)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}

/**
 * Cheap structural check used by the backfill to tell encrypted tokens apart
 * from legacy plaintext authKeys. Does not attempt decryption.
 */
export const isEncryptedSecret = (value: string): boolean => {
  if (!value.startsWith(`${VERSION}.`)) {
    return false
  }
  return value.split('.').length === 5
}
