import type { SignOptions } from 'jsonwebtoken'
import type { CookieOptions } from 'nuxt/app'

export const AuthSettings = {
  jwt: {
    options: {
      expiresIn: '7d',
    } as SignOptions,
  },
  googleCookieName: 'docker.ps/googleAuth',
  cookie: {
    name: 'docker.ps/auth',
    options: {
      sameSite: 'lax' as CookieOptions['sameSite'],
      // httpOnly so the JWT session cookie is not readable by JS (XSS-safe).
      // Client auth state is derived from /api/auth/me, not from reading the cookie.
      httpOnly: true,
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
}
