export default defineEventHandler(async (event): Promise<DockerStoreContainer> => {
  const body = await readBody(event) as DockerContainerUnpauseRequest
  const docker = DockerService.getDockerHost()
  const container = docker.getContainer(body.id)
  await container.unpause()
  const containerInfo = await container.inspect()
  return DockerService.simplifyContainerInspect(containerInfo)
})
