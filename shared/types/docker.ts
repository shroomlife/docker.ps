export interface DockerStoreState {
  initialized: boolean
  isLoadingContainers: boolean
  containers: DockerStoreContainer[]
  blockedContainerIds: string[]
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

export interface DockerContainerRestartRequest {
  id: string
}

export interface DockerContainerPauseRequest {
  id: string
}

export interface DockerContainerStopRequest {
  id: string
}

export interface DockerContainerUnpauseRequest {
  id: string
}

export interface DockerContainerStartRequest {
  id: string
}

export interface DockerContainerRemoveRequest {
  id: string
}
