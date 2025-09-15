<script lang="ts" setup>
import type { ContainerInspectInfo } from 'dockerode'

definePageMeta({
  layout: 'app',
})

const isLoading = ref<boolean>(true)
const toast = useToast()

const currentRoute = useRoute()
if (!currentRoute.params.id) {
  toast.add({
    title: 'Error',
    description: 'No Container provided',
    color: 'error',
  })
  navigateTo('/containers')
}

const container = ref<ContainerInspectInfo | null>(null)
const computedTitle = computed(() => {
  return container.value?.Name.slice(1) || ''
})

onMounted(async () => {
  try {
    isLoading.value = true
    const containerId = currentRoute.params.id as string
    container.value = await $fetch<ContainerInspectInfo>(`/api/containers/${containerId}`)
  }
  catch (error) {
    console.error('Failed to fetch container details:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to fetch container details',
      color: 'error',
    })
    navigateTo('/containers')
  }
  finally {
    isLoading.value = false
  }
})
</script>

<template>
  <AppDashboardPage
    :title="computedTitle"
    headline="Container"
  >
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
