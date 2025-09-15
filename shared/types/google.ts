export interface GoogleOAuthResponse {
  access_token: string
  expires_in: number
  scope: string
  token_type: string
  id_token: string
}

export interface GoogleIdTokenPayload {
  iss: string // Issuer
  azp: string // Authorized party
  aud: string // Audience (client_id)
  sub: string // Subject (Google User ID)
  hd?: string // Hosted domain (Google Workspace)
  at_hash?: string // Access Token hash (optional)
  iat: number // Issued at (Unix Timestamp)
  exp: number // Expiration time (Unix Timestamp)
}
