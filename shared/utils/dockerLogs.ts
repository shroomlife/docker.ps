import stripAnsi from 'strip-ansi'

import type { DockerContainerLogEntry } from '../types/docker'

const dockerTimestampPattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\s?(.*)$/
const dockerHeaderLength = 8
const dockerHeaderTypes = new Set([1, 2])

let logIdCounter = 0

const formatDatePart = (value: number): string => value.toString().padStart(2, '0')

const hashString = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const isDockerControlCharacter = (charCode: number): boolean => {
  return charCode >= 0 && charCode <= 8
}

const hasDockerStreamHeader = (value: string): boolean => {
  return value.length >= dockerHeaderLength
    && dockerHeaderTypes.has(value.charCodeAt(0))
    && value.charCodeAt(1) === 0
    && value.charCodeAt(2) === 0
    && value.charCodeAt(3) === 0
}

export const createDockerLogIdPrefix = (prefix = 'log'): string => {
  return `${prefix}-${Date.now().toString(36)}-${logIdCounter++}`
}

export const normalizeDockerLogTimestamp = (value: string | null | undefined): string | null => {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) {
    return null
  }

  return parsed.toISOString()
}

export const formatDockerLogTimestamp = (value: string | null | undefined): string => {
  const normalized = normalizeDockerLogTimestamp(value)
  if (!normalized) {
    return ''
  }

  const parsed = new Date(normalized)
  return [
    parsed.getFullYear(),
    formatDatePart(parsed.getMonth() + 1),
    formatDatePart(parsed.getDate()),
  ].join('-') + ` ${[
    formatDatePart(parsed.getHours()),
    formatDatePart(parsed.getMinutes()),
    formatDatePart(parsed.getSeconds()),
  ].join(':')}`
}

export const stripDockerStreamHeader = (value: string): string => {
  if (!value) {
    return ''
  }

  let output = value
  if (hasDockerStreamHeader(output)) {
    output = output.slice(dockerHeaderLength)
  }

  while (output.length > 0 && isDockerControlCharacter(output.charCodeAt(0))) {
    output = output.slice(1)
  }

  let sanitizedOutput = ''
  for (const character of output) {
    if (!isDockerControlCharacter(character.charCodeAt(0))) {
      sanitizedOutput += character
    }
  }

  return sanitizedOutput
}

export const extractDockerLogTimestamp = (value: string): string | null => {
  const normalized = stripDockerStreamHeader(value).replace(/\r$/, '')
  const match = normalized.match(dockerTimestampPattern)
  return normalizeDockerLogTimestamp(match?.[1] ?? null)
}

export const parseDockerLogEntry = (
  rawLine: string,
  idPrefix = createDockerLogIdPrefix(),
  index = 0,
): DockerContainerLogEntry | null => {
  if (!rawLine || typeof rawLine !== 'string') {
    return null
  }

  const sanitizedRaw = stripDockerStreamHeader(rawLine).replace(/\r$/, '').trimEnd()
  if (!sanitizedRaw.trim()) {
    return null
  }

  const match = sanitizedRaw.match(dockerTimestampPattern)
  const timestamp = normalizeDockerLogTimestamp(match?.[1] ?? null)
  const messageSource = match?.[2] ?? sanitizedRaw
  const message = stripAnsi(messageSource).trimEnd()

  if (!message.trim()) {
    return null
  }

  const fingerprint = hashString(`${timestamp ?? 'no-ts'}|${sanitizedRaw}`)

  return {
    id: `${idPrefix}-${index}-${fingerprint}`,
    timestamp,
    timestampLabel: formatDockerLogTimestamp(timestamp),
    message,
    raw: sanitizedRaw,
    fingerprint,
  }
}

export const parseDockerLogEntries = (
  rawLines: string[],
  idPrefix = createDockerLogIdPrefix('batch'),
): DockerContainerLogEntry[] => {
  return rawLines
    .map((line, index) => parseDockerLogEntry(line, idPrefix, index))
    .filter((entry): entry is DockerContainerLogEntry => entry !== null)
}

export const appendDockerLogEntries = (
  existingEntries: DockerContainerLogEntry[],
  incomingEntries: DockerContainerLogEntry[],
  maxEntries = 2000,
): DockerContainerLogEntry[] => {
  if (incomingEntries.length === 0) {
    return existingEntries.slice(-maxEntries)
  }

  return existingEntries.concat(incomingEntries).slice(-maxEntries)
}

export const mergeDockerLogEntries = (
  existingEntries: DockerContainerLogEntry[],
  incomingEntries: DockerContainerLogEntry[],
  maxEntries = 2000,
): DockerContainerLogEntry[] => {
  if (existingEntries.length === 0) {
    return incomingEntries.slice(-maxEntries)
  }

  if (incomingEntries.length === 0) {
    return existingEntries.slice(-maxEntries)
  }

  const maxOverlap = Math.min(existingEntries.length, incomingEntries.length)
  let overlapCount = 0

  for (let overlapLength = maxOverlap; overlapLength > 0; overlapLength--) {
    const existingSlice = existingEntries.slice(-overlapLength)
    const incomingSlice = incomingEntries.slice(0, overlapLength)

    const isMatch = existingSlice.every((entry, index) => {
      const incomingEntry = incomingSlice[index]
      return entry?.fingerprint === incomingEntry?.fingerprint
        && entry?.raw === incomingEntry?.raw
    })

    if (isMatch) {
      overlapCount = overlapLength
      break
    }
  }

  return existingEntries
    .concat(incomingEntries.slice(overlapCount))
    .slice(-maxEntries)
}
