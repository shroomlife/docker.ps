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

const startContainer = async () => {
  dockerStore.addBlockedContainer(id)
  try {
    const unpausedContainer = await $fetch<DockerStoreContainer>('/api/containers/unpause', {
      method: 'POST',
      body: { id } as DockerContainerUnpauseRequest,
    })
    dockerStore.updateContainer(unpausedContainer)
  }
  catch (error) {
    console.error('Failed to unpause container:', error)
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
    icon="tabler:player-play-filled"
    :loading="isLoading"
    @click="startContainer"
  />
</template>

<style lang="scss" scoped>

</style>
