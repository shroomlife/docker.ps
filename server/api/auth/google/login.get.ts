// server/api/auth/google.get.ts
import type { H3Event, EventHandlerRequest } from 'h3'
import { AuthService } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<UserAuthRedirectResponseBody> => {
  const runtimeConfig = useRuntimeConfig()
  const google = runtimeConfig.google

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', google.clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid')
  authUrl.searchParams.set('redirect_uri', AuthService.getGoogleCallbackUrl())

  const state = crypto.randomUUID()
  authUrl.searchParams.set('state', state)

  const payload = JSON.stringify({ v: state, iat: Date.now() })
  const sig = AuthService.hmacFromString(payload, runtimeConfig.cookieSecret).toString('base64url')
  const cookieValue = `${AuthService.base64urlEncode(payload)}.${sig}`

  setCookie(event, AuthSettings.googleCookieName, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 10 * 60,
  })

  console.log('Generated Google OAuth URL:', authUrl.toString())
  return { authUrl: authUrl.toString(), state }
})
