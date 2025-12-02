import axios from 'axios'
import type { H3Event, EventHandlerRequest } from 'h3'
import moment from 'moment'

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

  // Build URL for download endpoint
  const url = new URL(`/containers/${body.containerId}/logs/download`, dockerHost.url)

  try {
    const response = await axios({
      method: 'GET',
      url: url.toString(),
      headers: {
        'x-auth-key': dockerHost.authKey,
      },
      responseType: 'text',
      timeout: 300000, // 5 minutes timeout for large log files
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      validateStatus: (status) => status >= 200 && status < 300,
    })

    // Check if response contains an error (from agent)
    if (typeof response.data === 'object' && response.data !== null && 'error' in response.data) {
      throw createError({
        statusCode: 500,
        statusMessage: response.data.error || 'Failed to download logs from agent',
      })
    }

    // Generate filename with timestamp
    const timestamp = moment().format('YYYY-MM-DDTHH-mm-ss')
    const filename = `logs-${timestamp}.log`

    // Set headers for file download
    setHeader(event, 'Content-Type', 'text/plain')
    setHeader(event, 'Content-Disposition', `attachment; filename="${filename}"`)

    return response.data
  }
  catch (error) {
    console.error('Failed to download logs:', error)

    // Handle axios errors with more detail
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw createError({
          statusCode: 504,
          statusMessage: 'Download timeout - log file is too large',
        })
      }
      if (error.response) {
        throw createError({
          statusCode: error.response.status || 500,
          statusMessage: error.response.statusText || 'Failed to download logs from agent',
        })
      }
      if (error.request) {
        throw createError({
          statusCode: 503,
          statusMessage: 'Agent is not reachable',
        })
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to download logs',
    })
  }
})

