import type { ImageInspectInfo } from 'dockerode'
import type { H3Event, EventHandlerRequest } from 'h3'
import axios from 'axios'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<ImageInspectInfo> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerImageGetRequest
  if (!body.hostUuid || !body.imageId) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID and Image ID are required' })
  }

  const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

  const remoteDockerImage = await axios<ImageInspectInfo>({
    method: 'GET',
    url: new URL(`/images/${body.imageId}`, dockerHost.url).toString(),
    headers: {
      'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
    },
  })

  return remoteDockerImage.data
})
