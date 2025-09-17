import type { H3Event, EventHandlerRequest } from 'h3'
import jwt from 'jsonwebtoken'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<AppUser> => {
  const cookieData = getCookie(event, AuthSettings.cookie.name) as string | undefined
  if (!cookieData) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  try {
    const runtimeConfig = useRuntimeConfig()
    const decodedCookieData = jwt.verify(cookieData, runtimeConfig.jwtSecret) as UserCookiePayload
    const foundUser = await prismaClient.user.findUnique({
      where: {
        uuid: decodedCookieData.userId,
        AND: { identities: { some: { uuid: decodedCookieData.identityId } } },
      },
      include: { dockerHosts: true },
    })

    if (!foundUser) {
      throw new Error('User Not Found')
    }

    return foundUser
  }
  catch (error) {
    console.error('Error at User Self', error)
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
