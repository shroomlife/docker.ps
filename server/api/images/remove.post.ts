import axios from 'axios'

export default defineEventHandler(async (event): Promise<boolean> => {
  try {
    const user = await AuthService.getUserOrFail(event)
    const body = await readBody(event) as DockerImageRemoveRequest

    const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
      where: {
        uuid: body.hostUuid,
        userId: user.id,
      },
    })

    if (!dockerHost) {
      throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
    }

    await axios({
      method: 'GET',
      url: new URL(`/images/${body.imageId}/remove`, dockerHost.url).toString(),
      headers: {
        'x-auth-key': dockerHost.authKey,
      },
    })
    return true
  }
  catch (error) {
    console.error('Failed to remove image:', error)
    return false
  }
})

