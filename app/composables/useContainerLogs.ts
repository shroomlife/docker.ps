import type { BadgeProps } from '@nuxt/ui'

import type {
  DockerContainerLogEntry,
  DockerContainerLogsResponse,
  DockerContainerLogsRequest,
} from '~~/shared/types/docker'
import {
  appendDockerLogEntries,
  mergeDockerLogEntries,
} from '~~/shared/utils/dockerLogs'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting'

interface UseContainerLogsOptions {
  hostUuid: MaybeRefOrGetter<string | null | undefined>
  containerId: MaybeRefOrGetter<string | null | undefined>
  maxLogLines?: number
}

export const useContainerLogs = (options: UseContainerLogsOptions) => {
  const toast = useToast()

  const maxLogLines = options.maxLogLines ?? 2000
  const hostUuid = computed(() => toValue(options.hostUuid) ?? '')
  const containerId = computed(() => toValue(options.containerId) ?? '')

  const logs = ref<DockerContainerLogEntry[]>([])
  const pendingLiveLogs = ref<DockerContainerLogEntry[]>([])
  const searchValue = ref('')
  const autoScroll = ref(true)
  const wrapLines = ref(true)
  const isLogsLoading = ref(false)
  const isDownloading = ref(false)
  const isLiveMode = ref(false)
  const connectionStatus = ref<ConnectionStatus>('disconnected')
  const reconnectAttempts = ref(0)
  const eventSource = ref<EventSource | null>(null)
  const reconnectTimeoutId = ref<ReturnType<typeof setTimeout> | null>(null)

  let rafId: number | null = null
  const maxReconnectAttempts = 10

  const visibleLogs = computed(() => {
    const query = searchValue.value.trim().toLowerCase()
    if (!query) {
      return logs.value
    }

    return logs.value.filter(logEntry => (
      `${logEntry.timestampLabel} ${logEntry.message} ${logEntry.raw}`
        .toLowerCase()
        .includes(query)
    ))
  })

  const connectionStatusConfig = computed(() => {
    switch (connectionStatus.value) {
      case 'connected':
        return { color: 'success' as BadgeProps['color'], icon: 'i-tabler-circle-filled', text: 'Live', pulse: true }
      case 'connecting':
        return { color: 'warning' as BadgeProps['color'], icon: 'i-tabler-loader-2', text: 'Connecting...', pulse: false }
      case 'reconnecting':
        return {
          color: 'warning' as BadgeProps['color'],
          icon: 'i-tabler-loader-2',
          text: `Reconnecting (${reconnectAttempts.value}/${maxReconnectAttempts})...`,
          pulse: false,
        }
      default:
        return { color: 'neutral' as BadgeProps['color'], icon: 'i-tabler-circle', text: 'Disconnected', pulse: false }
    }
  })

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutId.value) {
      clearTimeout(reconnectTimeoutId.value)
      reconnectTimeoutId.value = null
    }
  }

  const flushPendingLiveLogs = () => {
    if (pendingLiveLogs.value.length === 0) {
      rafId = null
      return
    }

    logs.value = appendDockerLogEntries(logs.value, pendingLiveLogs.value, maxLogLines)
    pendingLiveLogs.value = []
    rafId = null
  }

  const schedulePendingLogFlush = () => {
    if (rafId !== null) {
      return
    }

    rafId = requestAnimationFrame(flushPendingLiveLogs)
  }

  const queueLiveLogs = (incomingLogs: DockerContainerLogEntry[]) => {
    if (incomingLogs.length === 0) {
      return
    }

    pendingLiveLogs.value.push(...incomingLogs)
    schedulePendingLogFlush()
  }

  const applyFetchedLogs = (incomingLogs: DockerContainerLogEntry[], mode: 'replace' | 'merge') => {
    if (mode === 'replace') {
      logs.value = incomingLogs.slice(-maxLogLines)
      return
    }

    logs.value = mergeDockerLogEntries(logs.value, incomingLogs, maxLogLines)
  }

  const fetchLogs = async (mode: 'replace' | 'merge') => {
    if (isLogsLoading.value || !hostUuid.value || !containerId.value) {
      return
    }

    try {
      isLogsLoading.value = true
      const response = await $fetch<DockerContainerLogsResponse>('/api/containers/logs', {
        method: 'POST',
        body: {
          hostUuid: hostUuid.value,
          containerId: containerId.value,
          tail: maxLogLines,
        } as DockerContainerLogsRequest,
      })

      applyFetchedLogs(response.logs, mode)
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

  const loadInitialLogs = async () => {
    await fetchLogs('replace')
  }

  const refreshLogs = async () => {
    await fetchLogs('merge')
  }

  const cleanupEventSource = () => {
    if (eventSource.value) {
      eventSource.value.close()
      eventSource.value = null
    }
  }

  const stopLiveMode = () => {
    isLiveMode.value = false
    cleanupEventSource()
    clearReconnectTimeout()
    connectionStatus.value = 'disconnected'
  }

  const scheduleReconnect = () => {
    if (!isLiveMode.value) {
      connectionStatus.value = 'disconnected'
      return
    }

    if (reconnectTimeoutId.value) {
      return
    }

    if (reconnectAttempts.value >= maxReconnectAttempts) {
      stopLiveMode()
      toast.add({
        title: 'Disconnected',
        description: 'Live stream stopped after repeated reconnect failures.',
        color: 'warning',
      })
      return
    }

    reconnectAttempts.value++
    connectionStatus.value = 'reconnecting'
    reconnectTimeoutId.value = setTimeout(() => {
      reconnectTimeoutId.value = null
      if (isLiveMode.value) {
        connectSSE()
      }
    }, getReconnectDelay())
  }

  const getReconnectDelay = () => {
    const baseDelay = 1000
    const maxDelay = 30000
    return Math.min(baseDelay * Math.pow(2, reconnectAttempts.value), maxDelay)
  }

  const connectSSE = () => {
    if (!hostUuid.value || !containerId.value || eventSource.value) {
      return
    }

    connectionStatus.value = reconnectAttempts.value > 0 ? 'reconnecting' : 'connecting'

    const url = new URL('/api/containers/logs/stream', window.location.origin)
    url.searchParams.set('hostUuid', hostUuid.value)
    url.searchParams.set('containerId', containerId.value)
    url.searchParams.set('tail', '100')

    const source = new EventSource(url.toString())
    eventSource.value = source

    source.addEventListener('connected', () => {
      const shouldBackfill = reconnectAttempts.value > 0
      connectionStatus.value = 'connected'
      reconnectAttempts.value = 0

      if (shouldBackfill) {
        void refreshLogs()
      }
    })

    source.addEventListener('log', (event) => {
      try {
        const logEntry = JSON.parse(event.data) as DockerContainerLogEntry
        if (logEntry?.id && logEntry?.message) {
          queueLiveLogs([logEntry])
        }
      }
      catch (error) {
        console.error('Failed to parse log event:', error)
      }
    })

    source.addEventListener('close', () => {
      cleanupEventSource()
      scheduleReconnect()
    })

    source.addEventListener('error', () => {
      cleanupEventSource()
      scheduleReconnect()
    })
  }

  const toggleLiveMode = async () => {
    if (isLiveMode.value) {
      stopLiveMode()
      return
    }

    if (!hostUuid.value || !containerId.value) {
      toast.add({
        title: 'Error',
        description: 'No Docker host selected',
        color: 'error',
      })
      return
    }

    reconnectAttempts.value = 0
    isLiveMode.value = true
    connectSSE()
  }

  const clearLogs = () => {
    logs.value = []
    pendingLiveLogs.value = []
  }

  const resetLogs = () => {
    stopLiveMode()
    clearLogs()
    searchValue.value = ''
  }

  const downloadLogs = async () => {
    if (!hostUuid.value || !containerId.value) {
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
          hostUuid: hostUuid.value,
          containerId: containerId.value,
        } as DockerContainerLogsRequest,
        timeout: 300000,
      })

      if (!response) {
        toast.add({
          title: 'Info',
          description: 'No logs available for download',
          color: 'info',
        })
        return
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `logs-${timestamp}.log`
      const blob = new Blob([response], { type: 'text/plain' })
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(objectUrl)
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

  onUnmounted(() => {
    stopLiveMode()
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
    }
  })

  return {
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
  }
}
