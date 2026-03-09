<script lang="ts" setup>
import type { DockerContainerMetadataEntry } from '~~/shared/types/docker'

interface MetadataPanelProps {
  title: string
  entries: DockerContainerMetadataEntry[]
  emptyText?: string
}

const { title, entries, emptyText = 'No entries available' } = defineProps<MetadataPanelProps>()

const toast = useToast()

const copyValue = async (key: string, value: string) => {
  try {
    await navigator.clipboard.writeText(value)
    toast.add({
      title: 'Copied',
      description: `${key} copied to clipboard`,
      color: 'success',
    })
  }
  catch (error) {
    console.error(`Failed to copy ${key}:`, error)
    toast.add({
      title: 'Error',
      description: `Failed to copy ${key}`,
      color: 'error',
    })
  }
}
</script>

<template>
  <details class="metadata-panel rounded-lg border border-default bg-default/40">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="font-medium">{{ title }}</span>
        <UBadge
          color="neutral"
          variant="soft"
          size="sm"
        >
          {{ entries.length }}
        </UBadge>
      </div>
      <UIcon
        name="i-tabler-chevron-down"
        class="metadata-panel__icon h-4 w-4 text-dimmed transition-transform"
      />
    </summary>

    <div class="border-t border-default px-4 py-4">
      <div
        v-if="entries.length === 0"
        class="rounded-lg border border-dashed border-default px-4 py-6 text-sm text-dimmed"
      >
        {{ emptyText }}
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="entry in entries"
          :key="entry.key"
          class="flex items-start justify-between gap-3 rounded-lg border border-default bg-default/60 px-3 py-3"
        >
          <div class="min-w-0">
            <div class="text-xs font-medium uppercase tracking-wide text-dimmed">
              {{ entry.key }}
            </div>
            <div class="mt-1 break-all font-mono text-xs text-highlighted">
              {{ entry.value || '(empty)' }}
            </div>
          </div>

          <UButton
            icon="i-tabler-copy"
            size="xs"
            color="neutral"
            variant="ghost"
            @click.prevent="copyValue(entry.key, entry.value)"
          />
        </div>
      </div>
    </div>
  </details>
</template>

<style lang="scss" scoped>
.metadata-panel[open] {
  .metadata-panel__icon {
    transform: rotate(180deg);
  }
}
</style>
