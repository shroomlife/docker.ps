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
const isStreaming = ref<boolean>(false)
const eventSource = ref<EventSource | null>(null)
const logsContainer = ref<HTMLDivElement | null>(null)
const autoScroll = ref<boolean>(true)
const streamReader = ref<ReadableStreamDefaultReader<Uint8Array> | null>(null)

const cleanLogLine = (line: string): string => {
  // 1. Entferne Docker Stream Header (erste Bytes)
  // eslint-disable-next-line no-control-regex
  const cleaned = line.replace(/^[\u0000-\u0008]+/, '')

  // 2. Extrahiere Timestamp und Message
  const match = cleaned.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})\.\d+Z\s+(.*)/)

  if (!match) return ''

  const [, timestamp, message = ''] = match
  const formattedTimestamp = moment(timestamp).format('YYYY-MM-DD HH:mm:ss')

  // 3. Entferne ANSI Escape-Sequenzen
  // eslint-disable-next-line no-control-regex
  const cleanMessage = message.replace(/\u001b\[[0-9;]*[A-Za-z]/g, '').trim()

  if (!cleanMessage) return ''

  // 4. Formatiere Output
  return `${formattedTimestamp}: ${cleanMessage}`
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

const addLogLine = (line: string) => {
  const cleanedLine = cleanLogLine(line)
  if (!cleanedLine) {
    return
  }

  logs.value.push(cleanedLine)
  // Keep only the last maxLogLines
  if (logs.value.length > maxLogLines) {
    logs.value.shift()
  }
  // Auto-scroll to bottom
  scrollToBottom()
}

// Start streaming logs
const startLogsStream = async () => {
  if (isStreaming.value || !dockerStore.currentHost) {
    return
  }

  try {
    isLogsLoading.value = true
    isStreaming.value = true

    // First, get initial logs (last 1000 lines)
    const initialLogs = await $fetch<{ logs: string[] }>('/api/containers/logs', {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost.uuid,
        containerId: containerId.value,
        follow: false,
        tail: maxLogLines,
      } as DockerContainerLogsRequest,
    })

    // Clean initial logs
    console.log('initialLogs', initialLogs)
    logs.value = initialLogs.logs
      .map(line => cleanLogLine(line))
      .filter(line => line.length > 0)
      .slice(-maxLogLines)

    // Scroll to bottom after initial load
    await nextTick()
    scrollToBottom()

    // Then start streaming
    const runtimeConfig = useRuntimeConfig()
    const baseUrl = runtimeConfig.public.appUrl || window.location.origin

    // Use fetch with POST for SSE (since we need to send body)
    const response = await fetch(`${baseUrl}/api/containers/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostUuid: dockerStore.currentHost.uuid,
        containerId: containerId.value,
        follow: true,
        tail: maxLogLines,
      } as DockerContainerLogsRequest),
    })

    if (!response.ok) {
      throw new Error('Failed to start log stream')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('No reader available')
    }

    streamReader.value = reader

    // Buffer for incomplete SSE messages across chunk boundaries
    let messageBuffer = ''

    // Read stream
    const readStream = async () => {
      try {
        while (isStreaming.value) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush any remaining data in the decoder's internal buffer
            // by decoding an empty buffer with stream: false
            const remaining = decoder.decode(new Uint8Array(), { stream: false })
            if (remaining) {
              messageBuffer += remaining
            }
            // Process any remaining buffered data (even if it doesn't end with \n\n)
            if (messageBuffer.trim()) {
              // Split by \n\n, but also process the last part if it starts with 'data: '
              const messages = messageBuffer.split('\n\n')
              for (const message of messages) {
                if (message.trim() && message.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(message.slice(6))
                    if (data.line) {
                      addLogLine(data.line)
                    }
                    if (data.error) {
                      toast.add({
                        title: 'Log Stream Error',
                        description: data.error,
                        color: 'error',
                      })
                      stopLogsStream()
                    }
                  }
                  catch {
                    // Ignore parse errors
                  }
                }
              }
            }
            break
          }

          // Decode chunk and append to buffer
          const chunk = decoder.decode(value, { stream: true })
          messageBuffer += chunk

          // Process complete SSE messages (ending with \n\n)
          const messages = messageBuffer.split('\n\n')
          // Keep the last incomplete message in buffer
          messageBuffer = messages.pop() || ''

          // Process each complete message
          for (const message of messages) {
            if (message.trim() && message.startsWith('data: ')) {
              try {
                const data = JSON.parse(message.slice(6))
                if (data.line) {
                  addLogLine(data.line)
                }
                if (data.error) {
                  toast.add({
                    title: 'Log Stream Error',
                    description: data.error,
                    color: 'error',
                  })
                  stopLogsStream()
                }
              }
              catch {
                // Ignore parse errors
              }
            }
          }
        }
      }
      catch (error) {
        console.error('Error reading log stream:', error)
        toast.add({
          title: 'Log Stream Error',
          description: 'Failed to read log stream',
          color: 'error',
        })
        stopLogsStream()
      }
    }

    readStream()
  }
  catch (error) {
    console.error('Failed to start log stream:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to start log stream',
      color: 'error',
    })
    isStreaming.value = false
  }
  finally {
    isLogsLoading.value = false
  }
}

// Stop streaming logs (kept for cleanup on unmount)
const stopLogsStream = () => {
  isStreaming.value = false
  if (eventSource.value) {
    eventSource.value.close()
    eventSource.value = null
  }
  if (streamReader.value) {
    streamReader.value.cancel()
    streamReader.value = null
  }
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

    // Auto-start logs streaming after container info is loaded
    if (dockerStore.currentHost) {
      await startLogsStream()
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

// Cleanup on unmount
onUnmounted(() => {
  stopLogsStream()
})
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
          <span
            v-if="isStreaming"
            class="flex items-center gap-1"
          >
            <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Streaming...
          </span>
        </div>
      </template>
    </UCard>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>
