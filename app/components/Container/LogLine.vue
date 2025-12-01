<script lang="ts" setup>
export interface LogLineProps {
  timestamp: string
  message: string
  index: number
}

defineProps<LogLineProps>()
</script>

<template>
  <div
    class="log-line flex gap-3 select-text"
    :class="{ 'bg-white/2 dark:bg-black/2': index % 2 === 0 }"
  >
    <span class="timestamp shrink-0 text-gray-500 dark:text-gray-400 tabular-nums">
      {{ timestamp }}
    </span>
    <span class="message text-gray-100 dark:text-gray-800 break-all whitespace-pre-wrap">
      {{ message }}
    </span>
  </div>
</template>

<style lang="scss" scoped>
.log-line {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  padding: 0.1875rem 0.75rem;
  transition: background-color 0.15s ease;

  &:hover {
    background-color: rgba(255, 255, 255, 0.06) !important;

    :root.dark & {
      background-color: rgba(0, 0, 0, 0.06) !important;
    }
  }
}

.timestamp {
  min-width: 140px;
}
</style>
