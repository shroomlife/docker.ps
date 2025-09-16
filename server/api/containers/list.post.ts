import axios from 'axios'
import type { ContainerInfo } from 'dockerode'
import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerStoreContainer[]> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerListRequest

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: body.hostUuid,
      userId: user.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  const remoteDockerContainers = await axios<ContainerInfo[]>({
    method: 'GET',
    url: new URL('/containers', dockerHost.url).toString(),
    headers: {
      'x-auth-key': dockerHost.authKey,
    },
  })

  return remoteDockerContainers.data
    .filter(container => container.Labels?.['docker.ps-agent'] !== 'true')
    .map((container: ContainerInfo) => (DockerService.simplifyContainerInfo(container)))
})
