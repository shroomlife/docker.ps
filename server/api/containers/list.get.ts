import type { ContainerInfo, ImageInfo } from 'dockerode'

export default defineEventHandler(async (): Promise<DockerStoreContainer[]> => {
  const docker = DockerService.getDockerHost()
  const containers = await docker.listContainers({
    all: true,
  })

  const images = await docker.listImages()
  const selfImage = images.find(image => image.RepoTags?.includes('shroomlife/docker.ps:latest')) as ImageInfo

  return containers
    .map((container: ContainerInfo) => (DockerService.simplifyContainerInfo(container, selfImage)))
})
