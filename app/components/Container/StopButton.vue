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

const stopContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const stoppedContainer = await $fetch<DockerStoreContainer>('/api/containers/stop', {
      method: 'POST',
      body: { id } as DockerContainerStopRequest,
    })
    dockerStore.updateContainer(stoppedContainer)
  }
  catch (error) {
    console.error('Failed to stop container:', error)
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
    color="error"
    variant="soft"
    icon="tabler:player-stop-filled"
    :loading="isLoading"
    @click="stopContainer"
  />
</template>

<style lang="scss" scoped>

</style>
