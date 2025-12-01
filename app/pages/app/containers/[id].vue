<script lang="ts" setup>
import type { ContainerInspectInfo } from 'dockerode'
import moment from 'moment'

definePageMeta({
  layout: 'app',
})

const isLoading = ref<boolean>(true)
const isLogsLoading = ref<boolean>(false)
const isDownloading = ref<boolean>(false)
const toast = useToast()
const dockerStore = useDockerStore()

const currentRoute = useRoute()
if (!currentRoute.params.id) {
  toast.add({
    title: 'Error',
    description: 'No Container provided',
    color: 'error',
  })
  navigateTo('/app/containers')
}

const container = ref<ContainerInspectInfo | null>(null)
const containerId = computed(() => currentRoute.params.id as string)
const lastLogTimestamp = ref<number>(0)

const computedTitle = computed(() => {
  return container.value?.Name.slice(1) || 'Loading...'
})

const breadcrumbItems = computed(() => {
  return [
    {
      label: dockerStore.getCurrentHost?.name || '',
      icon: 'tabler:stack',
      to: '/app/containers',
    },
    {
      label: computedTitle.value,
      icon: 'tabler:stack-filled',
    },
  ]
})

// Log line interface for Virtual Scroller
interface ParsedLogLine {
  id: string
  timestamp: string
  message: string
  raw: string
}

// Logs state
const logs = ref<ParsedLogLine[]>([])
const maxLogLines = 2000
const autoScroll = ref<boolean>(true)

// SSE Live Streaming State
const isLiveMode = ref<boolean>(false)
const connectionStatus = ref<'disconnected' | 'connecting' | 'connected' | 'reconnecting'>('disconnected')
const eventSource = ref<EventSource | null>(null)
const reconnectAttempts = ref<number>(0)
const maxReconnectAttempts = 10
const reconnectTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

// Log batching for smooth UI updates (requestAnimationFrame based)
const pendingLogs = ref<ParsedLogLine[]>([])
let rafId: number | null = null

// Virtual Scroller ref
const scrollerRef = ref<{ scrollToBottom: () => void } | null>(null)

// Generate unique ID for log lines
let logIdCounter = 0
const generateLogId = (): string => {
  return `log-${Date.now()}-${logIdCounter++}`
}

const cleanLogLine = (line: string): ParsedLogLine | null => {
  if (!line || typeof line !== 'string') return null

  // 1. Remove Docker Stream Header (8 Bytes)
  let cleaned = line
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\x01\x02][\x00]{3}[\x00-\xFF]{4}/, '')
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\u0000-\u0008\u0001\u0002]+/, '')

  // 2. Extract Timestamp and Message
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(.*)/)

  if (!match) {
    // eslint-disable-next-line no-control-regex
    const directMessage = cleaned.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()
    if (!directMessage) return null
    return {
      id: generateLogId(),
      timestamp: '',
      message: directMessage,
      raw: line,
    }
  }

  const [, timestamp, message = ''] = match
  const formattedTimestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss')

  // 3. Remove ANSI Escape Sequences
  // eslint-disable-next-line no-control-regex
  const cleanMessage = message.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()

  if (!cleanMessage) return null

  return {
    id: generateLogId(),
    timestamp: formattedTimestamp,
    message: cleanMessage,
    raw: line,
  }
}

const extractTimestamp = (line: string): number | null => {
  if (!line || typeof line !== 'string') return null

  let cleaned = line
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\x01\x02][\x00]{3}[\x00-\xFF]{4}/, '')
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\u0000-\u0008\u0001\u0002]+/, '')

  const match = cleaned.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z/)
  if (match && match[1]) {
    return moment(match[1]).unix()
  }
  return null
}

// Batched log update using requestAnimationFrame for smooth UI
const flushPendingLogs = () => {
  if (pendingLogs.value.length === 0) {
    rafId = null
    return
  }

  const logsToAdd = [...pendingLogs.value]
  pendingLogs.value = []

  // Deduplication based on raw content
  const existingRaws = new Set(logs.value.slice(-200).map(l => l.raw))
  const newLogs = logsToAdd.filter(l => !existingRaws.has(l.raw))

  if (newLogs.length > 0) {
    logs.value.push(...newLogs)

    // Keep only the last maxLogLines
    if (logs.value.length > maxLogLines) {
      logs.value = logs.value.slice(-maxLogLines)
    }

    // Auto-scroll to bottom
    if (autoScroll.value) {
      nextTick(() => {
        scrollerRef.value?.scrollToBottom()
      })
    }
  }

  rafId = null
}

const scheduleLogFlush = () => {
  if (rafId === null) {
    rafId = requestAnimationFrame(flushPendingLogs)
  }
}

const addLogLine = (logLine: ParsedLogLine) => {
  pendingLogs.value.push(logLine)
  scheduleLogFlush()
}

const addLogLines = (newLogs: string[]) => {
  if (newLogs.length === 0) return

  let maxTs = lastLogTimestamp.value

  for (const line of newLogs) {
    const ts = extractTimestamp(line)
    if (ts && ts > maxTs) {
      maxTs = ts
    }
    const parsed = cleanLogLine(line)
    if (parsed) {
      pendingLogs.value.push(parsed)
    }
  }

  lastLogTimestamp.value = maxTs
  scheduleLogFlush()
}

// Exponential Backoff for reconnection
const getReconnectDelay = (): number => {
  const baseDelay = 1000
  const maxDelay = 30000
  const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts.value), maxDelay)
  return delay
}

// SSE Connection Management
const connectSSE = () => {
  if (!dockerStore.currentHost || eventSource.value) return

  connectionStatus.value = reconnectAttempts.value > 0 ? 'reconnecting' : 'connecting'

  const url = new URL('/api/containers/logs/stream', window.location.origin)
  url.searchParams.set('hostUuid', dockerStore.currentHost.uuid)
  url.searchParams.set('containerId', containerId.value)
  url.searchParams.set('tail', '100')

  const es = new EventSource(url.toString())
  eventSource.value = es

  es.addEventListener('connected', () => {
    connectionStatus.value = 'connected'
    reconnectAttempts.value = 0
    toast.add({
      title: 'Connected',
      description: 'Live log stream connected',
      color: 'success',
    })
  })

  es.addEventListener('log', (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.log) {
        const parsed = cleanLogLine(data.log)
        if (parsed) {
          addLogLine(parsed)
        }
      }
    }
    catch {
      // Ignore parse errors
    }
  })

  es.addEventListener('close', () => {
    disconnectSSE()
  })

  es.addEventListener('error', () => {
    disconnectSSE()
    if (isLiveMode.value && reconnectAttempts.value < maxReconnectAttempts) {
      const delay = getReconnectDelay()
      reconnectAttempts.value++
      connectionStatus.value = 'reconnecting'
      reconnectTimeoutId.value = setTimeout(() => {
        if (isLiveMode.value) {
          connectSSE()
        }
      }, delay)
    }
    else if (reconnectAttempts.value >= maxReconnectAttempts) {
      isLiveMode.value = false
      toast.add({
        title: 'Disconnected',
        description: 'Max reconnection attempts reached. Click Live to retry.',
        color: 'warning',
      })
    }
  })

  es.onerror = () => {
    if (es.readyState === EventSource.CLOSED) {
      disconnectSSE()
    }
  }
}

const disconnectSSE = () => {
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
  if (reconnectTimeoutId.value) {
    clearTimeout(reconnectTimeoutId.value)
    reconnectTimeoutId.value = null
  }
  connectionStatus.value = 'disconnected'
}

const toggleLiveMode = () => {
  isLiveMode.value = !isLiveMode.value
  if (isLiveMode.value) {
    reconnectAttempts.value = 0
    connectSSE()
  }
  else {
    disconnectSSE()
  }
}

// Connection status UI helpers
const connectionStatusConfig = computed(() => {
  switch (connectionStatus.value) {
    case 'connected':
      return { color: 'success' as const, icon: 'i-tabler-circle-filled', text: 'Live', pulse: true }
    case 'connecting':
      return { color: 'warning' as const, icon: 'i-tabler-loader-2', text: 'Connecting...', pulse: false }
    case 'reconnecting':
      return { color: 'warning' as const, icon: 'i-tabler-loader-2', text: `Reconnecting (${reconnectAttempts.value}/${maxReconnectAttempts})...`, pulse: false }
    default:
      return { color: 'neutral' as const, icon: 'i-tabler-circle', text: 'Disconnected', pulse: false }
  }
})

const fetchLogs = async (sinceTimestamp: number = 0) => {
  if (isLogsLoading.value || !dockerStore.currentHost) return

  try {
    isLogsLoading.value = true

    const response = await $fetch<{ logs: string[] }>('/api/containers/logs', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost.uuid,
        containerId: containerId.value,
        follow: false,
        tail: maxLogLines,
        since: sinceTimestamp,
      } as DockerContainerLogsRequest,
    })

    // If we fetched with since=0 (initial load), we replace logs
    if (sinceTimestamp === 0) {
      logs.value = []
      lastLogTimestamp.value = 0
    }

    addLogLines(response.logs)
  }
  catch (error) {
    console.error('Failed to fetch logs:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch logs',
      color: 'error',
    })
  }
  finally {
    isLogsLoading.value = false
  }
}

const refreshLogs = () => {
  fetchLogs(lastLogTimestamp.value)
}

// Cleanup on unmount
onUnmounted(() => {
  disconnectSSE()
  if (rafId !== null) {
    cancelAnimationFrame(rafId)
  }
})

onMounted(async () => {
  try {
    isLoading.value = true
    container.value = await $fetch<ContainerInspectInfo>(`/api/containers`, {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost?.uuid,
        containerId: containerId.value,
      } as DockerContainerGetRequest,
    })

    if (dockerStore.currentHost) {
      await fetchLogs()
    }
  }
  catch (error) {
    console.error('Failed to fetch Container Details', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch Container Details',
      color: 'error',
    })
    navigateTo('/app/containers')
  }
  finally {
    isLoading.value = false
  }
})

// Download logs function
const downloadLogs = async () => {
  if (!dockerStore.currentHost) {
    toast.add({
      title: 'Error',
      description: 'No Docker host selected',
      color: 'error',
    })
    return
  }

  if (isDownloading.value) {
    return
  }

  try {
    isDownloading.value = true

    const response = await $fetch<string>('/api/containers/logs/download', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost.uuid,
        containerId: containerId.value,
      } as DockerContainerLogsRequest,
      timeout: 300000,
    })

    if (!response || response.length === 0) {
      toast.add({
        title: 'Info',
        description: 'No logs available for download',
        color: 'info',
      })
      return
    }

    const timestamp = moment().format('YYYY-MM-DDTHH-mm-ss')
    const filename = `logs-${timestamp}.log`

    const blob = new Blob([response], { type: 'text/plain' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

    toast.add({
      title: 'Success',
      description: 'Logs downloaded successfully',
      color: 'success',
    })
  }
  catch (error: unknown) {
    console.error('Failed to download logs:', error)

    let errorMessage = 'Failed to download logs'
    if (error && typeof error === 'object') {
      if ('statusMessage' in error && typeof error.statusMessage === 'string') {
        errorMessage = error.statusMessage
      }
      else if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message
      }
    }
    else if (typeof error === 'string') {
      errorMessage = error
    }

    toast.add({
      title: 'Error',
      description: errorMessage,
      color: 'error',
    })
  }
  finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <AppDashboardPage
    :title="computedTitle"
    :headline="dockerStore.getCurrentHost?.name"
  >
    <template #header>
      <UDashboardNavbar>
        <template #left>
          <UBreadcrumb :items="breadcrumbItems" />
        </template>
      </UDashboardNavbar>
    </template>

    <!-- Container Info Card -->
    <UCard v-if="container">
      <template #header>
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Container Information
          </h3>
        </div>
      </template>
      <div class="flex flex-col gap-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Image
            </p>
            <p class="font-mono text-sm">
              {{ container.Config?.Image }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Created
            </p>
            <p class="text-sm">
              {{ new Date(container.Created).toLocaleString() }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Container ID
            </p>
            <p class="font-mono text-xs">
              {{ container.Id.substring(0, 12) }}
            </p>
          </div>
          <div>
            <p class="text-sm text-gray-500 mb-1">
              Status
            </p>
            <p class="text-sm">
              {{ container.State?.Status }}
            </p>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Logs Card -->
    <UCard>
      <template #header>
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold">
              Container Logs
            </h3>
            <!-- Connection Status Badge -->
            <UBadge
              :color="connectionStatusConfig.color"
              variant="subtle"
              size="sm"
              class="transition-all"
              :class="{ 'animate-pulse-live': connectionStatusConfig.pulse }"
            >
              <UIcon
                :name="connectionStatusConfig.icon"
                class="w-3 h-3 mr-1"
                :class="{ 'animate-spin': connectionStatus === 'connecting' || connectionStatus === 'reconnecting' }"
              />
              {{ connectionStatusConfig.text }}
            </UBadge>
          </div>
          <div class="flex flex-wrap gap-2">
            <!-- Live Mode Toggle -->
            <UButton
              :icon="isLiveMode ? 'i-tabler-player-pause' : 'i-tabler-broadcast'"
              :color="isLiveMode ? 'warning' : 'success'"
              variant="soft"
              size="sm"
              @click="toggleLiveMode"
            >
              {{ isLiveMode ? 'Pause' : 'Live' }}
            </UButton>
            <!-- Refresh Button (only when not live) -->
            <UButton
              v-if="!isLiveMode"
              icon="i-tabler-refresh"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="isLogsLoading"
              @click="refreshLogs"
            >
              Refresh
            </UButton>
            <!-- Download Button -->
            <UButton
              icon="i-tabler-download"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="isDownloading"
              :disabled="isDownloading"
              @click="downloadLogs"
            >
              Download
            </UButton>
          </div>
        </div>
      </template>

      <!-- Logs Container with Virtual Scroller -->
      <div class="logs-wrapper bg-gray-900 dark:bg-gray-50 rounded-lg overflow-hidden">
        <!-- Empty State -->
        <div
          v-if="logs.length === 0 && !isLogsLoading"
          class="flex flex-col items-center justify-center py-16 text-gray-400"
        >
          <UIcon
            name="i-tabler-file-text"
            class="w-12 h-12 mb-3 opacity-50"
          />
          <p class="text-sm">
            No logs available
          </p>
          <p class="text-xs mt-1 opacity-75">
            Start the container or click Live to stream logs
          </p>
        </div>

        <!-- Loading State -->
        <div
          v-else-if="isLogsLoading && logs.length === 0"
          class="flex flex-col items-center justify-center py-16 text-gray-400"
        >
          <UIcon
            name="i-tabler-loader-2"
            class="w-8 h-8 mb-3 animate-spin"
          />
          <p class="text-sm">
            Loading logs...
          </p>
        </div>

        <!-- Virtual Scroller for Logs -->
        <DynamicScroller
          v-else
          ref="scrollerRef"
          :items="logs"
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
                :timestamp="item.timestamp"
                :message="item.message"
                :index="index"
              />
            </DynamicScrollerItem>
          </template>
        </DynamicScroller>
      </div>

      <template #footer>
        <div class="flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center gap-4">
            <span>{{ logs.length.toLocaleString() }} / {{ maxLogLines.toLocaleString() }} lines</span>
            <label class="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                v-model="autoScroll"
                type="checkbox"
                class="w-3.5 h-3.5 rounded border-gray-400 text-primary-500 focus:ring-primary-500 focus:ring-offset-0"
              >
              <span>Auto-scroll</span>
            </label>
          </div>
          <div
            v-if="isLiveMode && connectionStatus === 'connected'"
            class="flex items-center gap-1.5 text-green-500"
          >
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>Streaming</span>
          </div>
        </div>
      </template>
    </UCard>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>
.logs-wrapper {
  border: 1px solid rgba(255, 255, 255, 0.1);

  :root.dark & {
    border-color: rgba(0, 0, 0, 0.1);
  }
}

.log-scroller {
  :deep(.vue-recycle-scroller__item-wrapper) {
    overflow: visible;
  }
}
</style>
