<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

const dockerStore = useDockerStore()

const selectableHosts: ComputedRef<DropdownMenuItem[][]> = computed(() => {
  return [[
    ...dockerStore.availableHosts.map(host => ({
      label: host.name,
      icon: 'i-lucide-server',
      onSelect: async () => {
        await dockerStore.setCurrentHost(host.uuid)
        navigateTo('/containers')
      },
    }))], [
    {
      label: 'Add Docker Host',
      icon: 'tabler:square-rounded-plus',
      to: '/hosts/create',
    }],
  ] as DropdownMenuItem[][]
})

const computedLabel = computed(() => {
  if (dockerStore.getCurrentHost) {
    return dockerStore.getCurrentHost.name
  }
  return 'Select Docker Host'
})

// const items = computed<DropdownMenuItem[][]>(() => {
//   return [teams.value.map(team => ({
//     ...team,
//     onSelect() {
//       selectedTeam.value = team
//     },
//   })), [{
//     label: 'Create team',
//     icon: 'i-lucide-circle-plus',
//   }, {
//     label: 'Manage teams',
//     icon: 'i-lucide-cog',
//   }]]
// })
</script>

<template>
  <UDropdownMenu
    :items="selectableHosts"
    :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: 'w-(--reka-dropdown-menu-trigger-width)' }"
  >
    <UButton
      color="neutral"
      :label="computedLabel"
      variant="ghost"
      trailing-icon="i-lucide-chevrons-up-down"
      block
      class="data-[state=open]:bg-elevated"
      :ui="{
        trailingIcon: 'text-dimmed',
      }"
    />
  </UDropdownMenu>
</template>
