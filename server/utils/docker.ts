import Dockerode from 'dockerode'

export const getDockerHost = (): Dockerode => {
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
}
