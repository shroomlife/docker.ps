import type { ContainerInfo, ContainerInspectInfo, ImageInfo } from 'dockerode'
import Dockerode from 'dockerode'

import type {
  DockerContainerDetails,
  DockerContainerMetadataEntry,
  DockerContainerMount,
  DockerContainerNetwork,
  DockerStorePort,
} from '~~/shared/types/docker'

const normalizeContainerDate = (value?: string | null): string | null => {
  if (!value || value.startsWith('0001-01-01')) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) {
    return null
  }

  return parsed.toISOString()
}

const toMetadataEntries = (record?: Record<string, string>): DockerContainerMetadataEntry[] => {
  return Object.entries(record ?? {})
    .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
    .map(([key, value]) => ({
      key,
      value: String(value ?? ''),
    }))
}

const toEnvironmentEntries = (envValues?: string[]): DockerContainerMetadataEntry[] => {
  return (envValues ?? [])
    .map((entry) => {
      const separatorIndex = entry.indexOf('=')
      if (separatorIndex === -1) {
        return {
          key: entry,
          value: '',
        }
      }

      return {
        key: entry.slice(0, separatorIndex),
        value: entry.slice(separatorIndex + 1),
      }
    })
    .sort((leftEntry, rightEntry) => leftEntry.key.localeCompare(rightEntry.key))
}

const toEntrypointList = (entrypoint?: string | string[] | null): string[] => {
  if (Array.isArray(entrypoint)) {
    return entrypoint.filter(Boolean)
  }

  if (typeof entrypoint === 'string' && entrypoint.trim()) {
    return [entrypoint]
  }

  return []
}

const toPortsFromInspect = (container: ContainerInspectInfo): DockerStorePort[] => {
  return Object.entries(container.NetworkSettings?.Ports ?? {}).flatMap(([key, mappings]) => {
    const [privatePortValue = '0', protocol = 'tcp'] = key.split('/')
    const privatePort = Number.parseInt(privatePortValue, 10)

    if (Array.isArray(mappings) && mappings.length > 0) {
      return mappings.map(mapping => ({
        ip: mapping.HostIp,
        privatePort,
        publicPort: Number.parseInt(mapping.HostPort, 10),
        protocol,
      }))
    }

    return [{
      ip: '',
      privatePort,
      protocol,
    }]
  })
}

const toNetworks = (container: ContainerInspectInfo): DockerContainerNetwork[] => {
  return Object.entries(container.NetworkSettings?.Networks ?? {})
    .map(([name, network]) => ({
      name,
      networkId: network?.NetworkID,
      endpointId: network?.EndpointID,
      gateway: network?.Gateway,
      ipAddress: network?.IPAddress,
      macAddress: network?.MacAddress,
      aliases: (network?.Aliases ?? []).filter(Boolean),
    }))
    .sort((leftNetwork, rightNetwork) => leftNetwork.name.localeCompare(rightNetwork.name))
}

const toMounts = (container: ContainerInspectInfo): DockerContainerMount[] => {
  return (container.Mounts ?? [])
    .map(mount => ({
      type: mount.Type,
      source: mount.Source,
      destination: mount.Destination,
      mode: mount.Mode || undefined,
      rw: mount.RW,
      propagation: mount.Propagation || undefined,
      name: mount.Name || undefined,
      driver: mount.Driver || undefined,
    }))
    .sort((leftMount, rightMount) => leftMount.destination.localeCompare(rightMount.destination))
}

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
  simplifyContainerDetails(container: ContainerInspectInfo): DockerContainerDetails {
    const labels = container.Config?.Labels ?? {}
    const commandParts = [container.Path, ...(container.Args ?? [])].filter(Boolean)

    return {
      id: container.Id,
      name: container.Name.slice(1),
      image: container.Config?.Image ?? '',
      imageId: container.Image,
      state: container.State?.Status ?? 'unknown',
      status: container.State?.Status ?? 'unknown',
      health: container.State?.Health?.Status ?? null,
      createdAt: normalizeContainerDate(container.Created),
      startedAt: normalizeContainerDate(container.State?.StartedAt),
      finishedAt: normalizeContainerDate(container.State?.FinishedAt),
      restartCount: container.RestartCount ?? 0,
      exitCode: typeof container.State?.ExitCode === 'number' ? container.State.ExitCode : null,
      error: container.State?.Error || null,
      command: commandParts.join(' ').trim() || (container.Config?.Cmd ?? []).join(' ').trim(),
      entrypoint: toEntrypointList(container.Config?.Entrypoint),
      workingDir: container.Config?.WorkingDir || null,
      restartPolicy: container.HostConfig?.RestartPolicy?.Name || null,
      restartPolicyMaximumRetryCount: container.HostConfig?.RestartPolicy?.MaximumRetryCount ?? null,
      privileged: container.HostConfig?.Privileged ?? false,
      tty: container.Config?.Tty ?? false,
      networkMode: container.HostConfig?.NetworkMode || null,
      ports: toPortsFromInspect(container),
      networks: toNetworks(container),
      mounts: toMounts(container),
      environment: toEnvironmentEntries(container.Config?.Env),
      labels: toMetadataEntries(labels),
      compose: {
        project: labels['com.docker.compose.project'],
        service: labels['com.docker.compose.service'],
        containerNumber: labels['com.docker.compose.container-number'],
      },
    }
  },
  simplifyContainerInspect(container: ContainerInspectInfo): DockerStoreContainer {
    return {
      id: container.Id,
      name: container.Name.slice(1),
      ports: Object.entries(container.NetworkSettings.Ports).flatMap(([key, mappings]) => {
        const [privatePortValue = '0', protocol = 'tcp'] = String(key).split('/')
        const privatePort = parseInt(privatePortValue, 10)
        if (mappings) {
          return mappings.map(mapping => ({
            ip: mapping.HostIp,
            privatePort,
            publicPort: parseInt(mapping.HostPort, 10),
            protocol,
          }))
        }
        return [{
          ip: '',
          privatePort,
          protocol,
        }]
      }),
      image: container.Config.Image,
      state: container.State.Status,
      status: container.State.Status,
      created: Math.floor(new Date(container.Created).getTime() / 1000),
    }
  },
  simplifyContainerInfo(container: ContainerInfo): DockerStoreContainer {
    return {
      id: container.Id,
      name: container.Names.shift()?.slice(1) ?? '',
      ports: container.Ports.map(port => ({
        ip: port.IP,
        privatePort: port.PrivatePort,
        publicPort: port.PublicPort,
        protocol: port.Type,
      })),
      image: container.Image,
      state: container.State,
      status: container.Status,
      created: container.Created,
    }
  },
  simplifyImageInfo(image: ImageInfo): DockerStoreImage {
    // Parse repository and tag from RepoTags
    // RepoTags is an array like ["repository:tag", "repository:latest"]
    // If empty, use "<none>" for both
    const repoTag = image.RepoTags && image.RepoTags.length > 0
      ? image.RepoTags[0]
      : '<none>:<none>'

    if (!repoTag) {
      return {
        id: image.Id,
        repository: '<none>',
        tag: '<none>',
        size: image.Size,
        created: image.Created,
        parentId: image.ParentId || undefined,
      }
    }

    const [repository, tag] = repoTag.includes(':')
      ? repoTag.split(':', 2)
      : [repoTag, 'latest']

    return {
      id: image.Id,
      repository: repository || '<none>',
      tag: tag || 'latest',
      size: image.Size,
      created: image.Created,
      parentId: image.ParentId || undefined,
    }
  },
}
