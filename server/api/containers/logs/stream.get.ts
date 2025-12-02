import type { H3Event, EventHandlerRequest } from 'h3'
import { createEventStream } from 'h3'

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

  // Build URL for agent SSE endpoint
  const url = new URL(`/containers/${containerId}/logs/stream`, dockerHost.url)
  url.searchParams.set('tail', tail)

  // Set SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')
  setHeader(event, 'X-Accel-Buffering', 'no')

  // Create event stream for the client
  const eventStream = createEventStream(event)

  // Connect to agent SSE endpoint
  const controller = new AbortController()

  // Clean up on client disconnect
  event.node.req.on('close', () => {
    controller.abort()
    eventStream.close()
  })

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-auth-key': dockerHost.authKey,
        Accept: 'text/event-stream',
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

    // Read and forward SSE events
    const readStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            await eventStream.push('event: close\ndata: {"status":"stream_ended"}\n\n')
            break
          }

          const text = decoder.decode(value, { stream: true })
          // Forward raw SSE data directly
          await eventStream.push(text)
        }
      }
      catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('SSE stream error:', error)
          await eventStream.push(`event: error\ndata: ${JSON.stringify({ error: 'Stream error' })}\n\n`)
        }
      }
      finally {
        eventStream.close()
      }
    }

    // Start reading in background
    readStream()

    return eventStream.send()
  }
  catch (error) {
    if ((error as Error).name === 'AbortError') {
      return
    }
    console.error('Failed to connect to agent SSE:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to connect to Docker agent',
    })
  }
})
