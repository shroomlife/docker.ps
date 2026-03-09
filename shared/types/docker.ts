import type { DockerHost } from '../prisma/client'

export interface DockerStoreState {
  currentHost: DockerHost | null
  availableHosts: DockerHost[]
  isLoadingContainers: boolean
  containers: DockerStoreContainer[]
  blockedContainerIds: string[]
  isLoadingImages: boolean
  images: DockerStoreImage[]
}

export interface DockerStorePort {
  ip: string
  privatePort: number
  publicPort?: number
  protocol?: string
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

export interface DockerContainerMetadataEntry {
  key: string
  value: string
}

export interface DockerContainerMount {
  type: string
  source: string
  destination: string
  mode?: string
  rw: boolean
  propagation?: string
  name?: string
  driver?: string
}

export interface DockerContainerNetwork {
  name: string
  networkId?: string
  endpointId?: string
  gateway?: string
  ipAddress?: string
  macAddress?: string
  aliases: string[]
}

export interface DockerContainerComposeMetadata {
  project?: string
  service?: string
  containerNumber?: string
}

export interface DockerContainerDetails {
  id: string
  name: string
  image: string
  imageId: string
  state: string
  status: string
  health: string | null
  createdAt: string | null
  startedAt: string | null
  finishedAt: string | null
  restartCount: number
  exitCode: number | null
  error: string | null
  command: string
  entrypoint: string[]
  workingDir: string | null
  restartPolicy: string | null
  restartPolicyMaximumRetryCount: number | null
  privileged: boolean
  tty: boolean
  networkMode: string | null
  ports: DockerStorePort[]
  networks: DockerContainerNetwork[]
  mounts: DockerContainerMount[]
  environment: DockerContainerMetadataEntry[]
  labels: DockerContainerMetadataEntry[]
  compose: DockerContainerComposeMetadata
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

export interface DockerContainerLogsRequest {
  hostUuid: string
  containerId: string
  follow?: boolean
  tail?: number
  since?: number
}

export interface DockerContainerLogsStreamRequest {
  hostUuid: string
  containerId: string
  tail?: number
}

export interface DockerContainerLogEntry {
  id: string
  timestamp: string | null
  timestampLabel: string
  message: string
  raw: string
  fingerprint: string
}

export interface DockerContainerLogsResponse {
  logs: DockerContainerLogEntry[]
}

export interface DockerStoreImage {
  id: string
  repository: string
  tag: string
  size: number
  created: number
  parentId?: string
}

export interface DockerImageListRequest {
  hostUuid: string
}

export interface DockerImageGetRequest {
  hostUuid: string
  imageId: string
}

export interface DockerImageRemoveRequest {
  hostUuid: string
  imageId: string
}
