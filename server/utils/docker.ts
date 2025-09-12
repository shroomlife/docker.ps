import type { ContainerInfo, ContainerInspectInfo, ImageInfo } from 'dockerode'
import Dockerode from 'dockerode'

export const DockerService = {
  getDockerHost() {
    const runtimeConfig = useRuntimeConfig()
    switch (runtimeConfig.public.environment) {
      case 'local': {
        return new Dockerode({
          protocol: 'http',
          host: 'localhost',
          port: 2375,
        })
      }
      default: {
        return new Dockerode({ socketPath: '/var/run/docker.sock' })
      }
    }
  },
  simplifyContainerInspect(container: ContainerInspectInfo): DockerStoreContainer {
    return {
      id: container.Id,
      name: container.Name.slice(1),
      ports: Object.entries(container.NetworkSettings.Ports).flatMap(([key, mappings]) => {
        const privatePort = parseInt(String(key).split('/').shift() ?? '', 10)
        if (mappings) {
          return mappings.map(mapping => ({
            ip: mapping.HostIp,
            privatePort,
            publicPort: parseInt(mapping.HostPort, 10),
          }))
        }
        return [{
          ip: '',
          privatePort,
        }]
      }),
      image: container.Config.Image,
      state: container.State.Status,
      status: container.State.Status,
      created: Math.floor(new Date(container.Created).getTime() / 1000),
      isHost: false,
    }
  },
  simplifyContainerInfo(container: ContainerInfo, selfImage: ImageInfo): DockerStoreContainer {
    return {
      id: container.Id,
      name: container.Names.shift()?.slice(1) ?? '',
      ports: container.Ports.map(port => ({
        ip: port.IP,
        privatePort: port.PrivatePort,
        publicPort: port.PublicPort,
      })),
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: container.Created,
      isHost: container.ImageID === selfImage.Id,
    }
  },
}
