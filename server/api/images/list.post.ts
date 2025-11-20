import axios from 'axios'
import type { ImageInfo } from 'dockerode'
import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerStoreImage[]> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerImageListRequest

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: body.hostUuid,
      userId: user.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  const remoteDockerImages = await axios<ImageInfo[]>({
    method: 'GET',
    url: new URL('/images', dockerHost.url).toString(),
    headers: {
      'x-auth-key': dockerHost.authKey,
    },
  })

  return remoteDockerImages.data
    .map((image: ImageInfo) => (DockerService.simplifyImageInfo(image)))
})

