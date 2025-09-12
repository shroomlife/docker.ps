export default defineEventHandler(async (event): Promise<DockerStoreContainer> => {
  const body = await readBody(event) as DockerContainerPauseRequest
  const docker = DockerService.getDockerHost()
  const container = docker.getContainer(body.id)
  await container.pause()
  const containerInfo = await container.inspect()
  return DockerService.simplifyContainerInspect(containerInfo)
})
