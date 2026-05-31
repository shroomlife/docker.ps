import axios from 'axios'
import type { ContainerInspectInfo } from 'dockerode'

export default defineEventHandler(async (event): Promise<boolean> => {
  try {
    const user = await AuthService.getUserOrFail(event)
    const body = await readBody(event) as DockerContainerRemoveRequest

    const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

    await axios<ContainerInspectInfo>({
      method: 'GET',
      url: new URL(`/containers/${body.containerId}/remove`, dockerHost.url).toString(),
      headers: {
        'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
      },
    })
    return true
  }
  catch (error) {
    console.error('Failed to remove container:', error)
    return false
  }
})
