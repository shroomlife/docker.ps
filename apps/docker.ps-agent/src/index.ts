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

        // When follow is true, container.logs returns Promise<ReadableStream>
        // The ReadableStream from dockerode is a Web ReadableStream
        const logStream = await container.logs({
          stdout: true,
          stderr: true,
          follow: true,
          tail: tail,
          timestamps: true,
        }) as unknown as ReadableStream<Uint8Array>

        return new Response(
          new ReadableStream({
            async start(controller) {
              const encoder = new TextEncoder()
              const reader = logStream.getReader()
              const decoder = new TextDecoder()

              try {
                let buffer = ''
                let chunkCount = 0
                while (true) {
                  const { done, value } = await reader.read()
                  if (done) {
                    console.log(`[Agent] Stream ended for container ${params.id}, processed ${chunkCount} chunks`)
                    // Flush any remaining data in the decoder's internal buffer
                    // by decoding an empty buffer with stream: false
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
                    break
                  }

                  chunkCount++
                  const text = decoder.decode(value, { stream: true })
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
                }
              }
              catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error'
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`))
                controller.close()
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
