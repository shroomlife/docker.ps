import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler((event: H3Event<EventHandlerRequest>): { success: true } => {
  // The session cookie is httpOnly, so the client cannot clear it — do it server-side.
  // Match path/sameSite/secure so the browser actually drops the cookie.
  deleteCookie(event, AuthSettings.cookie.name, {
    path: AuthSettings.cookie.options.path,
    sameSite: AuthSettings.cookie.options.sameSite,
    secure: AuthSettings.cookie.options.secure,
  })

  return { success: true }
})
