<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const dockerStore = useDockerStore()

const selectableHosts: ComputedRef<DropdownMenuItem[][]> = computed(() => {
  return [[
    ...dockerStore.availableHosts.map(host => ({
      label: host.name,
      description: host.url,
      icon: 'tabler:stack-filled',
      onSelect: async () => {
        await dockerStore.setCurrentHost(host.uuid)
        navigateTo('/app/containers')
      },
      active: dockerStore.getCurrentHost?.uuid === host.uuid,
    }))], [
    {
      label: 'Add Docker Host',
      icon: 'tabler:square-rounded-plus',
      to: '/app/hosts/create',
    }],
  ] as DropdownMenuItem[][]
})

const computedLabel = computed(() => {
  if (dockerStore.getCurrentHost) {
    return dockerStore.getCurrentHost.name
  }
  return 'Select Docker Host'
})
</script>

<template>
  <UDropdownMenu
    :items="selectableHosts"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)', item: 'text-base gap-3' }"
  >
    <template #item-description="{ item }">
      <div class="flex flex-col items-start">
        <div class="text-dimmed text-xs truncate">
          {{ item.description }}
        </div>
      </div>
    </template>

    <UButton
      color="neutral"
      :label="computedLabel"
      variant="subtle"
      trailing-icon="i-lucide-chevrons-up-down"
      :avatar="{
        icon: 'tabler:stack-filled',
        size: 'lg',
      }"
      block
      class="data-[state=open]:bg-elevated h-16"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    >
      <template v-if="dockerStore.getCurrentHost">
        <div class="flex flex-col items-start">
          <div class="truncate font-semibold text-primary text-base max-w-44 md:max-w-40">
            {{ dockerStore.getCurrentHost.name }}
          </div>
          <div class="text-xs truncate text-dimmed max-w-44 md:max-w-40">
            {{ dockerStore.getCurrentHost.url }}
          </div>
        </div>
      </template>
      <template v-else>
        <span class="text-dimmed">Select Docker Host</span>
      </template>
    </UButton>
  </UDropdownMenu>
</template>
