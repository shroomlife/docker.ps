import type { H3Event, EventHandlerRequest } from 'h3'
import axios from 'axios'

import type { DockerContainerDetails } from '~~/shared/types/docker'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerContainerDetails> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerGetRequest
  if (!body.hostUuid || !body.containerId) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID and Container ID are required' })
  }

  const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

  const remoteDockerContainer = await axios({
    method: 'GET',
    url: new URL(`/containers/${body.containerId}`, dockerHost.url).toString(),
    headers: {
      'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
    },
  })

  return DockerService.simplifyContainerDetails(remoteDockerContainer.data)
})
