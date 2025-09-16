import axios from 'axios'
import type { ContainerInspectInfo } from 'dockerode'

export default defineEventHandler(async (event): Promise<DockerStoreContainer> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerRestartRequest

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: body.hostUuid,
      userId: user.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  const restartedDockerContainer = await axios<ContainerInspectInfo>({
    method: 'GET',
    url: new URL(`/containers/${body.containerId}/restart`, dockerHost.url).toString(),
    headers: {
      'x-auth-key': dockerHost.authKey,
    },
  })

  return DockerService.simplifyContainerInspect(restartedDockerContainer.data)
})
