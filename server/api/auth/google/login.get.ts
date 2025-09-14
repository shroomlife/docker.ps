// server/api/auth/google.get.ts
import type { H3Event, EventHandlerRequest } from 'h3'
import { AuthService } from '~~/server/utils/auth'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<UserOauthRedirectResponseBody> => {
  const runtimeConfig = useRuntimeConfig()
  const google = runtimeConfig.google
  const baseURL = runtimeConfig.public.appUrl

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', google.clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email')
  authUrl.searchParams.set('redirect_uri', `${baseURL}/auth/google/callback`)

  const state = crypto.randomUUID()
  authUrl.searchParams.set('state', state)

  const payload = JSON.stringify({ v: state, iat: Date.now() })
  const sig = AuthService.hmacFromString(payload, runtimeConfig.cookieSecret).toString('base64url')
  const cookieValue = `${AuthService.base64urlEncode(payload)}.${sig}`

  setCookie(event, AuthService.google.cookieName, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 10 * 60,
  })

  return { authUrl: authUrl.toString(), state }
})
