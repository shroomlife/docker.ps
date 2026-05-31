import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerHostPublic> => {
  const currentUser = await AuthService.getUserOrFail(event)

  const body = await readBody(event) as DockerHostAddRequestBody

  if (!body.url) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' })
  }

  if (!body.authKey) {
    throw createError({ statusCode: 400, statusMessage: 'Auth Key is required' })
  }

  return await prismaClient.dockerHost.create({
    data: {
      authKey: DockerHostService.encryptAuthKey(body.authKey),
      name: body.name,
      url: body.url,
      userId: currentUser.id,
    },
    omit: { authKey: true },
  })
})
