import axios from 'axios'
import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>) => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerLogsRequest

  if (!body.hostUuid || !body.containerId) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID and Container ID are required' })
  }

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: body.hostUuid,
      userId: user.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  const follow = body.follow ?? false
  const tail = body.tail ?? 1000

  // Build URL with query parameters
  const url = new URL(`/containers/${body.containerId}/logs`, dockerHost.url)
  url.searchParams.set('tail', tail.toString())
  if (follow) {
    url.searchParams.set('follow', 'true')
  }

  if (follow) {
    // Streaming mode - proxy the SSE stream
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')

    try {
      const response = await axios({
        method: 'GET',
        url: url.toString(),
        headers: {
          'x-auth-key': dockerHost.authKey,
        },
        responseType: 'stream',
      })

      // Convert Node.js stream to Web ReadableStream
      const readable = new ReadableStream({
        start(controller) {
          response.data.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk))
          })

          response.data.on('end', () => {
            controller.close()
          })

          response.data.on('error', (error: Error) => {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
            controller.close()
          })
        },
        cancel() {
          response.data.destroy()
        },
      })

      return readable
    } catch (error: any) {
      throw createError({
        statusCode: error.response?.status || 500,
        statusMessage: error.response?.statusText || 'Failed to fetch logs',
      })
    }
  } else {
    // Non-streaming mode
    const logsResponse = await axios<{ logs: string[] }>({
      method: 'GET',
      url: url.toString(),
      headers: {
        'x-auth-key': dockerHost.authKey,
      },
    })

    return logsResponse.data
  }
})

