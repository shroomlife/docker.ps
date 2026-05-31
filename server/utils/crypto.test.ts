import { describe, expect, test } from 'vitest'

import { decryptSecret, encryptSecret, isEncryptedSecret } from './crypto'

// Arbitrary fake key for unit tests only — never a real secret.
const masterKey = 'unit-test-master-key-not-a-real-secret-0123456789abcdef'

// The project's typed `expect` surface intentionally exposes only a few matchers
// (see shared/utils/dockerLogs.test.ts), so we assert throws via a typed helper
// instead of `.toThrow()`.
const captureError = (fn: () => unknown): Error | null => {
  try {
    fn()
    return null
  }
  catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
}

describe('crypto: encryptSecret / decryptSecret (AES-256-GCM)', () => {
  test('round-trips a secret value', () => {
    const plaintext = 'docker_ps_8f3a2b1c'
    const token = encryptSecret(plaintext, masterKey)

    expect(decryptSecret(token, masterKey)).toBe(plaintext)
  })

  test('produces a versioned token that is not the plaintext', () => {
    const plaintext = 'super-secret-key'
    const token = encryptSecret(plaintext, masterKey)

    expect(token.startsWith('v1.')).toBe(true)
    expect(token.includes(plaintext)).toBe(false)
    // versioned blob format: v1.<salt>.<iv>.<tag>.<ciphertext>
    expect(token.split('.')).toHaveLength(5)
  })

  test('encrypting the same plaintext twice yields different tokens (random salt + IV)', () => {
    const plaintext = 'repeatable-input'

    const first = encryptSecret(plaintext, masterKey)
    const second = encryptSecret(plaintext, masterKey)

    expect(first === second).toBe(false)
    expect(decryptSecret(first, masterKey)).toBe(plaintext)
    expect(decryptSecret(second, masterKey)).toBe(plaintext)
  })

  test('decrypting a tampered ciphertext throws (auth tag verification)', () => {
    const token = encryptSecret('integrity-protected', masterKey)
    const parts = token.split('.')
    // flip a byte in the decoded ciphertext so the GCM auth tag no longer verifies
    const ciphertextBytes = Buffer.from(parts[4] ?? '', 'base64')
    ciphertextBytes[0] = (ciphertextBytes[0] ?? 0) ^ 0xff
    parts[4] = ciphertextBytes.toString('base64')
    const tampered = parts.join('.')

    expect(captureError(() => decryptSecret(tampered, masterKey)) !== null).toBe(true)
  })

  test('decrypting with the wrong key throws', () => {
    const token = encryptSecret('only-for-the-right-key', masterKey)

    expect(captureError(() => decryptSecret(token, 'a-completely-different-master-key')) !== null).toBe(true)
  })

  test('round-trips unicode and empty strings', () => {
    for (const value of ['', '🔐 äöü — ßﬄ', 'a'.repeat(1024)]) {
      expect(decryptSecret(encryptSecret(value, masterKey), masterKey)).toBe(value)
    }
  })

  test('rejects malformed tokens', () => {
    expect(captureError(() => decryptSecret('not-a-valid-token', masterKey)) !== null).toBe(true)
    expect(captureError(() => decryptSecret('v2.a.b.c.d', masterKey)) !== null).toBe(true)
  })

  test('refuses to operate without a master key (fail fast, no weak key)', () => {
    const token = encryptSecret('x', masterKey)

    const encryptError = captureError(() => encryptSecret('x', ''))
    expect(encryptError !== null).toBe(true)
    expect((encryptError?.message ?? '').toLowerCase().includes('master key')).toBe(true)

    const decryptError = captureError(() => decryptSecret(token, ''))
    expect(decryptError !== null).toBe(true)
    expect((decryptError?.message ?? '').toLowerCase().includes('master key')).toBe(true)
  })
})

describe('crypto: isEncryptedSecret', () => {
  test('detects values produced by encryptSecret', () => {
    expect(isEncryptedSecret(encryptSecret('x', masterKey))).toBe(true)
  })

  test('treats legacy plaintext authKeys as not encrypted', () => {
    expect(isEncryptedSecret('docker_ps_8f3a2b1c9d')).toBe(false)
    expect(isEncryptedSecret('')).toBe(false)
  })
})
