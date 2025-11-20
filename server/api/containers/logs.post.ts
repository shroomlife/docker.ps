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
    // Headers für Nginx Proxy Manager (NPM) SSE-Support
    setHeader(event, 'Content-Type', 'text/event-stream')
    setHeader(event, 'Cache-Control', 'no-cache')
    setHeader(event, 'Connection', 'keep-alive')
    setHeader(event, 'X-Accel-Buffering', 'no') // Wichtig: Deaktiviert NPM Buffering
    setHeader(event, 'Transfer-Encoding', 'chunked') // Wichtig: Ermöglicht Streaming
    setHeader(event, 'X-Content-Type-Options', 'nosniff') // Sicherheit

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
            try {
              controller.enqueue(new Uint8Array(chunk))
            }
            catch (error) {
              console.error('Error enqueueing chunk:', error)
              controller.error(error)
            }
          })

          response.data.on('end', () => {
            controller.close()
          })

          response.data.on('error', (error: Error) => {
            console.error('Stream error from agent:', error)
            try {
              const encoder = new TextEncoder()
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
            }
            catch (e) {
              console.error('Error sending error message:', e)
            }
            controller.close()
          })
        },
        cancel() {
          console.log('Stream cancelled by client')
          response.data.destroy()
        },
      })

      return readable
    }
    catch (error) {
      console.error('Failed to fetch logs:', error)
      throw createError({
        statusCode: 500,
      })
    }
  }
  else {
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
