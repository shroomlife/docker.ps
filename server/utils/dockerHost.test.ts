import { describe, expect, test } from 'vitest'

import { encryptSecret } from './crypto'
import { resolveStoredAuthKey } from './dockerHost'

// Arbitrary fake key for unit tests only — never a real secret.
const masterKey = 'unit-test-master-key-not-a-real-secret-0123456789abcdef'

describe('dockerHost: resolveStoredAuthKey (tolerant decrypt)', () => {
  test('decrypts a value produced by encryptSecret', () => {
    const plaintext = 'docker_ps_8f3a2b1c9d'
    const stored = encryptSecret(plaintext, masterKey)

    expect(resolveStoredAuthKey(stored, masterKey)).toBe(plaintext)
  })

  test('passes legacy plaintext authKeys through unchanged', () => {
    const legacy = 'docker_ps_legacy_plaintext_key_value'

    expect(resolveStoredAuthKey(legacy, masterKey)).toBe(legacy)
  })

  test('round-trips: encrypt then resolve returns the original', () => {
    for (const value of ['docker_ps_abc', '🔐 äöü key', 'x'.repeat(256)]) {
      expect(resolveStoredAuthKey(encryptSecret(value, masterKey), masterKey)).toBe(value)
    }
  })

  test('treats an empty stored value as plaintext (returns empty)', () => {
    expect(resolveStoredAuthKey('', masterKey)).toBe('')
  })
})
