<script lang="ts" setup>
import type { PageCardProps } from '@nuxt/ui'

const dockerStore = useDockerStore()

definePageMeta({
  layout: 'app',
})

const cards = ref([
  ...dockerStore.availableHosts.map(host => ({
    title: host.name,
    description: `Manage your containers on ${host.name}.`,
    icon: 'i-lucide-server',
    onClick: async () => {
      await dockerStore.setCurrentHost(host.uuid)
      navigateTo('/containers')
    },
  } as PageCardProps)),
  {
    title: 'Add Docker Host',
    variant: 'ghost',
    description: 'You can add a new Docker Host to manage your containers.',
    icon: 'tabler:square-rounded-plus',
    to: '/hosts/create',
  } as PageCardProps,
]) as Ref<PageCardProps[]>
</script>

<template>
  <AppDashboardPage title="Dashboard">
    <UPageGrid>
      <UPageCard
        v-for="(card, index) in cards"
        :key="index"
        v-bind="card"
      />
    </UPageGrid>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>
</style>
