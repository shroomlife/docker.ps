import axios from 'axios'
import type { H3Event, EventHandlerRequest } from 'h3'

import type { DockerContainerLogsResponse } from '~~/shared/types/docker'
import { parseDockerLogEntries } from '~~/shared/utils/dockerLogs'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerContainerLogsResponse> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerLogsRequest

  if (!body.hostUuid || !body.containerId) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID and Container ID are required' })
  }

  const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

  const tail = body.tail ?? 1000

  // Build URL with query parameters
  const url = new URL(`/containers/${body.containerId}/logs`, dockerHost.url)
  url.searchParams.set('tail', tail.toString())

  // Non-streaming mode
  const logsResponse = await axios<{ logs: string[] }>({
    method: 'GET',
    url: url.toString(),
    headers: {
      'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
    },
  })

  return {
    logs: parseDockerLogEntries(logsResponse.data.logs, `poll-${body.containerId}`),
  }
})
