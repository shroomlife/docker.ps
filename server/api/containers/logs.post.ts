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

  const tail = body.tail ?? 1000
  const since = body.since ?? 0

  // Build URL with query parameters
  const url = new URL(`/containers/${body.containerId}/logs`, dockerHost.url)
  url.searchParams.set('tail', tail.toString())
  url.searchParams.set('since', since.toString())

  // Non-streaming mode
  const logsResponse = await axios<{ logs: string[] }>({
    method: 'GET',
    url: url.toString(),
    headers: {
      'x-auth-key': dockerHost.authKey,
    },
  })

  return logsResponse.data
})
