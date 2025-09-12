export interface DockerStoreState {
  initialized: boolean
  containers: DockerStoreContainer[]
}

export interface DockerStorePort {
  ip: string
  privatePort: number
  publicPort?: number
}

export interface DockerStoreContainer {
  id: string
  name: string
  image: string
  ports: DockerStorePort[]
  state: string
  status: string
  created: number
}
