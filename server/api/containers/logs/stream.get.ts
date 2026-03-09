import type { H3Event, EventHandlerRequest } from 'h3'
import { createEventStream } from 'h3'

import { createDockerLogIdPrefix, parseDockerLogEntry } from '~~/shared/utils/dockerLogs'

interface ParsedSseEvent {
  event: string
  data: string
}

const serializeSseEvent = (eventName: string, payload: unknown): string => {
  const data = typeof payload === 'string'
    ? payload
    : JSON.stringify(payload)

  return `event: ${eventName}\ndata: ${data}\n\n`
}

const parseSseBlock = (block: string): ParsedSseEvent | null => {
  const lines = block.split('\n')
  let eventName = 'message'
  const dataLines: string[] = []

  for (const line of lines) {
    if (!line || line.startsWith(':')) {
      continue
    }

    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim() || 'message'
      continue
    }

    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (dataLines.length === 0) {
    return null
  }

  return {
    event: eventName,
    data: dataLines.join('\n'),
  }
}

const parseSsePayload = (payload: string): unknown => {
  try {
    return JSON.parse(payload)
  }
  catch {
    return payload
  }
}

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
  const user = await AuthService.getUserOrFail(event)
  const query = getQuery(event)

  const hostUuid = query.hostUuid as string
  const containerId = query.containerId as string
  const tail = query.tail as string || '100'

  if (!hostUuid || !containerId) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID and Container ID are required' })
  }

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: hostUuid,
      userId: user.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  const url = new URL(`/containers/${containerId}/logs/stream`, dockerHost.url)
  url.searchParams.set('tail', tail)

  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  const eventStream = createEventStream(event)
  const controller = new AbortController()
  const idPrefix = createDockerLogIdPrefix(`stream-${containerId}`)
  let logIndex = 0

  event.node.req.on('close', () => {
    controller.abort()
    eventStream.close()
  })

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-auth-key': dockerHost.authKey,
        'accept': 'text/event-stream',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        statusMessage: `Agent error: ${response.statusText}`,
      })
    }

    if (!response.body) {
      throw createError({ statusCode: 500, statusMessage: 'No response body from agent' })
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    const handleBlock = async (block: string) => {
      const parsedEvent = parseSseBlock(block)
      if (!parsedEvent) {
        return
      }

      if (parsedEvent.event === 'log') {
        const payload = parseSsePayload(parsedEvent.data) as { log?: string }
        if (!payload.log) {
          return
        }

        const normalizedLog = parseDockerLogEntry(payload.log, idPrefix, logIndex++)
        if (!normalizedLog) {
          return
        }

        await eventStream.push(serializeSseEvent('log', normalizedLog))
        return
      }

      await eventStream.push(serializeSseEvent(parsedEvent.event, parseSsePayload(parsedEvent.data)))
    }

    const readStream = async () => {
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (buffer.trim()) {
              await handleBlock(buffer)
            }
            break
          }

          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')

          let separatorIndex = buffer.indexOf('\n\n')
          while (separatorIndex !== -1) {
            const block = buffer.slice(0, separatorIndex)
            buffer = buffer.slice(separatorIndex + 2)
            await handleBlock(block)
            separatorIndex = buffer.indexOf('\n\n')
          }
        }
      }
      catch (streamError) {
        if ((streamError as Error).name !== 'AbortError') {
          console.error('SSE stream error:', streamError)
          await eventStream.push(serializeSseEvent('error', { error: 'Stream error' }))
        }
      }
      finally {
        eventStream.close()
      }
    }

    void readStream()

    return eventStream.send()
  }
  catch (streamError) {
    if ((streamError as Error).name === 'AbortError') {
      return
    }

    console.error('Failed to connect to agent SSE:', streamError)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to connect to Docker agent',
    })
  }
})
