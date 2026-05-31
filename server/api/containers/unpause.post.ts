import axios from 'axios'
import type { ContainerInspectInfo } from 'dockerode'

export default defineEventHandler(async (event): Promise<DockerStoreContainer> => {
  const user = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerContainerUnpauseRequest

  const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

  const unpausedDockerContainer = await axios<ContainerInspectInfo>({
    method: 'GET',
    url: new URL(`/containers/${body.containerId}/unpause`, dockerHost.url).toString(),
    headers: {
      'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
    },
  })

  return DockerService.simplifyContainerInspect(unpausedDockerContainer.data)
})
