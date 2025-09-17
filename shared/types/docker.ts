import type { DockerHost } from '@prisma/client'

export interface DockerStoreState {
  currentHost: DockerHost | null
  availableHosts: DockerHost[]
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
  hostUuid: string
  containerId: string
}

export interface DockerContainerPauseRequest {
  hostUuid: string
  containerId: string
}

export interface DockerContainerStopRequest {
  hostUuid: string
  containerId: string
}

export interface DockerContainerUnpauseRequest {
  hostUuid: string
  containerId: string
}

export interface DockerContainerStartRequest {
  hostUuid: string
  containerId: string
}

export interface DockerContainerRemoveRequest {
  hostUuid: string
  containerId: string
}

export interface DockerHostAddRequestBody {
  name: string
  url: string
  authKey: string
}

export interface DockerHostEditRequestBody {
  uuid: string
  name: string
  url: string
  authKey: string
}

export interface DockerHostGetRequest {
  hostUuid: string
}

export interface DockerContainerListRequest {
  hostUuid: string
}

export interface DockerContainerGetRequest {
  hostUuid: string
  containerId: string
}
