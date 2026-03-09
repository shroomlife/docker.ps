<script lang="ts" setup>
import type { BadgeProps } from '@nuxt/ui'
import moment from 'moment'

import type { DockerContainerDetails, DockerStorePort } from '~~/shared/types/docker'

definePageMeta({
  layout: 'app',
})

const toast = useToast()
const dockerStore = useDockerStore()
const currentRoute = useRoute()

const container = ref<DockerContainerDetails | null>(null)
const isLoading = ref(true)
const isRefreshingDetails = ref(false)
const scrollerRef = ref<{ scrollToBottom: () => void } | null>(null)

const containerId = computed(() => String(currentRoute.params.id ?? ''))
const {
  autoScroll,
  clearLogs,
  connectionStatus,
  connectionStatusConfig,
  downloadLogs,
  isDownloading,
  isLiveMode,
  isLogsLoading,
  loadInitialLogs,
  logs,
  maxLogLines,
  refreshLogs,
  resetLogs,
  searchValue,
  toggleLiveMode,
  visibleLogs,
  wrapLines,
} = useContainerLogs({
  hostUuid: computed(() => dockerStore.getCurrentHost?.uuid),
  containerId,
  maxLogLines: 2000,
})

const getStateBadgeColor = (state: string): BadgeProps['color'] => {
  switch (state) {
    case 'running':
      return 'success'
    case 'paused':
      return 'warning'
    case 'exited':
      return 'error'
    case 'created':
    case 'restarting':
    case 'removing':
      return 'info'
    default:
      return 'neutral'
  }
}

const getHealthBadgeColor = (health: string | null): BadgeProps['color'] => {
  switch (health) {
    case 'healthy':
      return 'success'
    case 'unhealthy':
      return 'error'
    case 'starting':
      return 'warning'
    default:
      return 'neutral'
  }
}

const formatAbsoluteDate = (value: string | null) => {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleString()
}

const formatRelativeDate = (value: string | null) => {
  if (!value) {
    return 'N/A'
  }

  return moment(value).fromNow()
}

const formatBoolean = (value: boolean) => value ? 'Enabled' : 'Disabled'

const formatPortBinding = (port: DockerStorePort) => {
  const protocol = port.protocol || 'tcp'
  if (port.publicPort) {
    return `${port.ip || '0.0.0.0'}:${port.publicPort} -> ${port.privatePort}/${protocol}`
  }

  return `${port.privatePort}/${protocol}`
}

const computedTitle = computed(() => {
  return container.value?.name || 'Container Details'
})

const computedDescription = computed(() => {
  if (container.value?.compose.service && container.value.compose.project) {
    return `${container.value.compose.service} in ${container.value.compose.project}`
  }

  return container.value?.image || 'Inspect runtime, networking, storage and logs'
})

const breadcrumbItems = computed(() => {
  return [
    {
      label: dockerStore.getCurrentHost?.name || 'Containers',
      icon: 'tabler:stack',
      to: '/app/containers',
    },
    {
      label: computedTitle.value,
      icon: 'tabler:stack-filled',
    },
  ]
})

const overviewCards = computed(() => {
  if (!container.value) {
    return []
  }

  return [
    {
      label: 'State',
      value: container.value.state,
      detail: container.value.health ? `Health: ${container.value.health}` : container.value.status,
    },
    {
      label: 'Created',
      value: formatRelativeDate(container.value.createdAt),
      detail: formatAbsoluteDate(container.value.createdAt),
    },
    {
      label: 'Started',
      value: formatRelativeDate(container.value.startedAt),
      detail: formatAbsoluteDate(container.value.startedAt),
    },
    {
      label: 'Restarts',
      value: String(container.value.restartCount),
      detail: container.value.restartPolicy || 'No restart policy',
    },
  ]
})

const runtimeFacts = computed(() => {
  if (!container.value) {
    return []
  }

  return [
    { label: 'Command', value: container.value.command || 'N/A', copyable: !!container.value.command },
    {
      label: 'Entrypoint',
      value: container.value.entrypoint.length > 0 ? container.value.entrypoint.join(' ') : 'N/A',
      copyable: container.value.entrypoint.length > 0,
    },
    { label: 'Working directory', value: container.value.workingDir || 'N/A', copyable: !!container.value.workingDir },
    { label: 'Restart policy', value: container.value.restartPolicy || 'none', copyable: false },
    {
      label: 'Retry limit',
      value: container.value.restartPolicyMaximumRetryCount !== null
        ? String(container.value.restartPolicyMaximumRetryCount)
        : 'N/A',
      copyable: false,
    },
    { label: 'TTY', value: formatBoolean(container.value.tty), copyable: false },
    { label: 'Privileged', value: formatBoolean(container.value.privileged), copyable: false },
  ]
})

const lifecycleFacts = computed(() => {
  if (!container.value) {
    return []
  }

  return [
    { label: 'Container ID', value: container.value.id, copyable: true },
    { label: 'Image', value: container.value.image, copyable: true },
    { label: 'Image ID', value: container.value.imageId, copyable: true },
    { label: 'Exit code', value: container.value.exitCode !== null ? String(container.value.exitCode) : 'N/A', copyable: false },
    { label: 'Last finished', value: formatAbsoluteDate(container.value.finishedAt), copyable: false },
    { label: 'Network mode', value: container.value.networkMode || 'default', copyable: false },
    { label: 'State error', value: container.value.error || 'None', copyable: !!container.value.error },
  ]
})

const copyText = async (label: string, value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({
      title: 'Copied',
      description: `${label} copied to clipboard`,
      color: 'success',
    })
  }
  catch (error) {
    console.error(`Failed to copy ${label}:`, error)
    toast.add({
      title: 'Error',
      description: `Failed to copy ${label}`,
      color: 'error',
    })
  }
}

const loadContainerDetails = async (isBackgroundRefresh = false) => {
  if (!dockerStore.getCurrentHost?.uuid) {
    toast.add({
      title: 'Error',
      description: 'Select a Docker host before opening container details.',
      color: 'error',
    })
    await navigateTo('/app')
    return
  }

  if (!containerId.value) {
    toast.add({
      title: 'Error',
      description: 'No container ID was provided.',
      color: 'error',
    })
    await navigateTo('/app/containers')
    return
  }

  try {
    if (isBackgroundRefresh) {
      isRefreshingDetails.value = true
    }
    else {
      isLoading.value = true
    }

    container.value = await $fetch<DockerContainerDetails>('/api/containers', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.getCurrentHost.uuid,
        containerId: containerId.value,
      } as DockerContainerGetRequest,
    })
  }
  catch (error) {
    console.error('Failed to fetch container details:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch container details',
      color: 'error',
    })
    await navigateTo('/app/containers')
  }
  finally {
    isRefreshingDetails.value = false
    isLoading.value = false
  }
}

const initializePage = async () => {
  resetLogs()
  await loadContainerDetails()
  if (container.value) {
    await loadInitialLogs()
  }
}

const handleContainerMutation = async () => {
  await Promise.all([
    loadContainerDetails(true),
    dockerStore.loadContainers(),
    refreshLogs(),
  ])
}

const handleContainerRemoval = async () => {
  toast.add({
    title: 'Container removed',
    description: 'The container was removed successfully.',
    color: 'success',
  })
  await navigateTo('/app/containers')
}

watch(() => visibleLogs.value.length, async (newLength, previousLength) => {
  if (!autoScroll.value || newLength <= previousLength) {
    return
  }

  await nextTick()
  scrollerRef.value?.scrollToBottom()
})

watch(
  [
    () => containerId.value,
    () => dockerStore.getCurrentHost?.uuid || '',
  ],
  async ([nextContainerId, nextHostUuid], [previousContainerId, previousHostUuid]) => {
    if (!nextContainerId || !nextHostUuid) {
      return
    }

    if (nextContainerId === previousContainerId && nextHostUuid === previousHostUuid) {
      return
    }

    await initializePage()
  },
)

onMounted(async () => {
  await initializePage()
})
</script>

<template>
  <AppDashboardPage
    :title="computedTitle"
    :headline="dockerStore.getCurrentHost?.name"
    :description="computedDescription"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>

        <template #right>
          <div
            v-if="container"
            class="flex flex-wrap items-center justify-end gap-2"
          >
            <UBadge
              :color="getStateBadgeColor(container.state)"
              variant="soft"
              size="lg"
            >
              {{ container.state }}
            </UBadge>

            <UBadge
              v-if="container.health"
              :color="getHealthBadgeColor(container.health)"
              variant="outline"
              size="lg"
            >
              Health: {{ container.health }}
            </UBadge>

            <UButton
              icon="i-tabler-refresh"
              color="neutral"
              variant="ghost"
              :loading="isRefreshingDetails"
              @click="handleContainerMutation"
            >
              Refresh
            </UButton>

            <ContainerUnpauseButton
              v-if="container.state === 'paused'"
              :id="container.id"
              @success="handleContainerMutation"
            />
            <ContainerStartButton
              v-if="container.state === 'exited'"
              :id="container.id"
              @success="handleContainerMutation"
            />
            <ContainerPauseButton
              v-if="container.state === 'running'"
              :id="container.id"
              @success="handleContainerMutation"
            />
            <ContainerRestartButton
              v-if="container.state !== 'exited'"
              :id="container.id"
              @success="handleContainerMutation"
            />
            <ContainerStopButton
              v-if="container.state !== 'exited'"
              :id="container.id"
              @success="handleContainerMutation"
            />
            <ContainerRemoveButton
              v-if="container.state === 'exited'"
              :id="container.id"
              @success="handleContainerRemoval"
            />
          </div>
        </template>
      </UDashboardNavbar>
    </template>

    <div class="space-y-6">
      <div
        v-if="isLoading && !container"
        class="rounded-xl border border-default bg-default/40 px-6 py-10 text-sm text-dimmed"
      >
        Loading container details...
      </div>

      <template v-else-if="container">
        <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            v-for="card in overviewCards"
            :key="card.label"
            class="rounded-xl border border-default bg-default/60 px-4 py-4"
          >
            <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
              {{ card.label }}
            </div>
            <div class="mt-2 text-lg font-semibold text-highlighted">
              {{ card.value }}
            </div>
            <div class="mt-1 text-sm text-dimmed">
              {{ card.detail }}
            </div>
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <UCard>
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h3 class="text-lg font-semibold">
                    Runtime
                  </h3>
                  <p class="text-sm text-dimmed">
                    Command, image and lifecycle information for this container.
                  </p>
                </div>

                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-if="container.compose.project"
                    color="neutral"
                    variant="soft"
                  >
                    {{ container.compose.project }}
                  </UBadge>
                  <UBadge
                    v-if="container.compose.service"
                    color="info"
                    variant="soft"
                  >
                    {{ container.compose.service }}
                  </UBadge>
                </div>
              </div>
            </template>

            <div class="space-y-6">
              <div class="rounded-xl border border-default bg-default/40 p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
                      Image
                    </div>
                    <div class="mt-2 break-all font-mono text-sm text-highlighted">
                      {{ container.image }}
                    </div>
                  </div>

                  <UButton
                    icon="i-tabler-copy"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="copyText('Image', container.image)"
                  />
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div
                  v-for="fact in runtimeFacts"
                  :key="fact.label"
                  class="rounded-xl border border-default bg-default/40 p-4"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
                        {{ fact.label }}
                      </div>
                      <div class="mt-2 break-all font-mono text-sm text-highlighted">
                        {{ fact.value }}
                      </div>
                    </div>

                    <UButton
                      v-if="fact.copyable"
                      icon="i-tabler-copy"
                      size="xs"
                      color="neutral"
                      variant="ghost"
                      @click="copyText(fact.label, fact.value)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">
                  Lifecycle
                </h3>
                <p class="text-sm text-dimmed">
                  Identity, status and shutdown information.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <div
                v-for="fact in lifecycleFacts"
                :key="fact.label"
                class="rounded-xl border border-default bg-default/40 p-4"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
                      {{ fact.label }}
                    </div>
                    <div class="mt-2 break-all font-mono text-sm text-highlighted">
                      {{ fact.value }}
                    </div>
                  </div>

                  <UButton
                    v-if="fact.copyable"
                    icon="i-tabler-copy"
                    size="xs"
                    color="neutral"
                    variant="ghost"
                    @click="copyText(fact.label, fact.value)"
                  />
                </div>
              </div>
            </div>
          </UCard>
        </div>

        <div class="grid gap-6 xl:grid-cols-2">
          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">
                  Networking
                </h3>
                <p class="text-sm text-dimmed">
                  Published ports, bindings and connected Docker networks.
                </p>
              </div>
            </template>

            <div class="space-y-6">
              <div>
                <div class="mb-3 text-xs font-medium uppercase tracking-wide text-dimmed">
                  Port bindings
                </div>

                <div
                  v-if="container.ports.length > 0"
                  class="flex flex-wrap gap-2"
                >
                  <UBadge
                    v-for="port in container.ports"
                    :key="`${port.privatePort}-${port.publicPort}-${port.protocol}-${port.ip}`"
                    color="info"
                    variant="soft"
                    size="lg"
                  >
                    {{ formatPortBinding(port) }}
                  </UBadge>
                </div>

                <div
                  v-else
                  class="rounded-lg border border-dashed border-default px-4 py-5 text-sm text-dimmed"
                >
                  No published ports configured.
                </div>
              </div>

              <div>
                <div class="mb-3 text-xs font-medium uppercase tracking-wide text-dimmed">
                  Networks
                </div>

                <div
                  v-if="container.networks.length > 0"
                  class="space-y-3"
                >
                  <div
                    v-for="network in container.networks"
                    :key="network.name"
                    class="rounded-xl border border-default bg-default/40 p-4"
                  >
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-semibold text-highlighted">{{ network.name }}</span>
                      <UBadge
                        v-if="network.ipAddress"
                        color="neutral"
                        variant="soft"
                      >
                        {{ network.ipAddress }}
                      </UBadge>
                    </div>

                    <div class="mt-3 grid gap-3 md:grid-cols-2">
                      <div class="text-sm text-dimmed">
                        Gateway: <span class="font-mono text-highlighted">{{ network.gateway || 'N/A' }}</span>
                      </div>
                      <div class="text-sm text-dimmed">
                        MAC: <span class="font-mono text-highlighted">{{ network.macAddress || 'N/A' }}</span>
                      </div>
                    </div>

                    <div
                      v-if="network.aliases.length > 0"
                      class="mt-3 flex flex-wrap gap-2"
                    >
                      <UBadge
                        v-for="alias in network.aliases"
                        :key="alias"
                        color="neutral"
                        variant="outline"
                      >
                        {{ alias }}
                      </UBadge>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="rounded-lg border border-dashed border-default px-4 py-5 text-sm text-dimmed"
                >
                  No Docker networks were reported for this container.
                </div>
              </div>
            </div>
          </UCard>

          <UCard>
            <template #header>
              <div>
                <h3 class="text-lg font-semibold">
                  Storage
                </h3>
                <p class="text-sm text-dimmed">
                  Mounted volumes and bind mounts available to the container.
                </p>
              </div>
            </template>

            <div
              v-if="container.mounts.length > 0"
              class="space-y-3"
            >
              <div
                v-for="mount in container.mounts"
                :key="`${mount.destination}-${mount.source}`"
                class="rounded-xl border border-default bg-default/40 p-4"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="font-semibold text-highlighted">{{ mount.destination }}</span>
                  <UBadge
                    color="neutral"
                    variant="soft"
                  >
                    {{ mount.type }}
                  </UBadge>
                  <UBadge
                    :color="mount.rw ? 'success' : 'neutral'"
                    variant="outline"
                  >
                    {{ mount.rw ? 'rw' : 'ro' }}
                  </UBadge>
                </div>

                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <div class="text-sm text-dimmed">
                    Source: <span class="break-all font-mono text-highlighted">{{ mount.source }}</span>
                  </div>
                  <div class="text-sm text-dimmed">
                    Mode: <span class="font-mono text-highlighted">{{ mount.mode || 'default' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-else
              class="rounded-lg border border-dashed border-default px-4 py-5 text-sm text-dimmed"
            >
              No mounts or volumes are attached to this container.
            </div>
          </UCard>
        </div>

        <UCard>
          <template #header>
            <div>
              <h3 class="text-lg font-semibold">
                Metadata
              </h3>
              <p class="text-sm text-dimmed">
                Compose labels, environment variables and raw labels for troubleshooting.
              </p>
            </div>
          </template>

          <div class="grid gap-6 xl:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
            <div class="space-y-4">
              <div class="rounded-xl border border-default bg-default/40 p-4">
                <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
                  Compose metadata
                </div>

                <div class="mt-3 space-y-3">
                  <div class="text-sm text-dimmed">
                    Project:
                    <span class="font-mono text-highlighted">
                      {{ container.compose.project || 'N/A' }}
                    </span>
                  </div>
                  <div class="text-sm text-dimmed">
                    Service:
                    <span class="font-mono text-highlighted">
                      {{ container.compose.service || 'N/A' }}
                    </span>
                  </div>
                  <div class="text-sm text-dimmed">
                    Container number:
                    <span class="font-mono text-highlighted">
                      {{ container.compose.containerNumber || 'N/A' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <ContainerMetadataPanel
                title="Environment variables"
                :entries="container.environment"
                empty-text="No environment variables were reported."
              />
              <ContainerMetadataPanel
                title="Labels"
                :entries="container.labels"
                empty-text="No labels were reported."
              />
            </div>
          </div>
        </UCard>

        <UCard>
          <template #header>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex items-center gap-3">
                  <h3 class="text-lg font-semibold">
                    Container Logs
                  </h3>
                  <UBadge
                    :color="connectionStatusConfig.color"
                    variant="subtle"
                    size="sm"
                    class="transition-all"
                    :class="{ 'animate-pulse-live': connectionStatusConfig.pulse }"
                  >
                    <UIcon
                      :name="connectionStatusConfig.icon"
                      class="mr-1 h-3 w-3"
                      :class="{ 'animate-spin': connectionStatus === 'connecting' || connectionStatus === 'reconnecting' }"
                    />
                    {{ connectionStatusConfig.text }}
                  </UBadge>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <UInput
                    v-model="searchValue"
                    icon="i-tabler-search"
                    placeholder="Search current buffer"
                    class="min-w-64"
                  />
                  <UButton
                    :icon="wrapLines ? 'i-tabler-wrap' : 'i-tabler-text-wrap-off'"
                    color="neutral"
                    variant="outline"
                    @click="wrapLines = !wrapLines"
                  >
                    {{ wrapLines ? 'Wrap On' : 'Wrap Off' }}
                  </UButton>
                  <UButton
                    icon="i-tabler-eraser"
                    color="neutral"
                    variant="outline"
                    @click="clearLogs"
                  >
                    Clear
                  </UButton>
                  <UButton
                    :icon="isLiveMode ? 'i-tabler-player-pause' : 'i-tabler-broadcast'"
                    :color="isLiveMode ? 'warning' : 'success'"
                    variant="soft"
                    @click="toggleLiveMode"
                  >
                    {{ isLiveMode ? 'Pause' : 'Live' }}
                  </UButton>
                  <UButton
                    icon="i-tabler-refresh"
                    color="neutral"
                    variant="outline"
                    :loading="isLogsLoading"
                    @click="refreshLogs"
                  >
                    Refresh
                  </UButton>
                  <UButton
                    icon="i-tabler-download"
                    color="neutral"
                    variant="outline"
                    :loading="isDownloading"
                    @click="downloadLogs"
                  >
                    Download
                  </UButton>
                </div>
              </div>
            </div>
          </template>

          <div class="logs-wrapper rounded-lg border border-default bg-gray-950 text-white">
            <div
              v-if="logs.length === 0 && !isLogsLoading"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <UIcon
                name="i-tabler-file-text"
                class="mb-3 h-12 w-12 opacity-50"
              />
              <p class="text-sm">
                No logs available
              </p>
              <p class="mt-1 text-xs opacity-75">
                Start the container or use Live to stream new output.
              </p>
            </div>

            <div
              v-else-if="visibleLogs.length === 0 && searchValue.trim()"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <UIcon
                name="i-tabler-search-off"
                class="mb-3 h-10 w-10 opacity-50"
              />
              <p class="text-sm">
                No log lines match the current search.
              </p>
            </div>

            <div
              v-else-if="isLogsLoading && logs.length === 0"
              class="flex flex-col items-center justify-center py-16 text-gray-400"
            >
              <UIcon
                name="i-tabler-loader-2"
                class="mb-3 h-8 w-8 animate-spin"
              />
              <p class="text-sm">
                Loading logs...
              </p>
            </div>

            <DynamicScroller
              v-else
              ref="scrollerRef"
              :items="visibleLogs"
              :min-item-size="24"
              key-field="id"
              class="log-scroller"
              style="height: 500px;"
            >
              <template #default="{ item, index, active }">
                <DynamicScrollerItem
                  :item="item"
                  :active="active"
                  :data-index="index"
                >
                  <ContainerLogLine
                    :timestamp="item.timestampLabel"
                    :message="item.message"
                    :index="index"
                    :wrap-lines="wrapLines"
                  />
                </DynamicScrollerItem>
              </template>
            </DynamicScroller>
          </div>

          <template #footer>
            <div class="flex flex-col gap-3 text-xs text-dimmed md:flex-row md:items-center md:justify-between">
              <div class="flex flex-wrap items-center gap-4">
                <span>
                  {{ visibleLogs.length.toLocaleString() }} visible / {{ logs.length.toLocaleString() }} buffered / {{ maxLogLines.toLocaleString() }} max
                </span>
                <label class="flex cursor-pointer items-center gap-1.5 select-none">
                  <input
                    v-model="autoScroll"
                    type="checkbox"
                    class="h-3.5 w-3.5 rounded border-gray-400 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
                  >
                  <span>Auto-scroll</span>
                </label>
              </div>

              <div
                v-if="isLiveMode && connectionStatus === 'connected'"
                class="flex items-center gap-1.5 text-green-500"
              >
                <span class="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span>Streaming</span>
              </div>
            </div>
          </template>
        </UCard>
      </template>
    </div>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>
.logs-wrapper {
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.log-scroller {
  :deep(.vue-recycle-scroller__item-wrapper) {
    overflow: visible;
  }
}
</style>
