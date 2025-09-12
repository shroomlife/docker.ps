<script lang="ts" setup>
const dockerStore = useDockerStore()
const { id } = defineProps({
  id: {
    type: String as PropType<string>,
    required: true,
  },
})

const isLoading = computed(() => {
  return dockerStore.getBlockedContainerIds.includes(id)
})

const restartContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const restartedContainer = await $fetch<DockerStoreContainer>('/api/containers/restart', {
      method: 'POST',
      body: { id } as DockerContainerRestartRequest,
    })
    dockerStore.updateContainer(restartedContainer)
  }
  catch (error) {
    console.error('Failed to restart container:', error)
  }
  finally {
    dockerStore.removeBlockedContainer(id)
  }
}
</script>

<template>
  <UButton
    square
    size="lg"
    color="info"
    variant="soft"
    icon="tabler:refresh"
    :loading="isLoading"
    @click="restartContainer"
  />
</template>

<style lang="scss" scoped>

</style>
