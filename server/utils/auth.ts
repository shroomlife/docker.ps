import { createHmac } from 'crypto'

export const AuthService = {
  google: {
    cookieName: 'docker.ps/googleAuth',
  },
  base64urlEncode(s: string) { return Buffer.from(s, 'utf8').toString('base64url') },
  base64urlDecode(s: string) { return Buffer.from(s, 'base64url').toString('utf8') },
  hmacFromString(payload: string, secret: string) { return createHmac('sha256', secret).update(payload, 'utf8').digest() },
}
