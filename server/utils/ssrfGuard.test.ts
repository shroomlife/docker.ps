import { describe, expect, test } from 'vitest'

import { assertSafeAgentUrl, classifyIpAddress } from './ssrfGuard'

const captureAsyncError = async (fn: () => Promise<unknown>): Promise<Error | null> => {
  try {
    await fn()
    return null
  }
  catch (error) {
    return error instanceof Error ? error : new Error(String(error))
  }
}

// A resolver stub so hostname tests are deterministic (no real DNS).
const resolveTo = (...addresses: string[]) => async (): Promise<string[]> => addresses

describe('ssrfGuard: classifyIpAddress', () => {
  test('classifies cloud-metadata / link-local / unspecified as always-blocked', () => {
    expect(classifyIpAddress('169.254.169.254')).toBe('always-blocked')
    expect(classifyIpAddress('169.254.0.1')).toBe('always-blocked')
    expect(classifyIpAddress('0.0.0.0')).toBe('always-blocked')
    expect(classifyIpAddress('fe80::1')).toBe('always-blocked')
    expect(classifyIpAddress('::')).toBe('always-blocked')
  })

  test('re-classifies IPv4-mapped IPv6 by its embedded IPv4', () => {
    expect(classifyIpAddress('::ffff:169.254.169.254')).toBe('always-blocked')
    expect(classifyIpAddress('::ffff:192.168.1.10')).toBe('private')
    expect(classifyIpAddress('::ffff:8.8.8.8')).toBe('public')
  })

  test('classifies RFC1918 / loopback / ULA as private', () => {
    expect(classifyIpAddress('10.0.0.5')).toBe('private')
    expect(classifyIpAddress('172.16.0.1')).toBe('private')
    expect(classifyIpAddress('172.31.255.254')).toBe('private')
    expect(classifyIpAddress('192.168.1.10')).toBe('private')
    expect(classifyIpAddress('127.0.0.1')).toBe('private')
    expect(classifyIpAddress('::1')).toBe('private')
    expect(classifyIpAddress('fd00:ec2::254')).toBe('private')
  })

  test('classifies routable addresses as public', () => {
    expect(classifyIpAddress('8.8.8.8')).toBe('public')
    expect(classifyIpAddress('172.32.0.1')).toBe('public')
    expect(classifyIpAddress('2606:4700:4700::1111')).toBe('public')
  })
})

describe('ssrfGuard: assertSafeAgentUrl — always-on protections', () => {
  test('rejects non-http(s) schemes', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('file:///etc/passwd')) !== null).toBe(true)
    expect(await captureAsyncError(() => assertSafeAgentUrl('ftp://example.com')) !== null).toBe(true)
    expect(await captureAsyncError(() => assertSafeAgentUrl('not-a-url')) !== null).toBe(true)
  })

  test('blocks cloud-metadata IP literals regardless of policy', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://169.254.169.254/latest/meta-data/')) !== null).toBe(true)
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://169.254.169.254/', { blockPrivate: false })) !== null).toBe(true)
  })

  test('blocks metadata hostnames', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://metadata.google.internal/', { resolveHostname: resolveTo('8.8.8.8') })) !== null).toBe(true)
  })

  test('blocks a hostname that resolves to a metadata IP (DNS-rebinding defense)', async () => {
    const error = await captureAsyncError(() => assertSafeAgentUrl('https://sneaky.example.com/', { resolveHostname: resolveTo('169.254.169.254') }))
    expect(error !== null).toBe(true)
  })
})

describe('ssrfGuard: assertSafeAgentUrl — private/LAN policy', () => {
  test('allows private/LAN hosts by default (self-host friendly)', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('https://192.168.1.10:3000/'))).toBeNull()
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://10.0.0.5:3000/'))).toBeNull()
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://127.0.0.1:3000/'))).toBeNull()
  })

  test('blocks private/LAN hosts when blockPrivate is enabled (SaaS hardening)', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('https://192.168.1.10:3000/', { blockPrivate: true })) !== null).toBe(true)
    expect(await captureAsyncError(() => assertSafeAgentUrl('http://10.0.0.5:3000/', { blockPrivate: true })) !== null).toBe(true)
  })

  test('allows public destinations', async () => {
    expect(await captureAsyncError(() => assertSafeAgentUrl('https://agent.example.com/', { resolveHostname: resolveTo('203.0.113.10') }))).toBeNull()
    expect(await captureAsyncError(() => assertSafeAgentUrl('https://8.8.8.8/', { blockPrivate: true }))).toBeNull()
  })
})
