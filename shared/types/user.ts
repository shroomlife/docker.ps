import type { User, UserIdentity } from '@prisma/client'

export interface UserWithIdentities extends User {
  identities: UserIdentity[]
}

export interface UserStoreState {
  isInitialized: boolean
  currentUser: User | null
}
