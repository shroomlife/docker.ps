import type { H3Event, EventHandlerRequest } from 'h3'
import { createHmac } from 'crypto'
import type { SignOptions } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import type { AppUser } from '~~/shared/types/user'

export const AuthService = {
  base64urlEncode(s: string) { return Buffer.from(s, 'utf8').toString('base64url') },
  base64urlDecode(s: string) { return Buffer.from(s, 'base64url').toString('utf8') },
  hmacFromString(payload: string, secret: string) { return createHmac('sha256', secret).update(payload, 'utf8').digest() },
  getGoogleCallbackUrl() {
    const runtimeConfig = useRuntimeConfig()
    return `${runtimeConfig.public.appUrl}/auth/google/callback`
  },
  getJwtSecret() {
    const runtimeConfig = useRuntimeConfig()
    return runtimeConfig.jwtSecret
  },
  getJwtOptions(): SignOptions {
    return { expiresIn: '7d' }
  },
  setAuthCookie(event: H3Event<EventHandlerRequest>, userId: string, identityId: string) {
    const cookieData: UserCookiePayload = {
      userId: userId,
      identityId: identityId,
    }
    const jwtToken = jwt.sign(cookieData, AuthService.getJwtSecret(), AuthService.getJwtOptions())
    setCookie(event, AuthSettings.cookie.name, jwtToken, {
      ...AuthSettings.cookie.options,
      maxAge: 7 * 24 * 60 * 60,
    })
  },
  async getUser(event: H3Event<EventHandlerRequest>): Promise<AppUser | null> {
    try {
      const cookieData = getCookie(event, AuthSettings.cookie.name) as string
      if (!cookieData) return null

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
    }

    return null
  },
  async getUserOrFail(event: H3Event<EventHandlerRequest>): Promise<AppUser> {
    try {
      const user = await AuthService.getUser(event)
      if (user) return user
    }
    catch (error) {
      console.error('Error in AuthService.getUserOrFail:', error)
      throw createError({
        statusCode: 500,
        statusMessage: String(error),
      })
    }
    throw createError({
      statusCode: 500,
    })
  },
}
