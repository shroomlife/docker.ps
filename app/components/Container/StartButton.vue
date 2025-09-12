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
    const startedContainer = await $fetch<DockerStoreContainer>('/api/containers/start', {
      method: 'POST',
      body: { id } as DockerContainerStartRequest,
    })
    dockerStore.updateContainer(startedContainer)
  }
  catch (error) {
    console.error('Failed to start container:', error)
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
