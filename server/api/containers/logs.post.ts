import axios from 'axios'
import type { H3Event, EventHandlerRequest } from 'h3'
import http from 'http'
import https from 'https'

// Create keep-alive agents
const httpAgent = new http.Agent({ keepAlive: true, timeout: 0 })
const httpsAgent = new https.Agent({ keepAlive: true, timeout: 0 })

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
      console.log(`[Server] Fetching logs from agent: ${url.toString()}`)

      // Use axios with stream responseType for better Node.js stream handling
      const response = await axios({
        method: 'GET',
        url: url.toString(),
        headers: {
          'x-auth-key': dockerHost.authKey,
        },
        responseType: 'stream',
        timeout: 0, // No timeout for streaming
        httpAgent,
        httpsAgent,
        // Prevent axios from closing the connection
        maxRedirects: 0,
        validateStatus: status => status === 200,
      })

      console.log(`[Server] Agent response status: ${response.status} ${response.statusText}`)
      console.log(`[Server] Agent response headers:`, response.headers)
      console.log(`[Server] Response data type: ${response.data?.constructor?.name ?? 'null'}`)

      if (response.status !== 200) {
        throw new Error(`Agent responded with status ${response.status}`)
      }

      if (!response.data) {
        throw new Error('No response data from agent')
      }

      console.log('[Server] Stream from agent started, proxying...')

      // Convert Node.js stream to Web ReadableStream
      let chunkCount = 0
      const nodeStream = response.data

      // Check stream state before setting up handlers
      console.log(`[Server] Stream readable: ${nodeStream.readable}, readableEnded: ${nodeStream.readableEnded}, readableFlowing: ${nodeStream.readableFlowing}`)

      // Ensure stream is flowing
      if (nodeStream.readableFlowing === null) {
        console.log('[Server] Stream is paused, resuming...')
        nodeStream.resume()
      }

      return new ReadableStream({
        start(controller) {
          console.log('[Server] ReadableStream start() called, setting up Node.js stream handlers...')
          console.log(`[Server] Stream state at start: readable=${nodeStream.readable}, readableEnded=${nodeStream.readableEnded}, readableFlowing=${nodeStream.readableFlowing}`)

          // Check if stream already ended
          if (nodeStream.readableEnded) {
            console.log('[Server] Stream already ended when setting up handlers')
            controller.close()
            return
          }

          nodeStream.on('data', (chunk: Buffer) => {
            try {
              chunkCount++
              if (chunkCount === 1) {
                console.log(`[Server] First chunk from agent, size: ${chunk.length} bytes`)
              }
              if (chunkCount % 10 === 0) {
                console.log(`[Server] Processed ${chunkCount} chunks so far`)
              }
              controller.enqueue(new Uint8Array(chunk))
            }
            catch (error) {
              console.error(`[Server] Error enqueueing chunk ${chunkCount}:`, error)
              controller.error(error)
            }
          })

          nodeStream.on('end', () => {
            console.log(`[Server] Stream from agent ended after ${chunkCount} chunks (end event)`)
            controller.close()
          })

          nodeStream.on('error', (error: Error) => {
            const errorMessage = error.message || 'Unknown error'
            const errorCode = 'code' in error ? (error as { code?: string }).code : undefined

            // Handle "aborted" errors more gracefully - these often indicate network issues
            // but don't necessarily mean the stream should be closed
            if (errorCode === 'ECONNRESET' || errorCode === 'EPIPE' || errorMessage === 'aborted') {
              console.warn(`[Server] Stream connection issue (${errorCode || errorMessage}), but continuing...`)
              // Don't close the controller - let it try to recover or wait for end event
              return
            }

            console.error('[Server] Stream error from agent:', error)
            const encoder = new TextEncoder()
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
            }
            catch (e) {
              console.error('[Server] Error sending error message:', e)
            }
            controller.close()
          })

          // Ensure stream is flowing
          if (nodeStream.readableFlowing === false) {
            console.log('[Server] Stream is paused, resuming in start()...')
            nodeStream.resume()
          }

          // Check if stream already ended after a short delay (to catch immediate ends)
          setTimeout(() => {
            if (nodeStream.readableEnded && chunkCount === 0) {
              console.log('[Server] Stream ended immediately after setup (no chunks received)')
            }
          }, 100)
        },
        cancel(reason) {
          console.log(`[Server] Stream cancelled by client, reason:`, reason)
          if (nodeStream.destroy) {
            nodeStream.destroy()
          }
        },
      })
    }
    catch (error) {
      console.error('Failed to fetch logs:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Return an error as SSE message
      const encoder = new TextEncoder()
      return new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
          controller.close()
        },
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
