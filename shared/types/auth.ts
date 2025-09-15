export interface UserOauthGoogleRequestBody {
  code: string
  state: string
}

export interface UserAuthRedirectResponseBody {
  authUrl: string
  state: string
}

export interface UserCookiePayload {
  userId: string
  identityId: string
  iat?: number
  exp?: number
}
