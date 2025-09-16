<script lang="ts" setup>
import type { PageCardProps } from '@nuxt/ui'

const dockerStore = useDockerStore()

definePageMeta({
  layout: 'app',
})

const computedHosts = computed(() => {
  return [
    ...dockerStore.availableHosts.map(host => ({
      title: host.name,
      description: `Manage your containers on ${host.name}.`,
      icon: 'tabler:stack-filled',
      class: 'cursor-pointer',
      highlight: dockerStore.currentHost?.uuid === host.uuid,
      onClick: async () => {
        await dockerStore.setCurrentHost(host.uuid)
        dockerStore.loadContainers()
        navigateTo('/containers')
      },
    } as PageCardProps),
    ),
    {
      title: 'Add Docker Host',
      variant: 'ghost',
      description: 'You can add a new Docker Host to manage your containers.',
      icon: 'tabler:square-rounded-plus',
      to: '/hosts/create',
    } as PageCardProps,
  ]
  // sort highlight always on top
    .sort((a, b) => (b.highlight ? 1 : 0) - (a.highlight ? 1 : 0))
})
</script>

<template>
  <AppDashboardPage
    title="Docker Hosts"
    description="Overview of your Docker Hosts"
  >
    <UPageGrid>
      <UPageCard
        v-for="(card, index) in computedHosts"
        :key="index"
        v-bind="card"
      />
    </UPageGrid>
  </AppDashboardPage>
</template>

<style lang="scss" scoped></style>
