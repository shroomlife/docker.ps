import type { ContainerInspectInfo } from 'dockerode'
import type { H3Event, EventHandlerRequest } from 'h3'

export default defineEventHandler(async (event: H3Event<EventHandlerRequest>): Promise<ContainerInspectInfo> => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Container ID is required' })
  }
  const docker = DockerService.getDockerHost()
  const container = docker.getContainer(id)
  return await container.inspect()
})
