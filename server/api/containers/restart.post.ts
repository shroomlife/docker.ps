export default defineEventHandler(async (event): Promise<DockerStoreContainer> => {
  const body = await readBody(event) as DockerContainerRestartRequest
  const docker = DockerService.getDockerHost()
  const container = docker.getContainer(body.id)
  await container.restart()
  const containerInfo = await container.inspect()
  return DockerService.simplifyContainerInspect(containerInfo)
})
