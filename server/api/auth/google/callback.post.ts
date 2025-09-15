import type { H3Event, EventHandlerRequest } from 'h3'
import { timingSafeEqual } from 'crypto'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import type { User, UserIdentity } from '@prisma/client'
import { UserIdentityType } from '@prisma/client'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<User> => {
  try {
    const cookie = getCookie(event, AuthSettings.googleCookieName) as string | undefined
    const { code, state } = await readBody(event) as UserOauthGoogleRequestBody

    if (!cookie) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
    if (!state) throw createError({ statusCode: 400, statusMessage: 'Missing State' })
    if (!code) throw createError({ statusCode: 400, statusMessage: 'Missing Code' })

    const runtimeConfig = useRuntimeConfig()

    const [payloadB64u, sigB64u] = cookie.split('.')
    if (!payloadB64u || !sigB64u) throw createError({ statusCode: 400, statusMessage: 'Invalid Cookie Format' })

    const payloadJson = AuthService.base64urlDecode(payloadB64u)
    const provided = Buffer.from(sigB64u, 'base64url')
    const expected = AuthService.hmacFromString(payloadJson, runtimeConfig.cookieSecret)

    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Signature' })
    }

    const payload = JSON.parse(payloadJson) as { v: string, iat: number }
    if (payload.v !== state) throw createError({ statusCode: 400, statusMessage: 'State Mismatch' })
    if (Date.now() - payload.iat > 15 * 60 * 1000) throw createError({ statusCode: 400, statusMessage: 'State Expired' })

    const tokenResponse = await axios<GoogleOAuthResponse>({
      method: 'POST',
      url: 'https://oauth2.googleapis.com/token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      data: new URLSearchParams({
        client_id: runtimeConfig.google.clientId,
        client_secret: runtimeConfig.google.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: AuthService.getGoogleCallbackUrl(),
      }),
    })

    if (!tokenResponse.data) {
      throw createError({ statusCode: 400, statusMessage: 'Missing Token Response' })
    }

    if (!tokenResponse.data.access_token) {
      throw createError({ statusCode: 400, statusMessage: 'Missing Access Token' })
    }

    const decodedToken = tokenResponse.data.id_token
    const decodedTokenData = jwt.decode(decodedToken) as GoogleIdTokenPayload

    if (!decodedTokenData || !decodedTokenData.sub) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid ID Token' })
    }

    const foundUser: UserWithIdentities | null = await prismaClient.user.findFirst({
      where: {
        identities: {
          some: {
            type: UserIdentityType.GOOGLE,
            externalId: decodedTokenData.sub,
          },
        },
      },
      include: {
        identities: true,
        dockerHosts: true,
      },
    })

    if (foundUser) {
      if (foundUser.identities.length === 1) {
        const identity = foundUser.identities[0] as UserIdentity
        AuthService.setAuthCookie(event, foundUser.uuid, identity.uuid)
        return foundUser
      }
      else if (foundUser.identities.length === 0) {
        const identity = await prismaClient.userIdentity.create({
          data: {
            type: UserIdentityType.GOOGLE,
            externalId: decodedTokenData.sub,
            user: { connect: { id: foundUser.id } },
          },
        })
        AuthService.setAuthCookie(event, foundUser.uuid, identity.uuid)
        return foundUser
      }
      else {
        throw createError({ statusCode: 500, statusMessage: 'Multiple Identities Found' })
      }
    }
    else {
      const newUser = await prismaClient.user.create({
        data: {
          identities: {
            create: {
              type: UserIdentityType.GOOGLE,
              externalId: decodedTokenData.sub,
            },
          },
        },
        include: { identities: true },
      })

      if (!newUser) throw createError({ statusCode: 500, statusMessage: 'Failed to Create User' })
      if (newUser.identities.length === 0) throw createError({ statusCode: 500, statusMessage: 'Failed to Create User Identity' })

      const newIdentity = newUser.identities[0] as UserIdentity
      AuthService.setAuthCookie(event, newUser.uuid, newIdentity.uuid)
      return newUser
    }
  }
  catch (error) {
    console.error('Error in Google OAuth Callback', error)
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error' })
  }
})
