import type { DockerHost, User, UserIdentity } from '@prisma/client'

export interface UserWithIdentities extends User {
  identities: UserIdentity[]
}

export interface AppUser extends User {
  dockerHosts: DockerHost[]
}

export interface UserStoreState {
  isInitialized: boolean
  currentUser: AppUser | null
}
