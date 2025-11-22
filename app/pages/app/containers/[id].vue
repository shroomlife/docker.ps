<script lang="ts" setup>
import type { ContainerInspectInfo } from 'dockerode'
import moment from 'moment'

definePageMeta({
  layout: 'app',
})

const isLoading = ref<boolean>(true)
const isLogsLoading = ref<boolean>(false)
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

// Logs state
const logs = ref<string[]>([])
const maxLogLines = 1000
const logsContainer = ref<HTMLDivElement | null>(null)
const autoScroll = ref<boolean>(true)

const cleanLogLine = (line: string): string => {
  if (!line || typeof line !== 'string') return ''

  // 1. Entferne Docker Stream Header (8 Bytes: [STREAM][RESERVED][SIZE])
  // Docker Log Format: [0x01/0x02][0x00][0x00][0x00][SIZE_HIGH][SIZE_MID][SIZE_LOW][SIZE_LOW]
  let cleaned = line
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\x01\x02][\x00]{3}[\x00-\xFF]{4}/, '')

  // Fallback: Entferne alle Control-Zeichen am Anfang (inkl. \x01, \x02)
  // eslint-disable-next-line no-control-regex
  cleaned = cleaned.replace(/^[\u0000-\u0008\u0001\u0002]+/, '')

  // 2. Extrahiere Timestamp und Message
  // Docker Logs mit timestamps haben Format: 2025-11-20T16:57:57.513967984Z MESSAGE
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(.*)/)

  if (!match) {
    // Wenn kein Timestamp gefunden, versuche die Zeile direkt zu verwenden
    // eslint-disable-next-line no-control-regex
    const directMessage = cleaned.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()
    return directMessage || ''
  }

  const [, timestamp, message = ''] = match
  const formattedTimestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss')

  // 3. Entferne ANSI Escape-Sequenzen
  // eslint-disable-next-line no-control-regex
  const cleanMessage = message.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()

  if (!cleanMessage) return ''

  // 4. Formatiere Output
  return `${formattedTimestamp}: ${cleanMessage}`
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

const scrollToBottom = () => {
  if (autoScroll.value && logsContainer.value) {
    // Use requestAnimationFrame for smoother scrolling
    requestAnimationFrame(() => {
      if (logsContainer.value) {
        logsContainer.value.scrollTop = logsContainer.value.scrollHeight
      }
    })
  }
}

const addLogLines = (newLogs: string[]) => {
  if (newLogs.length === 0) return

  const cleanedNewLogs: string[] = []
  let maxTs = lastLogTimestamp.value

  for (const line of newLogs) {
    const ts = extractTimestamp(line)
    if (ts && ts > maxTs) {
      maxTs = ts
    }
    const cleaned = cleanLogLine(line)
    if (cleaned) {
      cleanedNewLogs.push(cleaned)
    }
  }

  lastLogTimestamp.value = maxTs

  if (cleanedNewLogs.length === 0) return

  // Deduplication: Remove lines that appear in the last 100 lines of existing logs
  // This prevents duplicates when fetching overlapping logs
  const lookback = 100
  const tailLogs = new Set(logs.value.slice(-lookback))

  const logsToAdd = cleanedNewLogs.filter(line => !tailLogs.has(line))

  if (logsToAdd.length === 0) return

  logs.value.push(...logsToAdd)

  // Keep only the last maxLogLines
  if (logs.value.length > maxLogLines) {
    logs.value = logs.value.slice(-maxLogLines)
  }

  // Auto-scroll to bottom
  scrollToBottom()
}

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
  // Use the last timestamp (without adding 1s) to be safe against second-boundary issues
  // Deduplication logic in addLogLines will handle overlaps
  fetchLogs(lastLogTimestamp.value)
}

// Handle scroll to detect user scrolling up/down
const handleScroll = () => {
  if (!logsContainer.value) {
    return
  }
  const { scrollTop, scrollHeight, clientHeight } = logsContainer.value
  // Enable auto-scroll if user is near the bottom (within 20px for better UX)
  const isNearBottom = scrollTop + clientHeight >= scrollHeight - 20
  const wasAutoScrolling = autoScroll.value

  // Update auto-scroll state
  autoScroll.value = isNearBottom

  // If user scrolled back to bottom and we weren't auto-scrolling, scroll immediately
  if (isNearBottom && !wasAutoScrolling) {
    scrollToBottom()
  }
}

// Watch for new logs and auto-scroll (only when auto-scroll is enabled)
watch(() => logs.value.length, () => {
  if (autoScroll.value) {
    scrollToBottom()
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

  try {
    const response = await $fetch<string>('/api/containers/logs/download', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost.uuid,
        containerId: containerId.value,
      } as DockerContainerLogsRequest,
    })

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
    const filename = `logs-${timestamp}.log`

    // Create blob and download
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
  catch (error) {
    console.error('Failed to download logs:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to download logs',
      color: 'error',
    })
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
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            Container Logs
          </h3>
          <div class="flex gap-2">
            <UButton
              icon="i-tabler-refresh"
              color="neutral"
              variant="outline"
              size="sm"
              :loading="isLogsLoading"
              @click="refreshLogs"
            >
              Refresh Logs
            </UButton>
            <UButton
              icon="i-tabler-download"
              color="primary"
              variant="outline"
              size="sm"
              :loading="isLogsLoading"
              @click="downloadLogs"
            >
              Download Raw Logs
            </UButton>
          </div>
        </div>
      </template>
      <div
        ref="logsContainer"
        class="w-full bg-gray-900 dark:bg-gray-100 font-mono text-sm p-4 rounded-lg overflow-auto scroll-smooth"
        style="max-height: 600px; min-height: 400px;"
        @scroll="handleScroll"
      >
        <div
          v-if="logs.length === 0 && !isLogsLoading"
          class="text-gray-500 text-center py-8"
        >
          No logs available.
        </div>
        <div
          v-else-if="isLogsLoading && logs.length === 0"
          class="text-gray-500 text-center py-8"
        >
          Loading logs...
        </div>
        <div
          v-else
          class="space-y-0.5"
        >
          <div
            v-for="(log, index) in logs"
            :key="index"
            class="wrap-break-word text-white dark:text-black transition-colors"
          >
            {{ log }}
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between text-xs text-gray-500">
          <span>{{ logs.length }} / {{ maxLogLines }} lines</span>
        </div>
      </template>
    </UCard>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>
