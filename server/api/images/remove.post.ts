import axios from 'axios'

export default defineEventHandler(async (event): Promise<boolean> => {
  try {
    const user = await AuthService.getUserOrFail(event)
    const body = await readBody(event) as DockerImageRemoveRequest

    const dockerHost = await DockerHostService.getForUserOrFail(body.hostUuid, user.id)

    await axios({
      method: 'GET',
      url: new URL(`/images/${body.imageId}/remove`, dockerHost.url).toString(),
      headers: {
        'x-auth-key': DockerHostService.resolveAuthKey(dockerHost),
      },
    })
    return true
  }
  catch (error) {
    console.error('Failed to remove image:', error)
    return false
  }
})
