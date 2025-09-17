<script lang="ts" setup>
import type { ContainerInspectInfo } from 'dockerode'

definePageMeta({
  layout: 'app',
})

const isLoading = ref<boolean>(true)
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

onMounted(async () => {
  try {
    isLoading.value = true
    const containerId = currentRoute.params.id as string
    container.value = await $fetch<ContainerInspectInfo>(`/api/containers`, {
      method: 'POST',
      body: {
        hostUuid: dockerStore.currentHost?.uuid,
        containerId,
      } as DockerContainerGetRequest,
    })
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
    <div class="w-full rounded-lg bg-gray-100 animate-pulse h-32" />
    <UCard>
      <div class="flex flex-col gap-3">
        <div class="w-full rounded-lg bg-gray-100 animate-pulse h-10" />
        <div class="w-full rounded-lg bg-gray-100 animate-pulse h-10" />
        <div class="w-full rounded-lg bg-gray-100 animate-pulse h-10" />
        <div class="w-full rounded-lg bg-gray-100 animate-pulse h-10" />
      </div>
    </UCard>
  </AppDashboardPage>
</template>

<style lang="scss" scoped>

</style>
