import type { ContainerInfo } from 'dockerode'
import { getDockerHost } from '../utils/docker'

export default defineEventHandler(async (): Promise<DockerStoreContainer[]> => {
  const docker = getDockerHost()
  const containers = await docker.listContainers()
  return containers.map((container: ContainerInfo) => ({
    id: container.Id,
    name: container.Names[0].slice(1),
    ports: container.Ports.map(port => ({
      ip: port.IP,
      privatePort: port.PrivatePort,
      publicPort: port.PublicPort,
    })),
    image: container.Image,
    state: container.State,
    status: container.Status,
    created: container.Created,
  }))
})
