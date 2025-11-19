import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerHost> => {
  const currentUser = await AuthService.getUserOrFail(event)

  const body = await readBody(event) as DockerHostEditRequestBody

  const dockerHost = await prismaClient.dockerHost.findUniqueOrThrow({
    where: {
      uuid: body.uuid,
      userId: currentUser.id,
    },
  })

  if (!dockerHost) {
    throw createError({ statusCode: 404, statusMessage: 'Docker Host Not Found' })
  }

  if (!body.url) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' })
  }

  return await prismaClient.dockerHost.update({
    where: {
      uuid: body.uuid,
      userId: currentUser.id,
    },
    data: {
      authKey: body.authKey,
      name: body.name,
      url: body.url,
    },
  })
})
