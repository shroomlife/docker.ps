import type { User, UserIdentity } from '../prisma/client'
import type { DockerHostPublic } from './docker'

export interface UserWithIdentities extends User {
  identities: UserIdentity[]
}

export interface AppUser extends User {
  dockerHosts: DockerHostPublic[]
}

export interface UserStoreState {
  isInitialized: boolean
  currentUser: AppUser | null
}
