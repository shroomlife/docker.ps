import { isIP } from 'node:net'
import { lookup as dnsLookup } from 'node:dns/promises'

import { createError } from 'h3'

/**
 * SSRF guard for user-supplied Docker host URLs.
 *
 * Policy (OWASP-aligned, see ssrf-policy memory):
 * - Always: only http/https; always block cloud-metadata / link-local /
 *   unspecified addresses and metadata hostnames; re-classify IPv4-mapped IPv6;
 *   resolve hostnames and validate the resolved IPs (DNS-rebinding defense).
 * - Private/LAN (RFC1918, loopback, IPv6 ULA): allowed by default so self-host
 *   setups can manage agents on private networks; blocked only when the caller
 *   opts in via `blockPrivate` (multi-tenant SaaS hardening).
 */

export type IpCategory = 'always-blocked' | 'private' | 'public'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

// Hostnames that resolve to cloud metadata services — never a valid agent.
const BLOCKED_HOSTNAMES = new Set([
  'metadata.google.internal',
  'metadata.amazonaws.com',
])

interface ResolverOptions {
  /** Block RFC1918 / loopback / IPv6-ULA in addition to the always-on rules. */
  blockPrivate?: boolean
  /** Injectable resolver (defaults to DNS) — keeps the guard unit-testable. */
  resolveHostname?: (hostname: string) => Promise<string[]>
}

const parseIpv4Octets = (address: string): [number, number, number, number] | null => {
  const parts = address.split('.')
  if (parts.length !== 4) {
    return null
  }
  const octets = parts.map(part => Number(part))
  if (octets.some(octet => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return null
  }
  const [a = 0, b = 0, c = 0, d = 0] = octets
  return [a, b, c, d]
}

const classifyIpv4 = (address: string): IpCategory => {
  const octets = parseIpv4Octets(address)
  if (!octets) {
    return 'always-blocked'
  }
  const [a, b] = octets

  // "this host" (0.0.0.0/8) and link-local (169.254.0.0/16, incl. 169.254.169.254
  // cloud metadata) are never a legitimate agent target.
  if (a === 0 || (a === 169 && b === 254)) {
    return 'always-blocked'
  }

  // loopback + RFC1918 — legitimate for self-host, gated behind blockPrivate.
  if (a === 127) return 'private'
  if (a === 10) return 'private'
  if (a === 172 && b >= 16 && b <= 31) return 'private'
  if (a === 192 && b === 168) return 'private'

  return 'public'
}

const classifyIpv6 = (address: string): IpCategory => {
  const normalized = address.toLowerCase()

  // IPv4-mapped / -embedded (e.g. ::ffff:169.254.169.254) — classify the IPv4.
  if (normalized.includes('.')) {
    const tail = normalized.slice(normalized.lastIndexOf(':') + 1)
    if (isIP(tail) === 4) {
      return classifyIpv4(tail)
    }
  }

  if (normalized === '::') return 'always-blocked' // unspecified
  if (normalized === '::1') return 'private' // loopback
  if (/^fe[89ab]/.test(normalized)) return 'always-blocked' // link-local fe80::/10
  if (/^f[cd]/.test(normalized)) return 'private' // unique-local fc00::/7

  return 'public'
}

/** Pure classification of an IP literal — exported for unit testing. */
export const classifyIpAddress = (address: string): IpCategory => {
  switch (isIP(address)) {
    case 4: return classifyIpv4(address)
    case 6: return classifyIpv6(address)
    default: return 'always-blocked'
  }
}

const assertIpAllowed = (address: string, blockPrivate: boolean): void => {
  const category = classifyIpAddress(address)
  if (category === 'always-blocked') {
    throw createError({ statusCode: 400, statusMessage: 'Host URL targets a blocked address' })
  }
  if (category === 'private' && blockPrivate) {
    throw createError({ statusCode: 400, statusMessage: 'Host URL targets a private address' })
  }
}

const defaultResolveHostname = async (hostname: string): Promise<string[]> => {
  const records = await dnsLookup(hostname, { all: true })
  return records.map(record => record.address)
}

/**
 * Validate a user-supplied agent URL against the SSRF policy. Throws an h3 400
 * error on any violation. `resolveHostname` is injectable for tests.
 */
export const assertSafeAgentUrl = async (rawUrl: string, options: ResolverOptions = {}): Promise<void> => {
  const { blockPrivate = false, resolveHostname = defaultResolveHostname } = options

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid host URL' })
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw createError({ statusCode: 400, statusMessage: `Unsupported host URL scheme: ${parsed.protocol}` })
  }

  const hostname = parsed.hostname.toLowerCase()
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw createError({ statusCode: 400, statusMessage: 'Host URL is not allowed' })
  }

  // Validate the *resolved* address(es), not just the URL string, so a hostname
  // cannot smuggle a blocked target past us (DNS-rebinding defense).
  const addresses = isIP(hostname) === 0
    ? await resolveHostname(hostname)
    : [hostname]

  if (addresses.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Host URL could not be resolved' })
  }

  for (const address of addresses) {
    assertIpAllowed(address, blockPrivate)
  }
}

/** Convenience wrapper that reads the private-block policy from runtime config. */
export const assertSafeAgentUrlFromConfig = async (rawUrl: string): Promise<void> => {
  const { ssrfBlockPrivate } = useRuntimeConfig()
  await assertSafeAgentUrl(rawUrl, { blockPrivate: ssrfBlockPrivate })
}
