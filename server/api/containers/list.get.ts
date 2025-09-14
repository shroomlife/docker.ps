import type { ContainerInfo } from 'dockerode'

export default defineEventHandler(async (): Promise<DockerStoreContainer[]> => {
  const docker = DockerService.getDockerHost()
  const containers = await docker.listContainers({
    all: true,
  })
  return containers
    .filter(container => container.Labels?.['docker.ps-agent'] !== 'true')
    .map((container: ContainerInfo) => (DockerService.simplifyContainerInfo(container)))
})
