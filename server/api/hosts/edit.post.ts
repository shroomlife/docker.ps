import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<DockerHostPublic> => {
  const currentUser = await AuthService.getUserOrFail(event)

  const body = await readBody(event) as DockerHostEditRequestBody

  // Authz: throws (P2025) if the host does not belong to this user.
  await DockerHostService.getForUserOrFail(body.uuid, currentUser.id)

  if (!body.url) {
    throw createError({ statusCode: 400, statusMessage: 'URL is required' })
  }

  return await prismaClient.dockerHost.update({
    where: {
      uuid: body.uuid,
      userId: currentUser.id,
    },
    data: {
      name: body.name,
      url: body.url,
      // "Leave blank to keep current": only rotate the secret when a new one
      // is provided — never overwrite the stored key with an empty value.
      ...(body.authKey ? { authKey: DockerHostService.encryptAuthKey(body.authKey) } : {}),
    },
    omit: { authKey: true },
  })
})
