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

const pauseContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const pausedContainer = await $fetch<DockerStoreContainer>('/api/containers/pause', {
      method: 'POST',
      body: { id } as DockerContainerPauseRequest,
    })
    dockerStore.updateContainer(pausedContainer)
  }
  catch (error) {
    console.error('Failed to pause container:', error)
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
    color="warning"
    variant="soft"
    icon="tabler:player-pause-filled"
    :loading="isLoading"
    @click="pauseContainer"
  />
</template>

<style lang="scss" scoped>

</style>
