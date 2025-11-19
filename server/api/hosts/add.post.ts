import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerHost> => {
  const currentUser = await AuthService.getUserOrFail(event)

  const body = await readBody(event) as DockerHostAddRequestBody

  if (!body.url) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' })
  }

  return await prismaClient.dockerHost.create({
    data: {
      authKey: body.authKey,
      name: body.name,
      url: body.url,
      userId: currentUser.id,
    },
  })
})
