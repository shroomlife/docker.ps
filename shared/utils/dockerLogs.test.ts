import { describe, expect, test } from 'bun:test'

import {
  appendDockerLogEntries,
  createDockerLogIdPrefix,
  extractDockerLogTimestamp,
  mergeDockerLogEntries,
  parseDockerLogEntry,
  parseDockerLogEntries,
  stripDockerStreamHeader,
} from './dockerLogs'

describe('dockerLogs helpers', () => {
  test('strips docker stream header and ANSI sequences', () => {
    const rawLine = '\u0001\u0000\u0000\u0000\u0000\u0000\u0000*2026-03-09T20:15:10.123456789Z \u001B[31mhello world\u001B[39m'
    const entry = parseDockerLogEntry(rawLine, createDockerLogIdPrefix('test'))

    expect(stripDockerStreamHeader(rawLine)).toBe('2026-03-09T20:15:10.123456789Z \u001B[31mhello world\u001B[39m')
    expect(entry).not.toBeNull()
    expect(entry?.timestamp).toBe('2026-03-09T20:15:10.123Z')
    expect(entry?.timestampLabel).toBe('2026-03-09 20:15:10')
    expect(entry?.message).toBe('hello world')
  })

  test('extracts timestamps when present and returns null otherwise', () => {
    expect(extractDockerLogTimestamp('2026-03-09T20:15:10.123Z started')).toBe('2026-03-09T20:15:10.123Z')
    expect(extractDockerLogTimestamp('plain log line')).toBeNull()
  })

  test('append preserves repeated identical log lines', () => {
    const line = '2026-03-09T20:15:10.123Z repeated'
    const first = parseDockerLogEntries([line], 'existing')
    const second = parseDockerLogEntries([line], 'incoming')

    const appended = appendDockerLogEntries(first, second, 10)

    expect(appended).toHaveLength(2)
    expect(appended[0]?.fingerprint).toBe(appended[1]?.fingerprint)
  })

  test('overlap merge avoids duplicating backfill blocks', () => {
    const existing = parseDockerLogEntries([
      '2026-03-09T20:15:10.123Z A',
      '2026-03-09T20:15:11.123Z B',
      '2026-03-09T20:15:12.123Z C',
    ], 'existing')

    const incoming = parseDockerLogEntries([
      '2026-03-09T20:15:11.123Z B',
      '2026-03-09T20:15:12.123Z C',
      '2026-03-09T20:15:13.123Z D',
    ], 'incoming')

    const merged = mergeDockerLogEntries(existing, incoming, 10)

    expect(merged.map(entry => entry.message)).toEqual(['A', 'B', 'C', 'D'])
  })

  test('same raw line yields a stable fingerprint across parsing passes', () => {
    const first = parseDockerLogEntry('2026-03-09T20:15:10.123Z stable', 'first', 0)
    const second = parseDockerLogEntry('2026-03-09T20:15:10.123Z stable', 'second', 0)

    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    expect(first?.fingerprint).toBe(second?.fingerprint)
    expect(first?.id).not.toBe(second?.id)
  })
})
