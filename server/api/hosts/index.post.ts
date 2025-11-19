import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerHost> => {
  const currentUser = await AuthService.getUserOrFail(event)
  const body = await readBody(event) as DockerHostGetRequest

  if (!body.hostUuid) {
    throw createError({ statusCode: 400, statusMessage: 'Host UUID is Required' })
  }

  return await prismaClient.dockerHost.findFirstOrThrow({
    where: {
      uuid: body.hostUuid,
      userId: currentUser.id,
    },
  })
})
