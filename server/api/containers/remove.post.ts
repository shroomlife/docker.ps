export default defineEventHandler(async (event): Promise<boolean> => {
  try {
    const body = await readBody(event) as DockerContainerRemoveRequest
    const docker = DockerService.getDockerHost()
    const container = docker.getContainer(body.id)
    await container.remove()
    return true
  }
  catch (error) {
    console.error('Failed to remove container:', error)
    return false
  }
})
