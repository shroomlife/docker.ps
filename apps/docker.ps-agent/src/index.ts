import { Elysia } from 'elysia'
import type { Container, ContainerInfo, ContainerInspectInfo, Image, ImageInfo, ImageInspectInfo } from 'dockerode'
import Dockerode from 'dockerode'
import { randomBytes, createHash } from 'crypto'
import { rmSync, watch } from 'fs'
import { join } from 'path'
import { mkdir } from 'node:fs/promises'

const keyPrefix = 'docker_ps'

const keyStringLength = keyPrefix.length + 1 + 128
const isProduction = process.env.NODE_ENV === 'production'
const authKeyFilePath = join(process.cwd(), 'data', '_auth.key')
const headerKeyName = 'x-auth-key'

const getDockerAPI = (): Dockerode => {
  console.info(`🔧 Initializing Dockerode in ${isProduction ? 'Production' : 'Development'} Mode`)
  if (isProduction) {
    return new Dockerode({ socketPath: '/var/run/docker.sock' })
  }
  return new Dockerode({ protocol: 'http', host: 'localhost', port: 2375 })
}

const removeAuthKeyFileAndSendError = (message: string): void => {
  console.error(message)
  rmSync(authKeyFilePath)
  console.error('The existing Auth Key file has been deleted. Please restart the application to generate a new one.')
  process.exit(1)
}

const getOrCreateAuthKey = async (): Promise<string> => {
  try {
    await mkdir(join(process.cwd(), 'data'), { recursive: true })

    const isKeyFileExisting = await Bun.file(authKeyFilePath).exists()
    if (isKeyFileExisting) {
      const existingKey = (await Bun.file(authKeyFilePath).text()).trim()
      console.log('✅ Found Auth Key File')

      if (existingKey.length !== keyStringLength) {
        removeAuthKeyFileAndSendError('❌ Auth Key has invalid length.')
      }

      if (!existingKey.startsWith(keyPrefix)) {
        removeAuthKeyFileAndSendError('❌ Auth Key is missing required prefix.')
      }
      return existingKey
    }

    const randomPart = randomBytes(64).toString('hex')
    const newKey = [keyPrefix, randomPart].join('_')
    await Bun.write(authKeyFilePath, newKey)
    console.log('✅ Auth Key file created successfully')
    return newKey
  }
  catch (error) {
    console.error('There was an error while creating or using the Auth Key')
    console.error('Detailed Error: ', error)
    process.exit(1)
  }
}

try {
  const DockerAPI = getDockerAPI()
  await DockerAPI.ping()
  console.log('✅ Successfully connected to Docker Daemon')

  const authKey = await getOrCreateAuthKey()
  console.info('🔑 Your Auth Key: \x1b[1m' + authKey + '\x1b[0m')

  watch(authKeyFilePath, async () => {
    console.warn('Auth Key file has been changed externally. Service will terminate for security reasons.')
    process.exit(1)
  })

  const app = new Elysia()
    .onRequest(async ({ request, status }) => {
      const providedKey = request.headers.get(headerKeyName)
      if (!providedKey) {
        return status(401)
      }
      const providedKeyHash = createHash('sha256').update(providedKey).digest('hex')
      const validKeyHash = createHash('sha256').update(authKey).digest('hex')
      if (providedKeyHash !== validKeyHash) {
        return status(401)
      }
    })

    // Route to Check if Server is Running
    .get('/', async ({ status }) => {
      return status(200)
    })

    // Route to List all Containers
    .get('/containers', async (): Promise<ContainerInfo[]> => {
      console.info('📦 Fetching List of Containers', new Date().toISOString())
      return await DockerAPI.listContainers({ all: true })
    })

    // Route to Get Details of a Specific Container
    .get('/containers/:id', async ({ params }): Promise<ContainerInspectInfo> => {
      console.info(`📦 Fetching Details of Container ${params.id}`, new Date().toISOString())
      const container: Container = DockerAPI.getContainer(params.id)
      return await container.inspect()
    })

    .get('/containers/:id/pause', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.pause()
      return await container.inspect()
    })

    .get('/containers/:id/unpause', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.unpause()
      return await container.inspect()
    })

    .get('/containers/:id/start', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.start()
      return await container.inspect()
    })

    .get('/containers/:id/stop', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.stop()
      return await container.inspect()
    })

    .get('/containers/:id/restart', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.restart()
      return await container.inspect()
    })

    .get('/containers/:id/remove', async ({ params }) => {
      const container = DockerAPI.getContainer(params.id)
      await container.remove({ force: true })
      return { message: `Container ${params.id} has been removed.` }
    })

    // Route to Get Container Logs (with streaming support)
    .get('/containers/:id/logs', async ({ params, query, set }) => {
      const container = DockerAPI.getContainer(params.id)
      const tail = parseInt((query.tail as string) || '1000', 10)
      const follow = query.follow === 'true'

      console.info(`📋 Fetching Logs of Container ${params.id}`, new Date().toISOString())

      if (follow) {
        // Streaming mode with Server-Sent Events
        set.headers = {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }

        // When follow is true, container.logs returns a Node.js stream (not Web ReadableStream)
        console.log(`[Agent] Requesting Docker logs with follow=true, tail=${tail}`)
        const nodeStream = await container.logs({
          stdout: true,
          stderr: true,
          follow: true,
          tail: tail,
          timestamps: true,
        }) as NodeJS.ReadableStream

        console.log(`[Agent] Got Docker log stream (Node.js stream), converting to Web ReadableStream...`)
        const streamInfo = nodeStream as NodeJS.ReadableStream & { readable?: boolean }
        console.log(`[Agent] Stream type: ${nodeStream.constructor.name}, readable: ${streamInfo.readable ?? 'unknown'}`)

        // Convert Node.js stream to Web ReadableStream
        return new Response(
          new ReadableStream({
            start(controller) {
              console.log(`[Agent] ReadableStream start() called for container ${params.id}`)
              const encoder = new TextEncoder()
              const decoder = new TextDecoder()

              let buffer = ''
              let chunkCount = 0
              let lastActivity = Date.now()

              // Keep-alive mechanism
              const pingInterval = setInterval(() => {
                if (Date.now() - lastActivity > 15000) { // Send ping if no activity for 15s
                  try {
                    controller.enqueue(encoder.encode(': ping\n\n'))
                    lastActivity = Date.now()
                  }
                  catch (err) {
                    console.error(`[Agent] Error sending ping for container ${params.id}:`, err)
                    clearInterval(pingInterval)
                  }
                }
              }, 5000)

              // Handle Node.js stream events
              nodeStream.on('data', (chunk: Buffer) => {
                try {
                  lastActivity = Date.now()
                  chunkCount++
                  if (chunkCount === 1) {
                    console.log(`[Agent] First chunk from Docker stream, size: ${chunk.length} bytes`)
                  }

                  const text = decoder.decode(chunk, { stream: true })
                  buffer += text

                  // Process complete lines (ending with \n)
                  const lines = buffer.split('\n')
                  // Keep the last incomplete line in buffer
                  buffer = lines.pop() || ''

                  // Process each complete line
                  const linesProcessed = lines.filter(line => line.trim()).length
                  if (linesProcessed > 0) {
                    console.log(`[Agent] Processing ${linesProcessed} log lines from chunk ${chunkCount}`)
                  }
                  for (const line of lines) {
                    if (line.trim()) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`))
                    }
                  }

                  if (chunkCount % 10 === 0) {
                    console.log(`[Agent] Processed ${chunkCount} chunks so far`)
                  }
                }
                catch (error) {
                  console.error(`[Agent] Error processing chunk ${chunkCount}:`, error)
                }
              })

              nodeStream.on('end', () => {
                clearInterval(pingInterval)
                console.log(`[Agent] Docker stream ended for container ${params.id}, processed ${chunkCount} chunks`)
                // Flush any remaining data in the decoder's internal buffer
                const remaining = decoder.decode(new Uint8Array(), { stream: false })
                if (remaining) {
                  buffer += remaining
                }
                // Process any remaining buffered lines
                if (buffer.trim()) {
                  const lines = buffer.split('\n').filter(line => line.trim())
                  for (const line of lines) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line })}\n\n`))
                  }
                }
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ line: '[Log stream ended]' })}\n\n`))
                controller.close()
              })

              nodeStream.on('error', (error: Error) => {
                clearInterval(pingInterval)
                console.error(`[Agent] Docker stream error for container ${params.id}:`, error)
                const errorMessage = error.message || 'Unknown error'
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
                controller.close()
              })

              // Ensure stream is flowing
              const streamWithFlow = nodeStream as NodeJS.ReadableStream & { readableFlowing?: boolean | null, resume?: () => void }
              if (streamWithFlow.readableFlowing === null || streamWithFlow.readableFlowing === false) {
                console.log(`[Agent] Resuming Docker stream...`)
                if (streamWithFlow.resume) {
                  streamWithFlow.resume()
                }
              }
            },
            cancel(reason) {
              // Clear interval can't be accessed here because it's scoped to start()
              // But since the stream is closed, subsequent enqueue calls will fail and clear it

              console.log(`[Agent] Stream cancelled for container ${params.id}, reason:`, reason)
              // Clean up the Docker stream when client disconnects
              const streamWithDestroy = nodeStream as NodeJS.ReadableStream & { destroy?: (error?: Error) => void }
              if (streamWithDestroy.destroy) {
                try {
                  streamWithDestroy.destroy()
                }
                catch (err) {
                  console.error(`[Agent] Error destroying Docker stream:`, err)
                }
              }
            },
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          },
        )
      }
      else {
        // Non-streaming mode - return all logs at once
        // When follow is false, container.logs returns Promise<Buffer>
        const logsBuffer = await container.logs({
          stdout: true,
          stderr: true,
          follow: false,
          tail: tail,
          timestamps: true,
        })

        const logText = logsBuffer.toString()
        const logLines = logText.split('\n').filter(line => line.trim())

        return { logs: logLines.slice(-tail) }
      }
    })

    // Route to Download Container Logs (raw, all logs without tail limit)
    .get('/containers/:id/logs/download', async ({ params, set }) => {
      const container = DockerAPI.getContainer(params.id)

      console.info(`📥 Downloading raw logs of Container ${params.id}`, new Date().toISOString())

      // Get all logs without tail limit - this returns raw buffer
      const logsBuffer = await container.logs({
        stdout: true,
        stderr: true,
        follow: false,
        timestamps: true,
      }) as Buffer

      // Decode Docker log stream format
      // Docker log format: [STREAM_TYPE (1 byte)][RESERVED (3 bytes)][SIZE (4 bytes)][PAYLOAD]
      const decodedLines: string[] = []
      let offset = 0

      while (offset < logsBuffer.length) {
        if (offset + 8 > logsBuffer.length) {
          break // Not enough bytes for header
        }

        // Read header (8 bytes)
        // Stream type at offset: 0x01 = stdout, 0x02 = stderr (not currently used)
        // Skip reserved bytes (offset + 1, 2, 3)

        // Read size (4 bytes, big-endian)
        const size = logsBuffer.readUInt32BE(offset + 4)

        offset += 8 // Move past header

        if (offset + size > logsBuffer.length) {
          break // Not enough bytes for payload
        }

        // Extract payload
        const payload = logsBuffer.subarray(offset, offset + size)
        const line = payload.toString('utf-8')
        decodedLines.push(line)

        offset += size
      }

      // Join all lines with newlines
      const rawLogs = decodedLines.join('')

      // Return raw logs as text/plain
      set.headers = {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="logs-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.log"`,
      }

      return rawLogs
    })

    // Route to List all Images
    .get('/images', async (): Promise<ImageInfo[]> => {
      console.info('🖼️ Fetching List of Images', new Date().toISOString())
      return await DockerAPI.listImages({ all: true })
    })

    // Route to Get Details of a Specific Image
    .get('/images/:id', async ({ params }): Promise<ImageInspectInfo> => {
      console.info(`🖼️ Fetching Details of Image ${params.id}`, new Date().toISOString())
      const image: Image = DockerAPI.getImage(params.id)
      return await image.inspect()
    })

    // Route to Remove an Image
    .get('/images/:id/remove', async ({ params }) => {
      console.info(`🖼️ Removing Image ${params.id}`, new Date().toISOString())
      const image = DockerAPI.getImage(params.id)
      await image.remove({ force: true })
      return { message: `Image ${params.id} has been removed.` }
    })

    .listen(3000)

  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
  )
}
catch (error) {
  console.error('There was an Error while connecting to Docker Daemon')
  console.error('Please make sure that the Docker Daemon is running and that the socket is mounted correctly.')
  console.error('Mount the socket with "-v /var/run/docker.sock:/var/run/docker.sock"')
  console.error('Detailed Error: ', error)
  process.exit(1)
}
