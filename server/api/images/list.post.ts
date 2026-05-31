import axios from 'axios'
import type { ImageInfo } from 'dockerode'
import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerStoreImage[]> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerImageListRequest

  const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

  const remoteDockerImages = await axios<ImageInfo[]>({
    method: 'GET',
    url: new URL('/images', dockerHost.url).toString(),
    headers: {
      'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
    },
  })

  return remoteDockerImages.data
    .map((image: ImageInfo) => (DockerService.simplifyImageInfo(image)))
})
